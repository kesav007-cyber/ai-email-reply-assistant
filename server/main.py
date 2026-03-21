import os
from typing import Literal

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=ENV_PATH, override=True)

app = FastAPI(title="AI Email Reply Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_api_key() -> str:
    # Prefer project-local .env value to avoid stale global env vars.
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as env_file:
            for line in env_file:
                if line.strip().startswith("GEMINI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass

    load_dotenv(dotenv_path=ENV_PATH, override=True)
    return os.getenv("GEMINI_API_KEY", "").strip()


class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[HistoryItem] = []
    tone: str
    intent: str
    length: str


class ChatResponse(BaseModel):
    reply: str


def get_tone_instruction(tone: str) -> str:
    mapping = {
        "formal": "Use formal language, polite phrasing, and structured sentences.",
        "friendly": "Use warm, approachable, positive wording while staying professional.",
        "professional": "Use clear, business-appropriate language with concise clarity.",
        "apologetic": "Acknowledge concern, express sincere apology, and propose resolution.",
        "persuasive": "Use confident, convincing language focused on benefits and clear call-to-action.",
    }
    return mapping.get(tone.lower(), mapping["professional"])


def get_intent_instruction(intent: str) -> str:
    mapping = {
        "reply": "Respond directly and clearly to the sender's message.",
        "complaint": "Address the issue respectfully, acknowledge problem, and provide a resolution path.",
        "followup": "Ask for an update with a polite reminder and clear context.",
        "request": "Make the request explicit, specific, and actionable.",
        "apology": "Express accountability, apologize sincerely, and suggest corrective action.",
        "meeting": "Confirm or propose scheduling details with concise availability and next steps.",
    }
    return mapping.get(intent.lower(), mapping["reply"])


def get_length_instruction(length: str) -> str:
    mapping = {
        "short": "Keep the response to about 2-3 lines.",
        "medium": "Keep the response to about 5-6 lines.",
        "long": "Provide a detailed response with complete context and next steps.",
    }
    return mapping.get(length.lower(), mapping["medium"])


def build_prompt(payload: ChatRequest) -> str:
    history_lines = []
    for item in payload.history[-20:]:
        speaker = "User" if item.role == "user" else "Assistant"
        history_lines.append(f"{speaker}: {item.content.strip()}")
    history_block = "\n".join(history_lines) if history_lines else "No previous history."

    return f"""
You are an expert AI email writing assistant.
Goal: Generate high-quality email replies and refinement edits based on user instruction.

Constraints:
- Output only the email content (no markdown code fences).
- Follow standard email format: Greeting, Body, Closing.
- Adapt tone, intent, and length exactly.
- If user requests refinement (e.g., "make it shorter"), revise the latest relevant reply while preserving core meaning.
- Be specific and practical.

Tone instruction:
{get_tone_instruction(payload.tone)}

Intent instruction:
{get_intent_instruction(payload.intent)}

Length instruction:
{get_length_instruction(payload.length)}

Conversation history:
{history_block}

Latest user request:
{payload.message.strip()}
""".strip()


def resolve_available_model_name() -> str:
    preferred_keywords = ["flash", "gemini-2.0", "gemini-1.5"]
    candidates = []
    for model in genai.list_models():
        methods = getattr(model, "supported_generation_methods", []) or []
        if "generateContent" in methods:
            name = getattr(model, "name", "")
            if name:
                # API expects full model name with "models/" prefix.
                candidates.append(name)

    if not candidates:
        raise HTTPException(
            status_code=502,
            detail="No Gemini models available with generateContent support for this API key.",
        )

    for keyword in preferred_keywords:
        for candidate in candidates:
            if keyword in candidate.lower():
                return candidate

    return candidates[0]


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    api_key = get_api_key()
    if not api_key or api_key == "your_api_key_here":
        raise HTTPException(
            status_code=500,
            detail="Missing GEMINI_API_KEY in server/.env. Please set your Gemini API key.",
        )

    try:
        genai.configure(api_key=api_key)
        prompt = build_prompt(payload)
        model_name = resolve_available_model_name()
        model = genai.GenerativeModel(model_name)
        result = model.generate_content(prompt)
        reply = (result.text or "").strip()
        if not reply:
            raise HTTPException(status_code=502, detail="Gemini returned an empty response.")
        return ChatResponse(reply=reply)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate reply: {exc}") from exc
