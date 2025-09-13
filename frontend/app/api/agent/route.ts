import { NextRequest, NextResponse } from 'next/server';

interface AgentRequest {
  message: string;
  thread_id?: string;
}

interface AgentResponse {
  reply: string;
  thread_id: string;
  actions_performed?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentRequest = await request.json();
    const { message, thread_id } = body;

    console.log('🎤 Agent API received request:', { message: message?.substring(0, 50) + '...', thread_id });

    if (!message) {
      console.error('❌ No message provided in request');
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get backend URL from environment or default to localhost
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    console.log('🔄 Forwarding request to backend:', backendUrl);
    console.log('📝 Full message:', message);
    
    // Forward the request to the Python backend
    const response = await fetch(`${backendUrl}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: message
      }),
    });

    if (!response.ok) {
      console.error('❌ Backend request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Backend error details:', errorText);
      throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Backend response received');
    console.log('📤 Full reply:', data.answer);
    console.log('📤 Reply length:', data.answer?.length);

    // Transform the backend response to match the expected format
    const agentResponse: AgentResponse = {
      reply: data.answer || "I'm sorry, I couldn't process your request right now. Please try again.",
      thread_id: thread_id || `thread_${Date.now()}`,
      actions_performed: data.sources ? [`Retrieved information from: ${data.sources.join(', ')}`] : []
    };

    console.log('🎤 Agent API sending response:', { 
      replyLength: agentResponse.reply.length, 
      threadId: agentResponse.thread_id 
    });

    return NextResponse.json(agentResponse);

  } catch (error) {
    console.error('❌ Agent API error:', error);
    
    // Return a fallback response
    const fallbackResponse: AgentResponse = {
      reply: "I apologize, but I'm experiencing technical difficulties. Our team is working to resolve this. For immediate assistance, please call (555) 987-6543.",
      thread_id: `thread_${Date.now()}`,
      actions_performed: ['Error handling activated']
    };

    console.log('🎤 Agent API sending fallback response');
    return NextResponse.json(fallbackResponse, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Agent API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: 'Send message to AI agent'
    }
  });
}
