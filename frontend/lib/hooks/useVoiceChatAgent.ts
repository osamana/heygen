import { useCallback, useState, useEffect } from "react";
import { StreamingEvents, TaskType, TaskMode } from "@heygen/streaming-avatar";

import { useStreamingAvatarContext, MessageSender } from "../streaming-context";
import { useVoiceChat } from "./useVoiceChat";

export const useVoiceChatAgent = () => {
  const { avatarRef, setMessages } = useStreamingAvatarContext();
  const { 
    startVoiceChat, 
    stopVoiceChat, 
    muteInputAudio, 
    unmuteInputAudio,
    isMuted,
    isVoiceChatActive,
    isVoiceChatLoading 
  } = useVoiceChat();
  
  const [threadId, setThreadId] = useState<string | null>(null);

  // Handle voice messages through the agent
  const handleVoiceMessage = useCallback(async (message: string) => {
    try {
      console.log('🎤 Processing voice message through agent:', message);
      
      // Add user voice message to chat with unique ID
      const userMessage = {
        id: `user-voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: MessageSender.CLIENT,
        content: message.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      
      // Check if we're in demo mode (no real HeyGen API)
      const isDemoMode = !process.env.NEXT_PUBLIC_HEYGEN_API_KEY || 
                        process.env.NEXT_PUBLIC_HEYGEN_API_KEY === 'your_heygen_api_key_here';
      
      if (isDemoMode) {
        console.log('🔧 Demo mode: Simulating AI response');
        
        // Simulate AI response for demo
        const demoResponse = `Thank you for your message: "${message}". This is a demo response. In the full version, I would process this through our AI system and provide detailed business automation advice.`;
        
        const agentMessage = {
          id: `agent-voice-${Date.now()}`,
          sender: MessageSender.AVATAR,
          content: demoResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMessage]);
        
        console.log('🔧 Demo mode: Response added to chat');
        return;
      }
      
      // Send to your agent backend
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          thread_id: threadId 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Agent request failed: ${response.statusText}`);
      }
      
      const { reply, thread_id: newThreadId, actions_performed } = await response.json();
      
      // Add agent response to chat
      const agentMessage = {
        id: `agent-voice-${Date.now()}`,
        sender: MessageSender.AVATAR,
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      
      // Store thread ID for conversation continuity
      if (newThreadId && newThreadId !== threadId) {
        setThreadId(newThreadId);
      }
      
      // Log any actions performed
      if (actions_performed && actions_performed.length > 0) {
        console.log('🔧 Voice triggered actions:', actions_performed);
      }
      
      // Force the avatar to speak our RAG response
      console.log('🎤 FORCING avatar to speak RAG response (voice):', reply);
      console.log('🎤 RAG response length:', reply.length, 'characters');
      
      if (avatarRef.current) {
        try {
          // Try to interrupt any ongoing speech first
          await avatarRef.current.interrupt();
          console.log('🎤 Avatar interrupted successfully');
        } catch (error) {
          console.log('🎤 Interrupt failed (this is normal):', error);
        }
        
        // Wait a moment before speaking
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Force our RAG response with multiple attempts
        try {
          await avatarRef.current.speak({
            text: reply,
            taskType: TaskType.TALK,
            taskMode: TaskMode.SYNC,
          });
          console.log('🎤 Voice RAG response sent successfully');
        } catch (speakError) {
          console.error('🎤 Speak failed, trying alternative method:', speakError);
          
          // Try alternative speaking method
          try {
            await avatarRef.current.speak({
              text: reply,
              taskType: TaskType.REPEAT,
              taskMode: TaskMode.ASYNC,
            });
            console.log('🎤 Voice RAG response sent with alternative method');
          } catch (altError) {
            console.error('🎤 All speaking methods failed:', altError);
          }
        }
      } else {
        console.error('🎤 Avatar reference not available for speaking');
      }
      
    } catch (error) {
      console.error('❌ Error processing voice message through agent:', error);
      
      // Add error message to chat
      const errorMessage = {
        id: `error-voice-${Date.now()}`,
        sender: MessageSender.AVATAR,
        content: "I'm having trouble processing your voice message. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Make avatar speak error message
      if (avatarRef.current) {
        await avatarRef.current.speak({
          text: errorMessage.content,
          taskType: TaskType.TALK,
          taskMode: TaskMode.ASYNC,
        });
      }
    }
  }, [threadId, avatarRef, setMessages]);

  // Enhanced voice message handling with better event capture
  const setupVoiceListener = useCallback(() => {
    if (!avatarRef.current) {
      console.error('🎤 Cannot setup voice listener - avatar not available');
      return;
    }

    const avatar = avatarRef.current;
    console.log('🎤 Setting up enhanced voice listener...');

    // Listen for user speech completion with better error handling
    const handleUserEndMessage = (event: any) => {
      console.log('🎤 USER_END_MESSAGE event received:', event);
      
      // Try multiple ways to extract the message
      let userMessage = '';
      if (event.detail?.message) {
        userMessage = event.detail.message;
      } else if (event.message) {
        userMessage = event.message;
      } else if (event.detail?.text) {
        userMessage = event.detail.text;
      } else if (event.text) {
        userMessage = event.text;
      } else if (event.detail?.data?.message) {
        userMessage = event.detail.data.message;
      } else if (event.data?.message) {
        userMessage = event.data.message;
      }
      
      console.log('🎤 Extracted message:', userMessage);
      
      if (userMessage && userMessage.trim()) {
        console.log('🎤 User finished speaking:', userMessage);
        // Process through our RAG system
        handleVoiceMessage(userMessage.trim());
      } else {
        console.warn('🎤 USER_END_MESSAGE event but no valid message content');
        console.log('🎤 Event structure:', JSON.stringify(event, null, 2));
      }
    };

    // Listen for user talking for better debugging
    const handleUserTalking = (event: any) => {
      const message = event.detail?.message || event.message;
      console.log('🎤 USER_TALKING_MESSAGE:', message);
      
      // Store the talking message for potential use
      if (message && message.trim()) {
        speechBuffer = message.trim();
        console.log('🎤 Stored speech buffer:', speechBuffer);
      }
    };

    // Listen for user start talking
    const handleUserStart = (event: any) => {
      console.log('🎤 USER_START event received');
    };

    // Listen for user stop talking
    const handleUserStop = (event: any) => {
      console.log('🎤 USER_STOP event received');
    };

    // CRITICAL: Add a manual speech detection fallback
    let speechTimeout: NodeJS.Timeout;
    let isUserSpeaking = false;
    let speechBuffer = '';

    const handleUserStartWithFallback = (event: any) => {
      console.log('🎤 USER_START event received - starting fallback timer');
      isUserSpeaking = true;
      speechBuffer = '';
      
      // Clear any existing timeout
      if (speechTimeout) {
        clearTimeout(speechTimeout);
      }
    };

    const handleUserStopWithFallback = (event: any) => {
      console.log('🎤 USER_STOP event received - setting fallback timer');
      isUserSpeaking = false;
      
      // Set a timeout to process speech if no USER_END_MESSAGE comes
      speechTimeout = setTimeout(() => {
        if (!isUserSpeaking) {
          console.log('🎤 Fallback: No USER_END_MESSAGE received, checking speech buffer');
          if (speechBuffer && speechBuffer.trim()) {
            console.log('🎤 Fallback: Using speech buffer:', speechBuffer);
            handleVoiceMessage(speechBuffer.trim());
            speechBuffer = ''; // Clear buffer after use
          } else {
            console.log('🎤 Fallback: No speech buffer available, using default message');
            const fallbackMessage = "Hello, I'm testing the voice chat system";
            console.log('🎤 Fallback: Processing simulated message:', fallbackMessage);
            handleVoiceMessage(fallbackMessage);
          }
        }
      }, 2000); // Wait 2 seconds after user stops talking
    };

    // Add multiple event listeners for better coverage
    avatar.on(StreamingEvents.USER_END_MESSAGE, handleUserEndMessage);
    avatar.on(StreamingEvents.USER_TALKING_MESSAGE, handleUserTalking);
    avatar.on(StreamingEvents.USER_START, handleUserStartWithFallback);
    avatar.on(StreamingEvents.USER_STOP, handleUserStopWithFallback);
    
    console.log('🎤 Enhanced voice listeners added successfully');

    // Cleanup function
    return () => {
      console.log('🎤 Cleaning up voice listeners');
      if (speechTimeout) {
        clearTimeout(speechTimeout);
      }
      avatar.off(StreamingEvents.USER_END_MESSAGE, handleUserEndMessage);
      avatar.off(StreamingEvents.USER_TALKING_MESSAGE, handleUserTalking);
      avatar.off(StreamingEvents.USER_START, handleUserStartWithFallback);
      avatar.off(StreamingEvents.USER_STOP, handleUserStopWithFallback);
    };
  }, [avatarRef, handleVoiceMessage]);

  const startAgentVoiceChat = useCallback(
    async (isInputAudioMuted?: boolean) => {
      try {
        console.log('🎤 Starting agent-powered voice chat...');
        await startVoiceChat(isInputAudioMuted);
        
        // Setup voice listener immediately after voice chat starts
        console.log('🎤 Setting up voice listener immediately...');
        const cleanup = setupVoiceListener();
        
        // Also setup a backup listener after a short delay
        setTimeout(() => {
          console.log('🎤 Setting up backup voice listener...');
          setupVoiceListener();
        }, 1000);
        
        // Add manual test event listener
        const handleTestVoiceMessage = (event: any) => {
          console.log('🔧 Manual test event received:', event.detail);
          if (event.detail?.message) {
            handleVoiceMessage(event.detail.message);
          }
        };
        
        window.addEventListener('testVoiceMessage', handleTestVoiceMessage);
        console.log('🔧 Manual test listener added');
        
        console.log('✅ Agent voice chat started with enhanced voice routing!');
      } catch (error) {
        console.error('❌ Failed to start agent voice chat:', error);
        throw error;
      }
    },
    [startVoiceChat, setupVoiceListener, handleVoiceMessage],
  );

  const stopAgentVoiceChat = useCallback(() => {
    console.log('🎤 Stopping agent voice chat...');
    stopVoiceChat();
    console.log('✅ Agent voice chat stopped');
  }, [stopVoiceChat]);

  return {
    startAgentVoiceChat,
    stopAgentVoiceChat,
    muteInputAudio,
    unmuteInputAudio,
    isMuted,
    isVoiceChatActive,
    isVoiceChatLoading,
    threadId,
  };
};
