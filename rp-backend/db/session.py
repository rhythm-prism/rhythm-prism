import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from db.models import Base
from typing import AsyncGenerator
from contextlib import asynccontextmanager



USER = os.environ["POSTGRES_USER"]
PASS = os.environ["POSTGRES_PASSWORD"]
DBNAME = os.environ["POSTGRES_DB"]

engine = create_async_engine(
    f"postgresql+asyncpg://{USER}:{PASS}@postgres:5432/{DBNAME}",
    #f"postgresql://{USER}:{PASS}@localhost:5002/{DBNAME}",
    pool_size = 10
)

sync_engine = create_engine(
    f"postgresql://{USER}:{PASS}@postgres:5432/{DBNAME}",
    #f"postgresql://{USER}:{PASS}@localhost:5002/{DBNAME}",
    pool_size = 3
)

SessionMakerSync = sessionmaker(sync_engine, autocommit=False, autoflush=False, expire_on_commit=False)
SessionMaker = async_sessionmaker(engine, autocommit=False, autoflush=False, expire_on_commit=False)

async def init_db_model():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)   

# セッションを作成
async def create_session() -> AsyncGenerator[AsyncSession, None]:
    session = SessionMaker()
    try:
        yield session
    finally:
        await session.close()

@asynccontextmanager
async def create_session_context() -> AsyncGenerator[AsyncSession, None]:
    session = SessionMaker()
    try:
        yield session
    finally:
        await session.close()