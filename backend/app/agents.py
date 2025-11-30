import os
from datetime import datetime, timezone
from typing import Dict, Optional

from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
from sqlmodel import Session, select

from .crud import add_message
from .models import AgentRole, ChatSession, Message



def call_openai(system_prompt: str, user_prompt: str) -> str:
    """Simple Chat Completions wrapper."""
    response = client.chat.completions.create(model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ],
    temperature=0.7,
    max_tokens=600)
    return response.choices[0].message.content.strip()


def _persist_message(
    session: Session,
    chat: ChatSession,
    agent_role: AgentRole,
    content: str,
    sequence: int,
    user_id: Optional[int],
) -> None:
    msg = Message(
        chat_id=chat.chat_id,
        sender_id=user_id,
        agent_role=agent_role,
        content=content,
        sequence=sequence,
        created_at=datetime.now(timezone.utc),
    )
    add_message(session, msg)


def run_agent_sequence(
    session: Session, chat: ChatSession, idea: str, user_id: Optional[int] = None
) -> Dict[str, str]:
    """Run all agents synchronously, persisting each output."""
    # Get the next sequence number (start after existing messages)
    # This ensures agent messages appear after any user messages that were just added
    from .models import Message
    existing_messages = session.exec(select(Message).where(Message.chat_id == chat.chat_id).order_by(Message.sequence)).all()
    sequence = max([m.sequence for m in existing_messages], default=0) + 1
    
    outputs: Dict[str, str] = {}

    steps = [
        (
            AgentRole.OPTIMIST,
            "You are Optimist: highlight realistic upside and opportunities.",
            lambda _: f"Idea: {idea}\nList optimistic yet grounded strengths.",
        ),
        (
            AgentRole.PESSIMIST,
            "You are Pessimist: surface risks, blockers, and failure modes.",
            lambda o: f"Idea: {idea}\nOptimist says:\n{o['optimist']}\nList risks.",
        ),
        (
            AgentRole.PLANNER,
            "Planner: produce an execution plan informed by both viewpoints.",
            lambda o: (
                f"Idea: {idea}\nOptimist:\n{o['optimist']}\nPessimist:\n{o['pessimist']}"
                "\nProvide a phased plan with mitigations."
            ),
        ),
        (
            AgentRole.CRITIC,
            "Critic: stress-test the planner's proposal.",
            lambda o: f"Planner output:\n{o['planner']}\nProvide critical analysis.",
        ),
        (
            AgentRole.DEVELOPER,
            "Developer: respond with concrete technical adjustments.",
            lambda o: f"Critic notes:\n{o['critic']}\nOutline engineering responses.",
        ),
        (
            AgentRole.MENTOR,
            "Mentor: summarize and offer coaching for next steps.",
            lambda o: f"Developer output:\n{o['developer']}\nProvide mentorship guidance.",
        ),
    ]

    for role, system_prompt, prompt_builder in steps:
        user_prompt = prompt_builder(outputs)
        content = call_openai(system_prompt, user_prompt)
        outputs[role.value] = content
        _persist_message(session, chat, role, content, sequence, user_id)
        sequence += 1

    return outputs


