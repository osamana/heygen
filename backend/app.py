import os
import glob
from typing import List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
# Simple text splitter implementation
import re
import tiktoken
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="HeyGen RAG Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for system validation"""
    try:
        # Test database connection
        collections = chroma_client.list_collections()
        
        # Test embedding model
        test_embedding = embedding_model.encode(["test"]).tolist()
        
        return {
            "status": "healthy",
            "timestamp": "2024-01-01T00:00:00Z",
            "components": {
                "database": "operational",
                "embedding_model": "operational",
                "collections_count": len(collections)
            },
            "version": "1.0.0"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail={
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2024-01-01T00:00:00Z"
        })

# Configuration
CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_db")
DATA_DIR = os.getenv("DATA_DIR", "../data")
EMBED_MODEL = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

# Initialize components
embedding_model = SentenceTransformer(EMBED_MODEL)
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)

# Simple text splitter function
def split_text_into_chunks(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> list[str]:
    """Split text into overlapping chunks"""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence endings
            sentence_end = text.rfind('.', start, end)
            if sentence_end > start + chunk_size // 2:
                end = sentence_end + 1
            else:
                # Look for paragraph breaks
                para_end = text.rfind('\n\n', start, end)
                if para_end > start + chunk_size // 2:
                    end = para_end + 2
                else:
                    # Look for line breaks
                    line_end = text.rfind('\n', start, end)
                    if line_end > start + chunk_size // 2:
                        end = line_end + 1
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end - chunk_overlap
        if start >= len(text):
            break
    
    return chunks

# Tokenizer for token counting
tokenizer = tiktoken.get_encoding("cl100k_base")

def count_tokens(text: str) -> int:
    """Count tokens in text"""
    return len(tokenizer.encode(text))

# Request/Response models
class AskRequest(BaseModel):
    question: str

class AskResponse(BaseModel):
    answer: str
    sources: List[str]

class IngestResponse(BaseModel):
    message: str
    documents_processed: int
    chunks_created: int

# Global collection reference
collection = None

def initialize_collection():
    """Initialize or get the ChromaDB collection"""
    global collection
    try:
        collection = chroma_client.get_collection("documents")
    except:
        collection = chroma_client.create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )

def load_and_chunk_documents() -> List[Dict[str, Any]]:
    """Load documents from data directory and chunk them"""
    documents = []
    data_path = Path(DATA_DIR)
    
    if not data_path.exists():
        raise HTTPException(status_code=404, detail=f"Data directory {DATA_DIR} not found")
    
    # Load markdown and text files
    file_patterns = ["*.md", "*.txt"]
    files = []
    for pattern in file_patterns:
        files.extend(glob.glob(os.path.join(DATA_DIR, pattern)))
    
    if not files:
        raise HTTPException(status_code=404, detail="No documents found in data directory")
    
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Split into chunks
            chunks = split_text_into_chunks(content)
            
            # Create document entries
            filename = os.path.basename(file_path)
            for i, chunk in enumerate(chunks):
                if chunk.strip():  # Skip empty chunks
                    documents.append({
                        "id": f"{filename}_chunk_{i}",
                        "text": chunk,
                        "source": filename,
                        "chunk_index": i
                    })
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            continue
    
    return documents

def synthesize_answer(question: str, relevant_chunks: List[str], sources: List[str]) -> str:
    """Simple synthesis of answer from relevant chunks"""
    if not relevant_chunks:
        return "I don't have information about that topic. Please contact our office at (555) 123-4567 for more details."
    
    # Join the most relevant chunks
    context = "\n\n".join(relevant_chunks[:3])  # Use top 3 chunks
    
    # Simple template-based synthesis for receptionist responses
    if any(word in question.lower() for word in ['hours', 'time', 'open', 'closed']):
        if 'hours' in context.lower() or 'monday' in context.lower():
            return "Our business hours are Monday-Friday 8:00 AM - 6:00 PM PST, Saturday 9:00 AM - 2:00 PM PST, and we're closed on Sundays. You can reach us at (555) 123-4567."
    
    elif any(word in question.lower() for word in ['contact', 'phone', 'email', 'call']):
        return "You can contact us at (555) 123-4567 or email info@techcorpsolutions.com. Our main office is located in San Francisco with branches in New York, Austin, and Seattle."
    
    elif any(word in question.lower() for word in ['services', 'what do you do', 'offerings']):
        return "We offer cloud migration, AI & machine learning solutions, digital transformation, cybersecurity, and DevOps consulting. We'd be happy to discuss how we can help with your specific needs."
    
    elif any(word in question.lower() for word in ['pricing', 'cost', 'price', 'expensive']):
        return "Our pricing depends on project scope and complexity. We offer flexible models including fixed-price projects and hourly consulting. We provide a complimentary 1-hour consultation to discuss your needs."
    
    elif any(word in question.lower() for word in ['meeting', 'schedule', 'appointment']):
        return "You can schedule a meeting by calling (555) 123-4567, emailing info@techcorpsolutions.com, or using our online booking system. We offer free initial consultations."
    
    else:
        # Generic response based on context
        sentences = context.split('.')
        relevant_sentences = [s.strip() for s in sentences[:4] if s.strip()]
        answer = '. '.join(relevant_sentences)
        
        if len(answer) > 200:
            answer = answer[:200] + "..."
        
        return f"{answer}. For more detailed information, please contact us at (555) 123-4567."

@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    initialize_collection()
    
    # Check if collection is empty and ingest data if needed
    try:
        count = collection.count()
        if count == 0:
            print("Collection is empty, ingesting documents...")
            await ingest_documents()
    except Exception as e:
        print(f"Error during startup: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "HeyGen RAG Backend is running"}

@app.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """Ask a question and get an answer from the RAG system"""
    if not collection:
        raise HTTPException(status_code=500, detail="Collection not initialized")
    
    try:
        # Generate embedding for the question
        question_embedding = embedding_model.encode([request.question]).tolist()[0]
        
        # Query ChromaDB
        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=5
        )
        
        if not results['documents'] or not results['documents'][0]:
            return AskResponse(
                answer="I don't have information about that topic. Please contact our office at (555) 123-4567 for more details.",
                sources=[]
            )
        
        # Extract relevant chunks and sources
        relevant_chunks = results['documents'][0]
        metadatas = results['metadatas'][0] if results['metadatas'] else []
        sources = list(set([meta.get('source', 'Unknown') for meta in metadatas if meta]))
        
        # Synthesize answer
        answer = synthesize_answer(request.question, relevant_chunks, sources)
        
        return AskResponse(answer=answer, sources=sources)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.post("/ingest", response_model=IngestResponse)
async def ingest_documents():
    """Ingest documents from the data directory into ChromaDB"""
    if not collection:
        raise HTTPException(status_code=500, detail="Collection not initialized")
    
    try:
        # Clear existing documents
        try:
            # Get all IDs and delete them
            results = collection.get()
            if results['ids']:
                collection.delete(ids=results['ids'])
        except Exception as e:
            # If collection is empty or doesn't exist, continue
            print(f"Note: {e}")
        
        # Load and chunk documents
        documents = load_and_chunk_documents()
        
        if not documents:
            raise HTTPException(status_code=404, detail="No documents to ingest")
        
        # Prepare data for ChromaDB
        ids = [doc["id"] for doc in documents]
        texts = [doc["text"] for doc in documents]
        metadatas = [{"source": doc["source"], "chunk_index": doc["chunk_index"]} for doc in documents]
        
        # Generate embeddings
        embeddings = embedding_model.encode(texts).tolist()
        
        # Add to ChromaDB
        collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas
        )
        
        # Get unique document count
        unique_sources = set(doc["source"] for doc in documents)
        
        return IngestResponse(
            message="Documents ingested successfully",
            documents_processed=len(unique_sources),
            chunks_created=len(documents)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ingesting documents: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
