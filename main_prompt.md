# Cursor Prompt — HeyGen Live Receptionist Demo

**Goal**  
Build a full demo of a **live receptionist** using **HeyGen Streaming Avatar** + **minimal RAG (ChromaDB)**. The avatar idles silently until text is sent, then speaks the backend’s answer.

---

## Requirements

- **Frontend**: Next.js 14 (TypeScript)  
  - Use `@heygen/streaming-avatar` SDK  
  - Page `/`: avatar video, chat box, simple message list  
  - Calls backend `/ask` and makes avatar speak answer  
  - Idle state handled by SDK automatically  

- **Backend**: FastAPI (Python 3.10+)  
  - Endpoints:  
    - `POST /ask` → `{answer, sources}`  
    - `POST /ingest` → rebuild Chroma index from `../data/*.md|txt`  
    - `GET /health`  
  - Minimal RAG:  
    - ChromaDB persistent store  
    - Embeddings: `sentence-transformers/all-MiniLM-L6-v2`  
    - Chunk text into ~800 tokens, 150 overlap  
    - Retrieve top_k=5  
    - Simple synthesis: join top chunks → 2–4 sentence concise receptionist reply  

- **Data**: `data/` folder with `.md`/`.txt` docs (e.g. `company_overview.md`, `faq.md`)  

- **Env Vars**  
  - Frontend: `NEXT_PUBLIC_HEYGEN_API_KEY`, `NEXT_PUBLIC_HEYGEN_AVATAR_ID`, `NEXT_PUBLIC_BACKEND_URL`  
  - Backend: `CHROMA_DIR`, `DATA_DIR`, `EMBED_MODEL`

---

## Deliverables

1. `frontend/`  
   - Next.js app with page.tsx + lib/avatar.ts wrapper for HeyGen SDK  
   - Connects avatar, shows video, sends text to backend, speaks answers  

2. `backend/`  
   - `app.py` FastAPI app with endpoints + RAG logic  
   - `ingest.py` helper script  
   - `requirements.txt`  

3. `data/` sample docs  

4. `README.md` with run instructions:  
   - `uvicorn app:app --reload --port 8000`  
   - `npm run dev` in frontend  
   - visit `http://localhost:3000`

---

## Acceptance

- Open frontend → avatar idles silently  
- Type a question → backend RAG answers → text shown → avatar speaks live  
- `/ingest` rebuilds index on new docs  
- No paid LLM required (pure embeddings + simple synthesis)

---
