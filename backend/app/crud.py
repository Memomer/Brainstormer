from sqlmodel import Session, select

from .models import ChatSession, Message, Project, User


def create_project(session: Session, project: Project) -> Project:
    """Persist a new project and return the refreshed instance."""
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def get_project(session: Session, project_id: int) -> Project | None:
    return session.get(Project, project_id)

def get_projects(session: Session) -> Project | None:
    return session.exec(select(Project)).all()

def create_chat(session: Session, chat: ChatSession) -> ChatSession:
    session.add(chat)
    session.commit()
    session.refresh(chat)
    return chat


def get_chat(session: Session, chat_id: int) -> ChatSession | None:
    return session.get(ChatSession, chat_id)


def add_message(session: Session, message: Message) -> Message:
    session.add(message)
    session.commit()
    session.refresh(message)
    return message


def get_messages_for_chat(session: Session, chat_id: int) -> list[Message]:
    stmt = select(Message).where(Message.chat_id == chat_id).order_by(Message.sequence)
    return session.exec(stmt).all()
