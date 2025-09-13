'use client';

import React, { forwardRef, useEffect } from "react";
import { ConnectionQuality } from "@heygen/streaming-avatar";

import { useStreamingAvatarContext, StreamingAvatarSessionState } from "../lib/streaming-context";

interface AvatarVideoProps {
  onStopAvatar?: () => void;
}

export const AvatarVideo = forwardRef<HTMLVideoElement, AvatarVideoProps>(
  ({ onStopAvatar }, ref) => {
    const { 
      sessionState, 
      connectionQuality,
      isAvatarTalking,
      isUserTalking,
      stream
    } = useStreamingAvatarContext();

    const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;

    // Set up the video stream when available
    useEffect(() => {
      if (stream && ref && typeof ref !== 'function') {
        const videoElement = ref.current;
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.onloadedmetadata = () => {
            videoElement.play().catch(console.error);
          };
        }
      }
    }, [stream, ref]);

    const getStatusText = () => {
      if (!isLoaded) return 'Connecting...';
      if (isAvatarTalking) return 'Speaking';
      if (isUserTalking) return 'Listening';
      return 'Online';
    };

    const getStatusColor = () => {
      if (!isLoaded) return 'text-yellow-600';
      if (isAvatarTalking) return 'text-blue-600';
      if (isUserTalking) return 'text-green-600';
      return 'text-gray-600';
    };

    return (
      <div className="relative w-full h-full bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 rounded-xl overflow-hidden shadow-inner">
        {/* Connection Quality Indicator */}
        {connectionQuality !== ConnectionQuality.UNKNOWN && (
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm text-white rounded-lg px-4 py-2 text-sm font-medium shadow-lg z-10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Connection: {connectionQuality}
            </div>
          </div>
        )}
        
        {/* Control Panel */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {/* Voice Status Indicator */}
          {isLoaded && (
            <div className={`px-3 py-2 rounded-lg text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-300 ${
              isAvatarTalking 
                ? 'bg-blue-500/90 text-white animate-pulse' 
                : isUserTalking 
                ? 'bg-green-500/90 text-white animate-pulse'
                : 'bg-white/90 text-secondary-700'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isAvatarTalking ? 'bg-white animate-pulse' : 
                  isUserTalking ? 'bg-white animate-pulse' : 'bg-secondary-400'
                }`} />
                {isAvatarTalking ? 'Speaking' : isUserTalking ? 'Listening' : 'Ready'}
              </div>
            </div>
          )}
          
          {/* Stop Button */}
          {isLoaded && onStopAvatar && (
            <button
              className="p-3 bg-red-500/90 hover:bg-red-600 text-white rounded-lg transition-all duration-200 shadow-lg backdrop-blur-sm hover:scale-105 transform"
              onClick={onStopAvatar}
              title="End Session"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Video Element */}
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover rounded-xl"
          style={{ 
            filter: isLoaded ? 'none' : 'blur(2px)',
            transition: 'filter 0.3s ease-in-out'
          }}
        >
          <track kind="captions" />
        </video>

        {/* Enhanced Status Overlay */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full shadow-lg ${
                  isLoaded ? 'bg-green-500 animate-pulse-slow' : 'bg-amber-500 animate-pulse'
                }`} />
                <div>
                  <span className={`text-sm font-semibold ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                  <p className="text-xs text-secondary-500 mt-0.5">
                    {isLoaded ? 'AI Business Consultant Active' : 'Initializing AI Agent'}
                  </p>
                </div>
              </div>
              
              {isLoaded && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                  <span className="text-xs font-medium text-secondary-600">LIVE</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State - Simple and Clean */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50">
            <div className="text-center">
              {/* Simple spinner */}
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
              
              {/* Simple text */}
              <p className="text-secondary-600 font-medium">
                {sessionState === StreamingAvatarSessionState.CONNECTING 
                  ? 'Connecting...' 
                  : 'Initializing...'}
              </p>
            </div>
          </div>
        )}

        {/* Subtle gradient overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/5 pointer-events-none rounded-xl"></div>
      </div>
    );
  }
);

AvatarVideo.displayName = "AvatarVideo";

export default AvatarVideo;
