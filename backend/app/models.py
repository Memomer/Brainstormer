from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlmodel import SQLModel, Field, Relationship


class AgentRole(str, Enum):
    USER = "user"
    OPTIMIST = "optimist"
    PESSIMIST = "pessimist"
    PLANNER = "planner"
    CRITIC = "critic"
    DEVELOPER = "developer"
    MENTOR = "mentor"


class User(SQLModel, table=True):
    __tablename__ = "users"
    user_id: Optional[int] = Field(default=None, primary_key=True)
    name: Optional[str] = None

    projects: List["Project"] = Relationship(back_populates="owner")
    messages: List["Message"] = Relationship(back_populates="sender")


class Project(SQLModel, table=True):
    __tablename__ = "projects"
    project_id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user_id: Optional[int] = Field(default=None, foreign_key="users.user_id")
    owner: Optional[User] = Relationship(back_populates="projects")

    chats: List["ChatSession"] = Relationship(back_populates="project")


class ChatSession(SQLModel, table=True):
    __tablename__ = "chatsessions"
    chat_id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="projects.project_id")
    idea: str
    title: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    project: Optional[Project] = Relationship(back_populates="chats")
    messages: List["Message"] = Relationship(
        back_populates="chat",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Message(SQLModel, table=True):
    __tablename__ = "messages"
    message_id: Optional[int] = Field(default=None, primary_key=True)
    chat_id: int = Field(foreign_key="chatsessions.chat_id")
    sender_id: Optional[int] = Field(default=None, foreign_key="users.user_id")

    agent_role: AgentRole
    content: str
    sequence: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

    chat: ChatSession = Relationship(back_populates="messages")
    sender: Optional[User] = Relationship(back_populates="messages")
