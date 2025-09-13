'use client';

import { useState, useRef } from 'react';
import { 
  AvatarQuality, 
  StartAvatarRequest, 
  VoiceEmotion, 
  VoiceChatTransport,
  STTProvider,
  ElevenLabsModel 
} from '@heygen/streaming-avatar';

import { StreamingAvatarProvider, StreamingAvatarSessionState, useStreamingAvatarContext } from '@/lib/streaming-context';
import { useStreamingAvatarSession } from '@/lib/hooks/useStreamingAvatarSession';
import { useVoiceChatAgent } from '@/lib/hooks/useVoiceChatAgent';
import AvatarVideo from '@/components/AvatarVideo';
import ChatInterface from '@/components/ChatInterface';

// Configuration from environment variables
const HEYGEN_API_KEY = process.env.NEXT_PUBLIC_HEYGEN_API_KEY;
const AVATAR_ID = process.env.NEXT_PUBLIC_AVATAR_ID;
const KNOWLEDGE_BASE_ID = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID;

// Demo mode for testing without HeyGen credentials
const DEMO_MODE = process.env.NODE_ENV === 'development' && 
  (!HEYGEN_API_KEY || HEYGEN_API_KEY === 'your_heygen_api_key_here');

console.log('🔧 Demo mode:', DEMO_MODE ? 'Enabled' : 'Disabled');
console.log('🔧 HeyGen API Key:', HEYGEN_API_KEY ? 'Present' : 'Missing');
console.log('🔧 Avatar ID:', AVATAR_ID ? 'Present' : 'Missing');

// Configure avatar for voice interaction with manual control
const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.Medium,
  avatarName: DEMO_MODE ? 'demo-avatar' : AVATAR_ID!,
  language: "en",
  // Voice configuration for proper speech detection
  voice: {
    rate: 1.0,
    emotion: VoiceEmotion.FRIENDLY,
  },
  // Enable voice features but disable auto responses
  disableIdleTimeout: true,
  // Add voice chat transport for better voice handling
  voiceChatTransport: VoiceChatTransport.WebRTC,
  // STT configuration
  sttProvider: STTProvider.Deepgram,
};

// Utility function to create access token
async function fetchAccessToken() {
  try {
    console.log('🔑 Creating access token...');
    console.log('🔑 Using API key:', HEYGEN_API_KEY ? 'Present' : 'Missing');
    
    if (DEMO_MODE) {
      console.log('🔧 Demo mode: Using mock token');
      return 'demo-token-for-testing';
    }
    
    if (!HEYGEN_API_KEY || HEYGEN_API_KEY === 'your_heygen_api_key_here') {
      throw new Error('HeyGen API key not configured. Please add your API key to .env.local');
    }
    
    // Try the newer API endpoint first
    let response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': HEYGEN_API_KEY!,
        'Content-Type': 'application/json',
      },
    });

    console.log('🔑 Token creation response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔑 Token creation failed:', errorText);
      
      // If the main endpoint fails, try the alternative endpoint
      console.log('🔑 Trying alternative token endpoint...');
      response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
        method: 'POST',
        headers: {
          'X-Api-Key': HEYGEN_API_KEY!, // Try different header format
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const altErrorText = await response.text();
        console.error('🔑 Alternative token creation also failed:', altErrorText);
        throw new Error(`Failed to create access token: ${response.status} ${response.statusText} - ${altErrorText}`);
      }
    }

    const data = await response.json();
    console.log('🔑 Token creation successful');
    const token = data.data?.token || data.token;
    
    if (!token) {
      console.error('🔑 No token in response:', data);
      throw new Error('No token returned from API');
    }
    
    console.log('🔑 Token extracted successfully');
    return token;
  } catch (error) {
    console.error('🔑 Error creating access token:', error);
    throw error;
  }
}

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } = useStreamingAvatarSession();
  const { startAgentVoiceChat } = useVoiceChatAgent();
  
  const [config] = useState<StartAvatarRequest>(DEFAULT_CONFIG);
  const mediaStream = useRef<HTMLVideoElement>(null);

  const startSession = async (isVoiceChat: boolean = false) => {
    try {
      console.log('🚀 Starting session...', { isVoiceChat });
      
      const newToken = await fetchAccessToken();
      console.log('🔑 Access token created');
      
      const avatar = initAvatar(newToken);
      console.log('🤖 Avatar initialized');

      // For TEXT chat: disable auto message capture (we handle it manually)
      // For VOICE chat: enable auto message capture (needed for voice processing)
      await startAvatar(config, newToken, isVoiceChat);
      console.log('✅ Session started successfully');

      if (isVoiceChat) {
        console.log('🎤 Starting voice chat...');
        await startAgentVoiceChat();
        console.log('🎤 Voice chat ready');
      } else {
        console.log('💬 Text chat ready');
      }
    } catch (error) {
      console.error('❌ Error starting session:', error);
      
      // Show user-friendly error message
      if (error.message.includes('API key not configured')) {
        alert('HeyGen API credentials not configured. Please add your API key and Avatar ID to the .env.local file.');
      } else if (error.message.includes('Failed to create access token')) {
        alert('Failed to connect to HeyGen API. Please check your API key and internet connection.');
      } else {
        alert('Failed to start session. Please check the console for details.');
      }
    }
  };

  const stopSession = async () => {
    try {
      console.log('Stopping session...');
      await stopAvatar();
      console.log('Session stopped');
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  };

  const isConnected = sessionState === StreamingAvatarSessionState.CONNECTED;
  const isConnecting = sessionState === StreamingAvatarSessionState.CONNECTING;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  Zuccess AI
                </h1>
                <p className="text-secondary-600 font-medium">AI-Powered Business Automation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/voice" 
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2 rounded-full font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                Voice Only
              </a>
              <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2">
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse-slow' : isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                }`} />
                <span className="text-sm font-medium text-secondary-700">
                  {isConnected ? 'AI Agent Online' : isConnecting ? 'Connecting...' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 h-[calc(100vh-16rem)]">
          {/* Avatar Video - Fixed height to prevent glitches */}
          <div className="xl:col-span-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 h-full border border-white/20">
              <div className="h-full w-full" style={{ height: 'calc(100vh - 20rem)' }}>
                {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
                  <AvatarVideo 
                    ref={mediaStream}
                    onStopAvatar={stopSession}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-blue-50 to-cyan-50 rounded-xl border-2 border-dashed border-primary-200">
                    <div className="text-center mb-8 animate-fade-in">
                      <div className="w-32 h-32 bg-gradient-to-r from-primary-500 to-primary-700 rounded-full flex items-center justify-center mb-6 mx-auto shadow-xl">
                        <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-primary-800 mb-3">AI Business Consultant</h3>
                      <p className="text-primary-700 mb-4 text-lg">Ready to transform your business with AI</p>
                      <div className="text-sm text-primary-600 space-y-2 mb-8">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          <span>AI Strategy & Implementation</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          <span>Process Automation</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          <span>ROI Analysis & Optimization</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4 w-full max-w-sm">
                      <button
                        onClick={() => startSession(true)}
                        disabled={isConnecting}
                        className="w-full px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none font-semibold"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        Start Voice Consultation
                      </button>
                      
                      <button
                        onClick={() => startSession(false)}
                        disabled={isConnecting}
                        className="w-full px-8 py-4 bg-white text-secondary-700 border-2 border-secondary-300 rounded-xl hover:bg-secondary-50 hover:border-secondary-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg font-semibold"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        Start Text Chat
                      </button>
                      
                      {DEMO_MODE && (
                        <div className="text-center">
                          <p className="text-sm text-yellow-600 mb-2">Demo Mode Active</p>
                          <p className="text-xs text-yellow-500">Add HeyGen credentials to .env.local for full voice chat</p>
                          <button
                            onClick={() => {
                              console.log('🔧 Manual test: Triggering voice message handler');
                              // Import the hook to access handleVoiceMessage
                              // This is a workaround for testing
                              window.dispatchEvent(new CustomEvent('testVoiceMessage', { 
                                detail: { message: "Hello, this is a manual test message" } 
                              }));
                            }}
                            className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                          >
                            🔧 Test Voice Handler
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {isConnecting && (
                      <div className="mt-6 flex items-center gap-3 text-primary-700 bg-primary-100 px-6 py-3 rounded-full animate-pulse">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                        <span className="font-medium">Connecting to AI agent...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Interface - Fixed height */}
          <div className="xl:col-span-3 h-full">
            <div className="h-full" style={{ height: 'calc(100vh - 20rem)' }}>
              <ChatInterface />
            </div>
          </div>
        </div>
      </main>

      {/* Marketing Section */}
      <section className="bg-white/60 backdrop-blur-sm border-t border-white/20 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              Transform Your Business with AI Automation
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Our AI-powered solutions help businesses automate processes, increase efficiency, and drive growth through intelligent automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Process Automation</h3>
              <p className="text-secondary-600 text-sm">Streamline repetitive tasks and workflows with intelligent automation solutions.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">AI Consultation</h3>
              <p className="text-secondary-600 text-sm">Expert guidance on AI strategy, implementation, and optimization for your business.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">ROI Analysis</h3>
              <p className="text-secondary-600 text-sm">Measure and optimize the return on investment for your AI automation initiatives.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Custom Solutions</h3>
              <p className="text-secondary-600 text-sm">Tailored AI solutions designed specifically for your industry and business needs.</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-primary-100 mb-6 text-lg">
              Book a free consultation to discover how AI automation can transform your business operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="bg-white text-primary-700 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors shadow-lg">
                Schedule Free Consultation
              </button>
              <div className="flex items-center gap-2 text-primary-100">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                <span className="font-medium">(555) 987-6543</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 text-secondary-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Zuccess AI</h3>
              </div>
              <p className="text-secondary-400 mb-4 max-w-md">
                Transforming businesses through intelligent AI automation solutions. 
                Your partner in digital transformation and process optimization.
              </p>
              <div className="flex space-x-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                  </svg>
                  <span className="text-sm">(555) 987-6543</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                  <span className="text-sm">hello@zuccess.ai</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-primary-400 transition-colors">AI Strategy</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">Process Automation</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">ROI Analysis</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">Custom Solutions</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-primary-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-primary-400 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-secondary-700 mt-8 pt-8 text-center text-sm">
            <p>© 2024 Zuccess AI. All rights reserved. Powered by advanced AI automation technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <StreamingAvatarProvider basePath="https://api.heygen.com">
      <InteractiveAvatar />
    </StreamingAvatarProvider>
  );
}