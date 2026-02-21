"""
FastAPI application — EV Trip Planning Agent.

Endpoints:
  POST   /chat                  — send a message, get a response + optional routes
  POST   /chat/stream           — same, but returns Server-Sent Events (SSE)
  DELETE /chat/{conversation_id} — clear conversation history
  GET    /profile               — user profile (for frontend display)
  GET    /health                — health check
"""

import json
import logging
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from .agent import clear_history, run_agent, run_agent_stream, _PROFILE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-14s  %(message)s",
    datefmt="%H:%M:%S",
)

app = FastAPI(title="EV Trip Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    message: str
    routes: list[dict] | None
    conversation_id: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    conversation_id = req.conversation_id or str(uuid.uuid4())

    try:
        message, routes = await run_agent(conversation_id, req.message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ChatResponse(
        message=message,
        routes=routes,
        conversation_id=conversation_id,
    )


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    conversation_id = req.conversation_id or str(uuid.uuid4())

    async def event_generator():
        try:
            async for event_type, payload in run_agent_stream(conversation_id, req.message):
                yield {
                    "event": event_type,
                    "data": json.dumps(payload, ensure_ascii=False),
                }
        except Exception as exc:
            yield {
                "event": "error",
                "data": json.dumps({"detail": str(exc)}),
            }

    return EventSourceResponse(event_generator())


@app.delete("/chat/{conversation_id}")
async def delete_conversation(conversation_id: str):
    clear_history(conversation_id)
    return {"ok": True}


@app.get("/profile")
async def get_profile():
    return _PROFILE


@app.get("/health")
async def health():
    return {"status": "ok"}
