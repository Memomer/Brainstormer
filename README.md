# Brainstormer (AI Debate Engine)

Multi-agent brainstorming stack combining a FastAPI backend and a Vite/React frontend.  
Projects and chat sessions are stored in SQLite via SQLModel, while multi-role AI agents
(Optimist, Pessimist, Planner, Critic, Developer, Mentor) generate debate flows using the
OpenAI API.

## Repository Layout

| Path | Description |
| --- | --- |
| `backend/` | FastAPI app, SQLModel ORM models, OpenAI agent pipeline. |
| `debate-frontend/` | Vite + React + Tailwind dashboard for projects/chats. |
| `app.db` | SQLite database file created at runtime (ignored in Git). |

## Prerequisites

- Python **3.10+**
- Node.js **18+** and npm
- An **OpenAI API key** with access to `gpt-4o-mini`

## Backend Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # or use uv/poetry
pip install -r requirements.txt
```

Create `backend/.env` (never commit it):

```ini
OPENAI_API_KEY=sk-...
# Optional override, defaults to sqlite:///../app.db
# DATABASE_URL=sqlite:////absolute/path/to/app.db
```

Run the API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Key endpoints (all JSON):

| Method | Route | Purpose |
| --- | --- | --- |
| `GET /` | Health message. |
| `GET /projects` | List projects. |
| `POST /projects` | Create project `{ name, description? }`. |
| `GET /projects/{id}/chats` | Chats for a project. |
| `POST /chats/start` | Creates chat and runs agent sequence `{ project_id, idea, title?, user_id? }`. |
| `POST /chats/{chat_id}/message` | Continue an existing chat with free-text input. |
| `GET /chats/{chat_id}/messages` | Chronological message history. |

## Frontend Setup

```bash
cd debate-frontend
npm install
npm run dev    # default: http://127.0.0.1:5173
```

The app expects the backend at `http://127.0.0.1:8000` (configure `API_BASE` in `src/App.jsx`
if needed). Build with `npm run build`.

## Development Notes

- The SQLite file lives at the repository root; delete it to reset local data.
- Tailwind CSS is configured via classic v3 tooling (`postcss.config.js`, `tailwind.config.js`).
- Agent orchestration relies on the OpenAI API at runtime; without a valid key the backend
will return errors during chat generation.

## Security

- Never commit `.env` or API keys. Add secrets via environment variables or an `.env`
ignored by Git.
- Rotate any key that was previously committed; GitHub secret scanning will block pushes
if secrets remain in history.
