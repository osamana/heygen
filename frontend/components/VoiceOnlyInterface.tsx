'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AvatarQuality, 
  StartAvatarRequest, 
  VoiceEmotion, 
  VoiceChatTransport,
  STTProvider 
} from '@heygen/streaming-avatar';
import { useStreamingAvatarContext, StreamingAvatarSessionState, MessageSender } from '@/lib/streaming-context';
import { useStreamingAvatarSession } from '@/lib/hooks/useStreamingAvatarSession';
import { useVoiceChatAgent } from '@/lib/hooks/useVoiceChatAgent';
import { validator, SystemHealth, getSystemStatus } from '@/lib/validation';
import AvatarVideo from './AvatarVideo';

type VoiceState = 'idle' | 'starting' | 'ready' | 'listening' | 'processing' | 'speaking' | 'error';

// Configuration from environment variables
const HEYGEN_API_KEY = process.env.NEXT_PUBLIC_HEYGEN_API_KEY;
const AVATAR_ID = process.env.NEXT_PUBLIC_AVATAR_ID;

// Demo mode for testing without HeyGen credentials
const DEMO_MODE = process.env.NODE_ENV === 'development' && 
  (!HEYGEN_API_KEY || HEYGEN_API_KEY === 'your_heygen_api_key_here');

// Configure avatar for voice interaction
const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.Medium,
  avatarName: DEMO_MODE ? 'demo-avatar' : AVATAR_ID!,
  language: "en",
  voice: {
    rate: 1.0,
    emotion: VoiceEmotion.FRIENDLY,
  },
  disableIdleTimeout: true,
  voiceChatTransport: VoiceChatTransport.WebRTC,
  sttProvider: STTProvider.Deepgram,
};

// Utility function to create access token
async function fetchAccessToken() {
  try {
    console.log('🔑 Creating access token...');
    
    if (DEMO_MODE) {
      console.log('🔧 Demo mode: Using mock token');
      return 'demo-token-for-testing';
    }
    
    if (!HEYGEN_API_KEY || HEYGEN_API_KEY === 'your_heygen_api_key_here') {
      throw new Error('HeyGen API key not configured. Please add your API key to .env.local');
    }
    
    const response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
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
      throw new Error(`Failed to create access token: ${response.status} ${response.statusText}`);
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

export default function VoiceOnlyInterface() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');
  const [sessionDuration, setSessionDuration] = useState(0);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const sessionStartRef = useRef<number | null>(null);
  
  const { 
    sessionState, 
    isAvatarTalking, 
    messages
  } = useStreamingAvatarContext();
  
  const { 
    initAvatar, 
    startAvatar, 
    stopAvatar 
  } = useStreamingAvatarSession();
  
  const {
    startAgentVoiceChat,
    stopAgentVoiceChat,
    muteInputAudio,
    unmuteInputAudio,
    isMuted,
    isVoiceChatActive,
    isVoiceChatLoading,
    threadId
  } = useVoiceChatAgent();

  // System validation on mount
  useEffect(() => {
    const runValidation = async () => {
      setIsValidating(true);
      try {
        const health = await validator.validateSystem();
        setSystemHealth(health);
        
        if (!health.overall.isValid) {
          setError(`System validation failed: ${health.overall.message}`);
        }
      } catch (error) {
        console.error('Validation failed:', error);
        setError('System validation failed. Please refresh and try again.');
      } finally {
        setIsValidating(false);
      }
    };

    runValidation();
  }, []);

  // Session duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sessionState === StreamingAvatarSessionState.CONNECTED && sessionStartRef.current) {
      interval = setInterval(() => {
        const now = Date.now();
        const duration = Math.floor((now - sessionStartRef.current!) / 1000);
        setSessionDuration(duration);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionState]);

  // Update voice state based on context
  useEffect(() => {
    if (sessionState === StreamingAvatarSessionState.CONNECTED && isVoiceChatActive) {
      if (isAvatarTalking) {
        setVoiceState('speaking');
      } else if (isVoiceChatLoading) {
        setVoiceState('processing');
      } else {
        setVoiceState('listening');
      }
    } else if (sessionState === StreamingAvatarSessionState.CONNECTING) {
      setVoiceState('starting');
    } else if (sessionState === StreamingAvatarSessionState.CONNECTED) {
      setVoiceState('ready');
    } else if (error) {
      setVoiceState('error');
    } else {
      setVoiceState('idle');
    }
  }, [sessionState, isVoiceChatActive, isAvatarTalking, isVoiceChatLoading, error]);

  // Simulate connection quality monitoring
  useEffect(() => {
    if (sessionState === StreamingAvatarSessionState.CONNECTED) {
      const qualityCheck = setInterval(() => {
        const qualities: Array<'excellent' | 'good' | 'fair' | 'poor'> = ['excellent', 'good', 'fair'];
        const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
        setConnectionQuality(randomQuality);
      }, 10000);

      return () => clearInterval(qualityCheck);
    }
  }, [sessionState]);

  const handleStartSession = useCallback(async () => {
    try {
      setError(null);
      setVoiceState('starting');
      
      // Run quick validation before starting
      console.log('🔍 Running pre-start validation...');
      const health = await validator.validateSystem();
      setSystemHealth(health);
      
      if (!health.overall.isValid) {
        setError(`Cannot start session: ${health.overall.message}`);
        setVoiceState('error');
        return;
      }
      
      console.log('🎤 Starting voice session...');
      
      // Create access token
      const newToken = await fetchAccessToken();
      console.log('🔑 Access token created');
      
      // Initialize avatar
      const avatar = initAvatar(newToken);
      console.log('🤖 Avatar initialized');

      // Start avatar session with voice chat enabled
      await startAvatar(DEFAULT_CONFIG, newToken, true);
      console.log('✅ Avatar session started successfully');
      
      sessionStartRef.current = Date.now();
      setIsInitialized(true);
      
      // Wait a moment for session to establish then start voice chat
      setTimeout(async () => {
        try {
          console.log('🎤 Starting agent voice chat...');
          await startAgentVoiceChat(false); // Don't mute input audio
          console.log('✅ Voice session ready!');
        } catch (voiceError) {
          console.error('❌ Voice chat error:', voiceError);
          setError('Failed to start voice chat. Please try again.');
          setVoiceState('error');
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Session start error:', error);
      setError('Failed to start session. Please check your connection and try again.');
      setVoiceState('error');
    }
  }, [initAvatar, startAvatar, startAgentVoiceChat]);

  const handleEndSession = useCallback(async () => {
    try {
      console.log('🎤 Ending voice session...');
      stopAgentVoiceChat();
      await stopAvatar();
      
      setIsInitialized(false);
      setVoiceState('idle');
      setSessionDuration(0);
      sessionStartRef.current = null;
      setError(null);
      
      console.log('✅ Voice session ended');
    } catch (error) {
      console.error('❌ Session end error:', error);
      setError('Error ending session');
    }
  }, [stopAgentVoiceChat, stopAvatar]);

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      unmuteInputAudio();
    } else {
      muteInputAudio();
    }
  }, [isMuted, muteInputAudio, unmuteInputAudio]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateDisplay = () => {
    switch (voiceState) {
      case 'idle':
        return { text: 'Ready to Start', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
      case 'starting':
        return { text: 'Connecting...', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
      case 'ready':
        return { text: 'Connected', color: 'text-green-400', bgColor: 'bg-green-500/20' };
      case 'listening':
        return { text: 'Listening', color: 'text-green-400', bgColor: 'bg-green-500/20' };
      case 'processing':
        return { text: 'Processing...', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
      case 'speaking':
        return { text: 'Speaking', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
      case 'error':
        return { text: 'Error', color: 'text-red-400', bgColor: 'bg-red-500/20' };
      default:
        return { text: 'Unknown', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    }
  };

  const stateDisplay = getStateDisplay();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      {/* Header */}
      <div className="relative z-10 text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AI Voice Assistant
        </h1>
        <p className="text-xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
          Your intelligent business consultant powered by advanced RAG technology
        </p>
      </div>

      {/* Main Interface */}
      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Avatar Container */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-80 h-80 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-sm">
              {isInitialized ? (
                <AvatarVideo />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                    </div>
                    <p className="text-white/80 font-medium">AI Assistant</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Voice State Indicator */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
              <div className={`px-4 py-2 rounded-full ${stateDisplay.bgColor} backdrop-blur-sm border border-white/20`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stateDisplay.color.replace('text-', 'bg-')} ${voiceState === 'listening' ? 'animate-pulse' : ''}`}></div>
                  <span className={`text-sm font-medium ${stateDisplay.color}`}>
                    {stateDisplay.text}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-6 mb-8">
          {!isInitialized ? (
            <button
              onClick={handleStartSession}
              disabled={voiceState === 'starting' || isValidating || (systemHealth && !systemHealth.overall.isValid)}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-3">
                {isValidating ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Validating System...</span>
                  </>
                ) : voiceState === 'starting' ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Connecting...</span>
                  </>
                ) : systemHealth && !systemHealth.overall.isValid ? (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>System Check Failed</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    <span>Start Voice Session</span>
                  </>
                )}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-4">
              {/* Mute/Unmute Button */}
              <button
                onClick={handleToggleMute}
                className={`p-4 rounded-full transition-all duration-200 transform hover:scale-110 shadow-lg ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isMuted ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.828 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.828l3.555-3.793a1 1 0 011.617.793zM12 8a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    <path d="M16.707 9.293a1 1 0 010 1.414l-1.414 1.414a1 1 0 01-1.414-1.414l1.414-1.414a1 1 0 011.414 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* End Session Button */}
              <button
                onClick={handleEndSession}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 000 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
                </svg>
                End Session
              </button>
            </div>
          )}
        </div>

        {/* System Status Panel */}
        {(isInitialized || systemHealth) && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Session Info */}
              {isInitialized && (
                <div className="text-center">
                  <h3 className="text-white font-semibold mb-2">Session Duration</h3>
                  <p className="text-2xl font-mono text-blue-400">{formatDuration(sessionDuration)}</p>
                </div>
              )}

              {/* Connection Quality */}
              {isInitialized && (
                <div className="text-center">
                  <h3 className="text-white font-semibold mb-2">Connection</h3>
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      connectionQuality === 'excellent' ? 'bg-green-400' :
                      connectionQuality === 'good' ? 'bg-yellow-400' :
                      connectionQuality === 'fair' ? 'bg-orange-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-white capitalize">{connectionQuality}</span>
                  </div>
                </div>
              )}

              {/* System Health */}
              {systemHealth && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="relative">
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                        systemHealth.overall.isValid ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                      }`}></div>
                    </div>
                    <h3 className="text-white font-semibold">System Health</h3>
                  </div>
                  
                  {/* Overall Status */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                    isValidating
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : systemHealth.overall.isValid 
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : 'bg-red-500/20 border border-red-500/30'
                  }`}>
                    {isValidating ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                        <span className="text-sm font-medium text-blue-400">Validating...</span>
                      </>
                    ) : (
                      <>
                        <div className={`w-2 h-2 rounded-full ${
                          systemHealth.overall.isValid ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          systemHealth.overall.isValid ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {systemHealth.overall.isValid ? 'All Systems Operational' : 'System Issues Detected'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Component Status Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Backend/RAG */}
                    <div className={`p-2 rounded-lg border ${
                      systemHealth.backend.isValid && systemHealth.rag.isValid
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium text-white">RAG System</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          systemHealth.backend.isValid && systemHealth.rag.isValid ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <span className={`text-xs ${
                          systemHealth.backend.isValid && systemHealth.rag.isValid ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {systemHealth.backend.isValid && systemHealth.rag.isValid ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* Voice */}
                    <div className={`p-2 rounded-lg border ${
                      systemHealth.voice.isValid
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium text-white">Voice Input</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          systemHealth.voice.isValid ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <span className={`text-xs ${
                          systemHealth.voice.isValid ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {systemHealth.voice.isValid ? 'Ready' : 'Blocked'}
                        </span>
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className={`p-2 rounded-lg border ${
                      systemHealth.avatar.isValid
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                        </svg>
                        <span className="text-xs font-medium text-white">Avatar</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          systemHealth.avatar.isValid ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <span className={`text-xs ${
                          systemHealth.avatar.isValid ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {systemHealth.avatar.isValid ? 'Connected' : 'Failed'}
                        </span>
                      </div>
                    </div>

                    {/* API */}
                    <div className={`p-2 rounded-lg border ${
                      systemHealth.rag.isValid
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-xs font-medium text-white">API</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          systemHealth.rag.isValid ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <span className={`text-xs ${
                          systemHealth.rag.isValid ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {systemHealth.rag.isValid ? 'Active' : 'Error'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Validation Controls */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-blue-300/70">
                      Last checked: {systemHealth.overall.timestamp.toLocaleTimeString()}
                    </div>
                    <button
                      onClick={async () => {
                        setIsValidating(true);
                        try {
                          const health = await validator.validateSystem();
                          setSystemHealth(health);
                        } catch (error) {
                          console.error('Manual validation failed:', error);
                        } finally {
                          setIsValidating(false);
                        }
                      }}
                      disabled={isValidating}
                      className="p-1 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                      title="Refresh system status"
                    >
                      <svg className={`w-3 h-3 text-blue-400 ${isValidating ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Thread ID */}
              {isInitialized && (
                <div className="text-center">
                  <h3 className="text-white font-semibold mb-2">Session ID</h3>
                  <p className="text-xs font-mono text-blue-400 truncate">
                    {threadId || 'Initializing...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {isInitialized && voiceState === 'listening' && (
          <div className="mt-8 text-center">
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                <h3 className="text-white font-semibold text-lg">Ready to Listen</h3>
              </div>
              <p className="text-blue-200 mb-4">
                I'm listening and ready to help with your business questions. Just speak naturally!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-300">
                <div>
                  <p className="font-medium text-white mb-1">Ask about:</p>
                  <p>• AI automation solutions</p>
                  <p>• Business process optimization</p>
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Services:</p>
                  <p>• Implementation consulting</p>
                  <p>• ROI analysis</p>
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Support:</p>
                  <p>• Technical guidance</p>
                  <p>• Best practices</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-8 bg-red-500/20 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-red-400 font-semibold">Error</h3>
            </div>
            <p className="text-red-200 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setVoiceState('idle');
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-12 text-center">
        <p className="text-blue-300/80 text-sm">
          Powered by Advanced RAG Technology • Secure & Private
        </p>
      </div>
    </div>
  );
}
