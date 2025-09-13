import { useCallback } from "react";

import { useStreamingAvatarContext } from "../streaming-context";

export const useVoiceChat = () => {
  const {
    avatarRef,
    isMuted,
    setIsMuted,
    isVoiceChatActive,
    setIsVoiceChatActive,
    isVoiceChatLoading,
    setIsVoiceChatLoading,
  } = useStreamingAvatarContext();

  const startVoiceChat = useCallback(
    async (isInputAudioMuted?: boolean) => {
      if (!avatarRef.current) {
        console.warn('Avatar not available for voice chat');
        return;
      }
      
      console.log('🎤 Starting voice chat with microphone access...');
      setIsVoiceChatLoading(true);
      
      try {
        // Request microphone permission first
        console.log('🎤 Requesting microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          } 
        });
        console.log('✅ Microphone permission granted');
        
        // Start voice chat with proper configuration
        console.log('🎤 Starting voice chat with enhanced config...');
        await avatarRef.current?.startVoiceChat({
          isInputAudioMuted: isInputAudioMuted || false,
          // Enable voice activity detection
          enableVAD: true,
          // Set reasonable voice detection thresholds
          vadThreshold: 0.3, // Lower threshold for better detection
          // Enable real-time audio processing
          enableRealTimeAudio: true,
          // Enable speech-to-text
          enableSTT: true,
          // Set STT provider
          sttProvider: 'Deepgram',
        });
        
        setIsVoiceChatLoading(false);
        setIsVoiceChatActive(true);
        setIsMuted(!!isInputAudioMuted);
        console.log('✅ Voice chat started - microphone active and listening');
        
        // Clean up the test stream
        stream.getTracks().forEach(track => track.stop());
        
      } catch (error) {
        console.error('❌ Failed to start voice chat:', error);
        if (error.name === 'NotAllowedError') {
          console.error('❌ Microphone permission denied by user');
          alert('Please allow microphone access for voice chat to work. Check your browser settings and try again.');
        } else if (error.name === 'NotFoundError') {
          console.error('❌ No microphone found');
          alert('No microphone detected. Please connect a microphone and try again.');
        }
        setIsVoiceChatLoading(false);
        throw error;
      }
    },
    [avatarRef, setIsMuted, setIsVoiceChatActive, setIsVoiceChatLoading],
  );

  const stopVoiceChat = useCallback(() => {
    if (!avatarRef.current) {
      console.warn('Avatar not available to stop voice chat');
      return;
    }
    
    console.log('🎤 Stopping voice chat...');
    try {
      avatarRef.current?.closeVoiceChat();
      setIsVoiceChatActive(false);
      setIsMuted(true);
      console.log('✅ Voice chat stopped');
    } catch (error) {
      console.error('❌ Failed to stop voice chat:', error);
    }
  }, [avatarRef, setIsMuted, setIsVoiceChatActive]);

  const muteInputAudio = useCallback(() => {
    if (!avatarRef.current) {
      console.warn('Avatar not available to mute audio');
      return;
    }
    
    console.log('🔇 Muting input audio');
    avatarRef.current?.muteInputAudio();
    setIsMuted(true);
  }, [avatarRef, setIsMuted]);

  const unmuteInputAudio = useCallback(() => {
    if (!avatarRef.current) {
      console.warn('Avatar not available to unmute audio');
      return;
    }
    
    console.log('🔊 Unmuting input audio');
    avatarRef.current?.unmuteInputAudio();
    setIsMuted(false);
  }, [avatarRef, setIsMuted]);

  return {
    startVoiceChat,
    stopVoiceChat,
    muteInputAudio,
    unmuteInputAudio,
    isMuted,
    isVoiceChatActive,
    isVoiceChatLoading,
  };
};
