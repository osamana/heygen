import StreamingAvatar, {
  ConnectionQuality,
  StartAvatarRequest,
  StreamingEvents,
} from "@heygen/streaming-avatar";
import { useCallback } from "react";

import {
  StreamingAvatarSessionState,
  useStreamingAvatarContext,
} from "../streaming-context";

export const useStreamingAvatarSession = () => {
  const {
    avatarRef,
    basePath,
    sessionState,
    setSessionState,
    stream,
    setStream,
    setIsListening,
    setIsUserTalking,
    setIsAvatarTalking,
    setConnectionQuality,
    handleUserTalkingMessage,
    handleStreamingTalkingMessage,
    handleEndMessage,
    clearMessages,
  } = useStreamingAvatarContext();

  const init = useCallback(
    (token: string) => {
      avatarRef.current = new StreamingAvatar({
        token,
        basePath: basePath || 'https://api.heygen.com',
      });

      return avatarRef.current;
    },
    [basePath, avatarRef],
  );

  const handleStream = useCallback(
    ({ detail }: { detail: MediaStream }) => {
      console.log('Stream ready');
      setStream(detail);
      setSessionState(StreamingAvatarSessionState.CONNECTED);
    },
    [setSessionState, setStream],
  );

  const stop = useCallback(async () => {
    console.log('Stopping session...');
    
    if (avatarRef.current) {
      avatarRef.current.off(StreamingEvents.STREAM_READY, handleStream);
      avatarRef.current.off(StreamingEvents.STREAM_DISCONNECTED, stop);
      
      try {
        await avatarRef.current.stopAvatar();
      } catch (error) {
        console.error('Error stopping session:', error);
      }
    }
    
    clearMessages();
    setIsListening(false);
    setIsUserTalking(false);
    setIsAvatarTalking(false);
    setStream(null);
    setSessionState(StreamingAvatarSessionState.INACTIVE);
  }, [
    handleStream,
    setSessionState,
    setStream,
    avatarRef,
    setIsListening,
    clearMessages,
    setIsUserTalking,
    setIsAvatarTalking,
  ]);

  const start = useCallback(
    async (config: StartAvatarRequest, token?: string, enableAutoMessageCapture: boolean = false) => {
      if (sessionState !== StreamingAvatarSessionState.INACTIVE) {
        throw new Error("There is already an active session");
      }

      if (!avatarRef.current) {
        if (!token) {
          throw new Error("Token is required");
        }
        init(token);
      }

      if (!avatarRef.current) {
        throw new Error("Avatar is not initialized");
      }

      console.log('Starting session with config:', config);
      console.log('Auto message capture:', enableAutoMessageCapture);
      setSessionState(StreamingAvatarSessionState.CONNECTING);
      
      // Set up basic event listeners
      avatarRef.current.on(StreamingEvents.STREAM_READY, handleStream);
      avatarRef.current.on(StreamingEvents.STREAM_DISCONNECTED, stop);
      avatarRef.current.on(
        StreamingEvents.CONNECTION_QUALITY_CHANGED,
        ({ detail }: { detail: ConnectionQuality }) =>
          setConnectionQuality(detail),
      );
      avatarRef.current.on(StreamingEvents.USER_START, () => {
        console.log('User started talking');
        setIsUserTalking(true);
      });
      avatarRef.current.on(StreamingEvents.USER_STOP, () => {
        console.log('User stopped talking');
        setIsUserTalking(false);
      });
      avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, () => {
        console.log('Representative started talking');
        setIsAvatarTalking(true);
      });
      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log('Representative stopped talking');
        setIsAvatarTalking(false);
      });

      // CRITICAL: Disable avatar's built-in conversational AI but allow manual voice capture
      console.log('CRITICAL: Avatar AI disabled - manual voice capture will be added for voice chat');
      
      // We NEVER add these listeners that would enable avatar conversation:
      // - NO USER_TALKING_MESSAGE (prevents avatar from "hearing" and responding automatically)
      // - NO AVATAR_TALKING_MESSAGE (prevents capturing avatar's own generated responses for conversation)
      // - NO AVATAR_END_MESSAGE (prevents conversation flow)
      
      // HOWEVER: We DO need USER_END_MESSAGE for voice chat (added manually by voice chat agent)
      // This is handled in useVoiceChatAgent.setupVoiceListener()
      
      // DEBUG: Add listener to capture what avatar is actually saying
      avatarRef.current.on(StreamingEvents.AVATAR_TALKING_MESSAGE, ({ detail }: any) => {
        console.log('🚨 DEBUG: Avatar is speaking:', detail.message);
        console.log('🚨 This should ONLY be our RAG responses, nothing else!');
      });

      try {
        console.log('Creating session with config:', JSON.stringify(config, null, 2));
        await avatarRef.current.createStartAvatar(config);
        console.log('Session started successfully');
      } catch (error) {
        console.error('Failed to start session:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setSessionState(StreamingAvatarSessionState.INACTIVE);
        throw error;
      }

      return avatarRef.current;
    },
    [
      init,
      handleStream,
      stop,
      setSessionState,
      avatarRef,
      sessionState,
      setConnectionQuality,
      setIsUserTalking,
      handleUserTalkingMessage,
      handleStreamingTalkingMessage,
      handleEndMessage,
      setIsAvatarTalking,
    ],
  );

  return {
    avatarRef,
    sessionState,
    stream,
    initAvatar: init,
    startAvatar: start,
    stopAvatar: stop,
  };
};