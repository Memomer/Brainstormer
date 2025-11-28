from sqlmodel import create_engine, Session, SQLModel
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Get the project root directory (parent of backend/)
project_root = Path(__file__).parent.parent.parent
db_path = project_root / "app.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
