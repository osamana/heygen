'use client';

import { useState, useEffect, useCallback } from 'react';
import { StreamingAvatarProvider } from '@/lib/streaming-context';
import VoiceOnlyInterface from '@/components/VoiceOnlyInterface';

export default function VoicePage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Preload any necessary resources
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-400 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Voice Assistant</h2>
          <p className="text-blue-200">Preparing your AI business consultant...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamingAvatarProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <VoiceOnlyInterface />
      </div>
    </StreamingAvatarProvider>
  );
}
