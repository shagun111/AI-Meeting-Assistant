
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Text,
    DateTime,
)
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'meetings.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(32), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    transcript = Column(Text, nullable=False)
    meeting_report = Column(Text, nullable=False)
    follow_up_email = Column(Text, nullable=False)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )


def init_db():
    Base.metadata.create_all(bind=engine)