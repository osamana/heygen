# HeyGen Live Receptionist Demo

A full-featured AI receptionist demo using **HeyGen Streaming Avatar** with **RAG (Retrieval-Augmented Generation)** powered by ChromaDB. The avatar idles silently until text is sent, then speaks the backend's intelligent answers.

![Demo Architecture](https://img.shields.io/badge/Frontend-Next.js%2014-blue) ![Backend](https://img.shields.io/badge/Backend-FastAPI-green) ![AI](https://img.shields.io/badge/AI-HeyGen%20Avatar-purple) ![RAG](https://img.shields.io/badge/RAG-ChromaDB-orange)

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript, HeyGen Streaming Avatar SDK
- **Backend**: FastAPI with ChromaDB for RAG, sentence-transformers for embeddings
- **Data**: Markdown/text documents for company knowledge base
- **AI Avatar**: HeyGen Streaming Avatar for natural conversation

## 📋 Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.10+
- **HeyGen API Key** (from [HeyGen Settings](https://app.heygen.com/settings?nav=API))

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd heygen-demo
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create environment file (optional - defaults work)
cp env.example .env
# Edit .env if needed:
# CHROMA_DIR=./chroma_db
# DATA_DIR=../data
# EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Ingest documents into ChromaDB
python ingest.py

# Start the FastAPI server
uvicorn app:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install Node.js dependencies
npm install

# Create environment file with your HeyGen credentials
cat > .env.local << EOF
NEXT_PUBLIC_HEYGEN_API_KEY=NjgwN2E5YjIyMTlhNGM3YjhmYTVjMjU0NDY0NjEyOWUtMTc1NjU2MDkyNA==
NEXT_PUBLIC_HEYGEN_AVATAR_ID=Pedro_Blue_Shirt_public
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
EOF

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 4. Access the Demo

1. Open `http://localhost:3000` in your browser
2. Wait for the avatar to connect (green status indicator)
3. Type questions about the company and watch the avatar respond!

## 📁 Project Structure

```
heygen-demo/
├── frontend/                 # Next.js 14 frontend
│   ├── app/
│   │   ├── page.tsx         # Main page with avatar and chat
│   │   ├── layout.tsx       # App layout
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   ├── AvatarVideo.tsx  # Avatar video display
│   │   └── ChatInterface.tsx # Chat UI
│   ├── lib/
│   │   └── avatar.ts        # HeyGen SDK wrapper
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app.py               # Main FastAPI app with RAG
│   ├── ingest.py            # Document ingestion script
│   ├── requirements.txt     # Python dependencies
│   └── env.example          # Environment variables example
├── data/                    # Knowledge base documents
│   ├── company_overview.md  # Company information
│   ├── faq.md              # Frequently asked questions
│   └── services.txt        # Service catalog
└── README.md               # This file
```

## 🛠️ API Endpoints

### Backend (FastAPI)

- **GET** `/health` - Health check
- **POST** `/ask` - Ask a question
  ```json
  {
    "question": "What are your business hours?"
  }
  ```
  Response:
  ```json
  {
    "answer": "Our business hours are Monday-Friday 8:00 AM - 6:00 PM PST...",
    "sources": ["company_overview.md", "faq.md"]
  }
  ```
- **POST** `/ingest` - Rebuild ChromaDB index from documents

## 🎯 Features

### Frontend Features
- ✅ Real-time HeyGen Streaming Avatar
- ✅ Interactive chat interface with message history
- ✅ Connection status indicators
- ✅ Responsive design with Tailwind CSS
- ✅ TypeScript for type safety

### Backend Features
- ✅ ChromaDB persistent vector store
- ✅ Sentence-transformers embeddings (`all-MiniLM-L6-v2`)
- ✅ Intelligent text chunking (800 tokens, 150 overlap)
- ✅ Top-k retrieval (k=5)
- ✅ Smart receptionist-style response synthesis
- ✅ Document source attribution

### RAG System
- ✅ Processes Markdown and text files
- ✅ Context-aware question answering
- ✅ No paid LLM required (pure embeddings + rule-based synthesis)
- ✅ Handles business hours, contact info, services, pricing queries

## 🧪 Testing the System

Try these sample questions:

- "What are your business hours?"
- "How can I contact you?"
- "What services do you offer?"
- "How much do your services cost?"
- "Can I schedule a meeting?"
- "Do you offer cloud migration?"
- "Where are your offices located?"

## 🔧 Configuration

### Environment Variables

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_HEYGEN_API_KEY` - Your HeyGen API key
- `NEXT_PUBLIC_HEYGEN_AVATAR_ID` - Avatar ID (default: Pedro_Blue_Shirt_public)
- `NEXT_PUBLIC_BACKEND_URL` - Backend URL (default: http://localhost:8000)

**Backend** (`.env` - optional):
- `CHROMA_DIR` - ChromaDB storage directory (default: ./chroma_db)
- `DATA_DIR` - Documents directory (default: ../data)
- `EMBED_MODEL` - Embedding model (default: sentence-transformers/all-MiniLM-L6-v2)

### Adding New Documents

1. Add `.md` or `.txt` files to the `data/` directory
2. Run the ingestion script:
   ```bash
   cd backend
   python ingest.py
   ```
3. The new documents will be automatically indexed and available for queries

## 🎨 Customization

### Changing the Avatar
1. Visit [HeyGen Interactive Avatar](https://labs.heygen.com/interactive-avatar)
2. Select or create a new avatar
3. Update `NEXT_PUBLIC_HEYGEN_AVATAR_ID` in `.env.local`

### Modifying Response Style
Edit the `synthesize_answer()` function in `backend/app.py` to customize how the receptionist responds to different types of questions.

### Styling
The frontend uses Tailwind CSS. Modify components in `frontend/components/` to change the appearance.

## 🐛 Troubleshooting

### Avatar Connection Issues
- Verify your HeyGen API key is valid
- Check that you have available concurrent sessions (limit: 3 for trial)
- Ensure the avatar ID exists and is accessible

### Backend Issues
- Check that Python dependencies are installed: `pip install -r requirements.txt`
- Verify the data directory exists and contains documents
- Run `python ingest.py` if ChromaDB seems empty

### CORS Issues
- The backend is configured for `localhost:3000`
- If using different ports, update CORS settings in `backend/app.py`

## 📊 Performance Notes

- **Embeddings**: Uses lightweight `all-MiniLM-L6-v2` model for fast inference
- **Chunking**: 800 token chunks with 150 overlap for optimal context
- **Avatar Quality**: Set to `Low` for faster connection (configurable)
- **Response Time**: Typically 1-3 seconds for question → answer → speech

## 🚀 Production Deployment

For production deployment:

1. **Backend**: Deploy to services like Railway, Render, or AWS
2. **Frontend**: Deploy to Vercel, Netlify, or similar
3. **Database**: Use persistent storage for ChromaDB
4. **Environment**: Update URLs and use production HeyGen keys
5. **Security**: Add authentication, rate limiting, and input validation

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues related to:
- **HeyGen SDK**: Check [HeyGen Documentation](https://docs.heygen.com)
- **This Demo**: Create an issue in this repository
- **Business Inquiries**: Contact TechCorp Solutions at (555) 123-4567

---

**Built with ❤️ using HeyGen Streaming Avatar SDK**
