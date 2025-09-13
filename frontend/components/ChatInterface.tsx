'use client';

import { useState, useRef, useEffect } from 'react';
import { useStreamingAvatarContext, StreamingAvatarSessionState, MessageSender } from '@/lib/streaming-context';
import { useTextChat } from '@/lib/hooks/useTextChat';

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => void;
}

export default function ChatInterface({ 
  onSendMessage 
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { messages, sessionState, isAvatarTalking } = useStreamingAvatarContext();
  const { sendMessage } = useTextChat();
  
  const isConnected = sessionState === StreamingAvatarSessionState.CONNECTED;
  const isLoading = isAvatarTalking;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && isConnected) {
      // Use the streaming text chat
      sendMessage(input.trim());
      
      // Also call the optional callback
      if (onSendMessage) {
        onSendMessage(input.trim());
      }
      
      setInput('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
      {/* Header */}
      <div className="px-6 py-5 border-b border-secondary-200/50 bg-gradient-to-r from-primary-50 to-blue-50 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900">AI Business Consultant</h2>
            <p className="text-sm text-secondary-600">Ready to help optimize your business processes</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-r from-primary-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-800 mb-2">Welcome to Zuccess AI</h3>
            <p className="text-secondary-600 mb-6">I'm here to help you explore AI automation solutions for your business.</p>
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 max-w-md mx-auto">
              <p className="text-sm text-secondary-700 font-medium mb-2">Try asking me about:</p>
              <div className="text-sm text-secondary-600 space-y-1">
                <p>• "How can AI automate my business processes?"</p>
                <p>• "What's the ROI of AI automation?"</p>
                <p>• "Tell me about your services"</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex animate-slide-up ${
              message.sender === MessageSender.CLIENT ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className={`flex items-start space-x-3 max-w-[85%] ${
              message.sender === MessageSender.CLIENT ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.sender === MessageSender.CLIENT
                  ? 'bg-gradient-to-r from-primary-500 to-primary-700'
                  : 'bg-gradient-to-r from-secondary-400 to-secondary-600'
              }`}>
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  {message.sender === MessageSender.CLIENT ? (
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  ) : (
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  )}
                </svg>
              </div>
              
              {/* Message bubble */}
              <div
                className={`rounded-2xl px-5 py-3 shadow-md ${
                  message.sender === MessageSender.CLIENT
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white'
                    : 'bg-white border border-secondary-200 text-secondary-800'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                
                <p className={`text-xs mt-2 ${
                  message.sender === MessageSender.CLIENT ? 'text-primary-100' : 'text-secondary-500'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start animate-slide-up">
            <div className="flex items-start space-x-3 max-w-[85%]">
              <div className="w-8 h-8 bg-gradient-to-r from-secondary-400 to-secondary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <div className="bg-white border border-secondary-200 rounded-2xl px-5 py-3 shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-secondary-600 font-medium">
                    {isLoading ? 'AI is thinking...' : 'Processing...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-secondary-200/50 p-6 bg-gradient-to-r from-secondary-50/50 to-primary-50/30 rounded-b-2xl">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                !isConnected 
                  ? "Connecting to AI agent..." 
                  : "Ask me about AI automation for your business..."
              }
              disabled={!isConnected || isLoading}
              className="w-full px-5 py-3 bg-white border-2 border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-secondary-100 disabled:text-secondary-500 disabled:border-secondary-200 transition-all duration-200 shadow-sm"
            />
            {input.trim() && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!input.trim() || !isConnected || isLoading}
            className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:from-secondary-300 disabled:to-secondary-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none font-semibold"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
            Send
          </button>
        </form>
        
        {!isConnected && (
          <div className="mt-3 flex items-center gap-2 text-secondary-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
            <p className="text-sm font-medium">
              Connecting to AI business consultant...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
