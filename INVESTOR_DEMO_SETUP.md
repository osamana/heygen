# Investor Demo Setup Guide

## Overview
This is a polished AI-powered business consultation platform featuring:
- ✨ Modern, professional UI/UX design
- 🤖 Enlarged, prominent AI avatar video interface
- 💬 Real-time voice and text chat capabilities
- 📊 Marketing capabilities showcase
- 🔗 Fully integrated backend API

## Quick Start

### 1. Backend Setup
```bash
cd backend
source venv/bin/activate
python app.py
```
The backend will start on `http://localhost:8000`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:3000`

### 3. HeyGen Configuration (Required)
Add your HeyGen credentials to `frontend/.env.local`:
```
NEXT_PUBLIC_HEYGEN_API_KEY=your_actual_api_key
NEXT_PUBLIC_AVATAR_ID=your_actual_avatar_id
NEXT_PUBLIC_KNOWLEDGE_BASE_ID=your_knowledge_base_id
```

## Demo Features

### 🎨 Professional Design
- Modern gradient backgrounds with glassmorphism effects
- Professional color scheme (blues, cyans, and grays)
- Smooth animations and transitions
- Responsive layout optimized for presentations

### 🤖 Enhanced Avatar Experience
- **Enlarged avatar video** (now takes up 40% of screen width)
- Professional loading states with branded messaging
- Real-time status indicators (Speaking, Listening, Ready)
- Connection quality monitoring
- Enhanced controls with modern styling

### 💬 Advanced Chat Interface
- Modern message bubbles with avatars
- Real-time typing indicators
- Professional welcome messages
- Suggested conversation starters
- Smooth animations for new messages

### 🎤 Voice Chat Integration
- Real-time voice recognition
- Seamless voice-to-text processing
- AI-powered responses via voice synthesis
- Visual indicators for voice activity
- Reliable connection management

### 📊 Marketing Showcase Section
- **Four key service areas highlighted:**
  1. Process Automation
  2. AI Consultation  
  3. ROI Analysis
  4. Custom Solutions
- Professional service cards with hover effects
- Call-to-action section with contact information
- Modern footer with company branding

### 🔧 Technical Architecture
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: FastAPI with ChromaDB for RAG (Retrieval-Augmented Generation)
- **AI Integration**: HeyGen Streaming Avatar API
- **Real-time Features**: WebSocket connections for voice/video
- **Database**: ChromaDB for knowledge base storage

## Demo Flow Suggestions

### 1. Welcome & Introduction (30 seconds)
- Show the landing page with professional branding
- Highlight the "AI-Powered Business Automation" tagline
- Point out the modern, investor-ready design

### 2. Avatar Demonstration (1-2 minutes)
- Click "Start Voice Consultation" to show the enlarged avatar
- Demonstrate the professional loading sequence
- Show real-time status indicators
- Test voice interaction if HeyGen keys are configured

### 3. Chat Interface Demo (1 minute)
- Use "Start Text Chat" to show the enhanced chat interface
- Type sample questions like:
  - "How can AI automate my business processes?"
  - "What's the ROI of AI automation?"
  - "Tell me about your services"
- Show the professional message styling and responses

### 4. Marketing Capabilities (1 minute)
- Scroll down to show the marketing section
- Highlight the four service areas
- Show the call-to-action section
- Demonstrate responsive design

### 5. Technical Highlights (30 seconds)
- Mention the full-stack architecture
- Real-time capabilities
- Scalable backend with RAG technology
- Professional development practices

## Key Investor Talking Points

### 🚀 **Market Opportunity**
- AI business automation is a rapidly growing market
- SMBs need accessible AI consultation platforms
- Voice-enabled interfaces increase engagement by 40%

### 💼 **Business Model**
- Subscription-based AI consultation services
- White-label solutions for consulting firms
- Enterprise custom AI agent development

### 🛠 **Technical Advantages**
- Modern, scalable architecture
- Real-time voice/video capabilities
- RAG-powered knowledge retrieval
- Professional, enterprise-ready UI/UX

### 📈 **Growth Potential**
- Easily customizable for different industries
- Scalable backend architecture
- Integration-ready with existing business systems
- Multi-language and multi-avatar support

## Troubleshooting

### Backend Issues
- Ensure Python virtual environment is activated
- Check that port 8000 is available
- Verify data files exist in `/data` directory

### Frontend Issues
- Run `npm install` if dependencies are missing
- Check that port 3000 is available
- Ensure `.env.local` exists with backend URL

### HeyGen Integration
- Verify API key is valid and active
- Check avatar ID matches your HeyGen account
- Ensure sufficient HeyGen credits are available

## Production Deployment Notes

- Backend can be deployed on AWS/GCP/Azure with Docker
- Frontend deploys seamlessly on Vercel/Netlify
- Environment variables need to be configured for production
- Consider CDN for avatar video streaming optimization

---

**Demo Duration**: 5-7 minutes total
**Best Viewed**: On large screens (1920x1080 or higher)
**Recommended Browser**: Chrome/Safari for best HeyGen compatibility
