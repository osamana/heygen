import { TaskMode, TaskType } from "@heygen/streaming-avatar";
import { useCallback, useState } from "react";

import { useStreamingAvatarContext, MessageSender } from "../streaming-context";

export const useTextChat = () => {
  const { avatarRef, messages, setMessages } = useStreamingAvatarContext();
  const [threadId, setThreadId] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!avatarRef.current) {
        console.warn('Avatar not available for text chat');
        return;
      }
      
      try {
        console.log('💬 Sending message to agent:', message);
        
        // FIRST: Add user message to chat immediately
        const userMessage = {
          id: `user-${Date.now()}`,
          sender: MessageSender.CLIENT,
          content: message.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        
        // SECOND: Send to your agent backend
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            message: message.trim(),
            thread_id: threadId 
          })
        });
        
        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Agent request failed:', response.status, errorText);
          throw new Error(`Agent request failed: ${response.status} - ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('📦 Agent response:', responseData);
        
        const { reply, thread_id: newThreadId, actions_performed } = responseData;
        
        // THIRD: Add agent response to chat
        const agentMessage = {
          id: `agent-${Date.now()}`,
          sender: MessageSender.AVATAR,
          content: reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMessage]);
        
        // Store thread ID for conversation continuity
        if (newThreadId && newThreadId !== threadId) {
          setThreadId(newThreadId);
          console.log('🧵 Thread ID updated:', newThreadId);
        }
        
        // Log any actions performed
        if (actions_performed && actions_performed.length > 0) {
          console.log('🔧 Actions performed:', actions_performed);
        }
        
        // FOURTH: Make avatar speak the response (but DON'T let it add to chat again)
        console.log('🤖 FORCING avatar to speak RAG response:', reply);
        console.log('🤖 RAG response length:', reply.length, 'characters');
        console.log('🤖 RAG response preview:', reply.substring(0, 100) + '...');
        
        // NUCLEAR OPTION: This avatar has built-in AI that ignores our commands
        // We need to be more aggressive
        
        console.log('🎯 Using aggressive override to ensure RAG response...');
        
        // Wait a moment to let any avatar AI response start
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to interrupt any ongoing avatar speech
        try {
          await avatarRef.current.interrupt();
          console.log('✅ Avatar interrupted');
        } catch (error) {
          console.log('⚠️ Interrupt not available:', error);
        }
        
        // Force our RAG response using REPEAT task type
        try {
          await avatarRef.current.speak({
            text: reply,
            taskType: TaskType.REPEAT,
            taskMode: TaskMode.SYNC,
          });
          console.log('✅ RAG response sent successfully');
        } catch (error) {
          console.error('❌ REPEAT with override failed:', error);
          
          // Last resort: Try basic speak
          try {
            console.log('🔄 Last resort: Basic speak command...');
            await avatarRef.current.speak({
              text: reply,
              taskType: TaskType.TALK,
              taskMode: TaskMode.ASYNC,
            });
            console.log('✅ Basic speak sent');
          } catch (finalError) {
            console.error('❌ All speak methods failed:', finalError);
          }
        }
        
      } catch (error) {
        console.error('❌ Detailed error with agent request:', error);
        
        // Add error message to chat
        const errorMessage = {
          id: `error-${Date.now()}`,
          sender: MessageSender.AVATAR,
          content: "I'm having trouble connecting to my systems right now. Please try again or contact us at (555) 987-6543.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        
        // Also make avatar speak the error
        avatarRef.current.speak({
          text: errorMessage.content,
          taskType: TaskType.TALK,
          taskMode: TaskMode.ASYNC,
        });
      }
    },
    [avatarRef, threadId, setMessages],
  );

  const sendMessageSync = useCallback(
    async (message: string) => {
      if (!avatarRef.current) {
        console.warn('Avatar not available for sync text chat');
        return;
      }

      try {
        console.log('💬 Sending sync message to agent:', message);
        
        // Add user message to chat
        const userMessage = {
          id: `user-${Date.now()}`,
          sender: MessageSender.CLIENT,
          content: message.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        
        // Send to your agent backend
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            message: message.trim(),
            thread_id: threadId 
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Sync agent request failed:', response.status, errorText);
          throw new Error(`Agent request failed: ${response.status} - ${errorText}`);
        }
        
        const { reply, thread_id: newThreadId, actions_performed } = await response.json();
        
        // Add agent response to chat
        const agentMessage = {
          id: `agent-${Date.now()}`,
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
          console.log('🔧 Actions performed:', actions_performed);
        }
        
        // Make avatar speak the agent's response synchronously
        return await avatarRef.current?.speak({
          text: reply,
          taskType: TaskType.TALK,
          taskMode: TaskMode.SYNC,
        });
        
      } catch (error) {
        console.error('❌ Error with sync agent request:', error);
        
        const errorMessage = {
          id: `error-${Date.now()}`,
          sender: MessageSender.AVATAR,
          content: "I'm having trouble processing your request right now. Please try again or contact us at (555) 987-6543.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        
        // Fallback response
        return await avatarRef.current?.speak({
          text: errorMessage.content,
          taskType: TaskType.TALK,
          taskMode: TaskMode.SYNC,
        });
      }
    },
    [avatarRef, threadId, setMessages],
  );

  const repeatMessage = useCallback(
    (message: string) => {
      if (!avatarRef.current) {
        console.warn('Avatar not available for repeat');
        return;
      }

      console.log('🔄 Repeating message:', message);
      return avatarRef.current?.speak({
        text: message,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.ASYNC,
      });
    },
    [avatarRef],
  );

  const repeatMessageSync = useCallback(
    async (message: string) => {
      if (!avatarRef.current) {
        console.warn('Avatar not available for sync repeat');
        return;
      }

      console.log('🔄 Repeating sync message:', message);
      return await avatarRef.current?.speak({
        text: message,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC,
      });
    },
    [avatarRef],
  );

  return {
    sendMessage,
    sendMessageSync,
    repeatMessage,
    repeatMessageSync,
    threadId,
  };
};