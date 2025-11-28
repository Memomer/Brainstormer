from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # Import CORS
from sqlmodel import Session, select
from .db import init_db, engine, get_session
from .models import User, Project, ChatSession, Message
from .crud import create_project, create_chat, add_message, get_chat, get_messages_for_chat, get_projects
from .agents import run_agent_sequence
import uvicorn

app = FastAPI(title="Multi-Agent Debate Engine")

# --- CORS CONFIGURATION (NEW) ---
# This allows requests from your React app (usually running on port 5173 or 3000)
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "*"  # Allow all for development convenience
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -------------------------------

@app.on_event("startup")
def on_startup():
    init_db()

@app.get('/')
def root():
    return {"message": "AI Brainstorming Engine"}

# --------------------
# CREATE PROJECT
# --------------------
@app.post("/projects", response_model=dict)
def api_create_project(data: dict, session: Session = Depends(get_session)):
    # Ensure data is valid before creating object
    p = Project(**data)
    p = create_project(session, p)
    return {"project_id": p.project_id, "name": p.name}

# --------------------
# GET ALL PROJECTS
# --------------------
@app.get("/projects")
def api_get_projects(session: Session = Depends(get_session)):
    projects = get_projects(session)
    return [{"project_id": p.project_id, "name": p.name} for p in projects]

# --------------------
# GET CHATS FOR PROJECT
# --------------------
@app.get("/projects/{project_id}/chats")
def api_get_chats(project_id: int, session: Session = Depends(get_session)):
    chats = session.exec(select(ChatSession).where(ChatSession.project_id == project_id)).all()
    return [{"chat_id": c.chat_id, "title": c.title, "idea": c.idea} for c in chats]

# --------------------
# START NEW CHAT SESSION
# --------------------
@app.post("/chats/start")
def api_start_chat(data: dict, session: Session = Depends(get_session)):
    chat = ChatSession(project_id=data["project_id"], idea=data["idea"], title=data.get("title"))
    chat = create_chat(session, chat)

    run_agent_sequence(session, chat, data["idea"], data.get("user_id"))

    return {
        "chat_id": chat.chat_id,
        "messages": [
            {"role": m.agent_role.value, "content": m.content}
            for m in get_messages_for_chat(session, chat.chat_id)
        ]
    }

# --------------------
# CONTINUE CHAT (SEND MESSAGE)
# --------------------
@app.post("/chats/{chat_id}/message")
def api_send_message(chat_id: int, data: dict, session: Session = Depends(get_session)):
    chat = get_chat(session, chat_id)
    if not chat:
        raise HTTPException(404, "Chat session not found")

    # save user message
    user_msg = Message(
        chat_session_id=chat_id,
        agent_role="user",
        content=data["content"]
    )
    add_message(session, user_msg)

    # multi-agent processing
    run_agent_sequence(session, chat, data["content"], data.get("user_id"))

    return {
        "chat_id": chat_id,
        "messages": [
            {"role": m.agent_role.value, "content": m.content}
            for m in get_messages_for_chat(session, chat_id)
        ]
    }

# --------------------
# GET MESSAGE HISTORY
# --------------------
@app.get("/chats/{chat_id}/messages")
def api_get_chat_messages(chat_id: int, session: Session = Depends(get_session)):
    msgs = get_messages_for_chat(session, chat_id)
    return [
        {
            "id": m.message_id,
            "role": m.agent_role.value,
            "content": m.content,
            "sequence": m.sequence,
            "timestamp": m.created_at
        }
        for m in msgs
    ]

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)