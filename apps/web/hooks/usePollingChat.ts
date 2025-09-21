/**
 * Polling-based Chat Hook for Codespaces
 * Replaces WebSocket with polling for better compatibility
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, ChatSession, ActRequest, ImageAttachment } from '@/types/chat';

interface UsePollingChatOptions {
  projectId: string;
  conversationId?: string;
}

export function usePollingChat({ projectId, conversationId }: UsePollingChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isConnected, setIsConnected] = useState(true); // Always connected for polling

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef(0);
  const isPollingRef = useRef(false);

  // Start polling for new messages
  const startPolling = useCallback(() => {
    if (isPollingRef.current) return;

    isPollingRef.current = true;

    const poll = async () => {
      try {
        const params = new URLSearchParams();
        if (conversationId) params.append('conversation_id', conversationId);

        const response = await fetch(`/api/chat/${projectId}/messages?${params.toString()}`);

        if (response.ok) {
          const newMessages = await response.json();

          // Only update if message count changed
          if (newMessages.length !== lastMessageCountRef.current) {
            setMessages(newMessages);
            lastMessageCountRef.current = newMessages.length;
          }
        }

        // Check session status
        const statusResponse = await fetch(`/api/chat/${projectId}/status`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.hasActiveSession) {
            setCurrentSession(statusData.session);
            setIsLoading(statusData.session.status === 'running' || statusData.session.status === 'active');
          } else {
            setCurrentSession(null);
            setIsLoading(false);
          }
        }

      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingIntervalRef.current = setInterval(poll, 1000); // Poll every second
  }, [projectId, conversationId]);

  // Stop polling
  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (conversationId) params.append('conversation_id', conversationId);

      const response = await fetch(`/api/chat/${projectId}/messages?${params.toString()}`);

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      setMessages(data);
      lastMessageCountRef.current = data.length;
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages');
    }
  }, [projectId, conversationId]);

  // Execute Chat using proxy endpoint
  const executeChat = useCallback(async (
    instruction: string,
    options?: {
      cliPreference?: string;
      fallbackEnabled?: boolean;
      images?: ImageAttachment[];
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Upload images first if any
      let preparedImages: any[] | undefined = undefined;
      if (options?.images && options.images.length > 0) {
        preparedImages = [];
        for (const img of options.images) {
          try {
            let blob: Blob | null = null;
            if (img.url && img.url.startsWith('data:')) {
              const res = await fetch(img.url);
              blob = await res.blob();
            }
            const form = new FormData();
            if (blob) {
              const filename = img.name || 'image.png';
              form.append('file', blob, filename);
            } else {
              continue;
            }
            const uploadResp = await fetch(`/api/proxy/assets/${projectId}/upload`, {
              method: 'POST',
              body: form
            });
            if (uploadResp.ok) {
              const data = await uploadResp.json();
              preparedImages.push({ path: data.absolute_path, name: data.filename });
            }
          } catch (e) {
            console.error('Image upload failed:', e);
          }
        }
      }

      // Send chat request via proxy
      const response = await fetch(`/api/chat/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          conversation_id: conversationId,
          cli_preference: options?.cliPreference,
          fallback_enabled: options?.fallbackEnabled,
          images: preparedImages,
          is_initial_prompt: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute chat');
      }

      const result = await response.json();
      setCurrentSession(result);

      // Start polling for updates
      startPolling();

      return result;
    } catch (error) {
      console.error('Failed to execute chat:', error);
      setError('Failed to execute chat');
      setIsLoading(false);
      throw error;
    }
  }, [projectId, conversationId, startPolling]);

  // Execute Act (same as chat but different semantics)
  const executeAct = useCallback(async (
    instruction: string,
    options?: {
      cliPreference?: string;
      fallbackEnabled?: boolean;
      images?: ImageAttachment[];
    }
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      // Upload images first if any
      let preparedImages: any[] | undefined = undefined;
      if (options?.images && options.images.length > 0) {
        preparedImages = [];
        for (const img of options.images) {
          try {
            let blob: Blob | null = null;
            if (img.url && img.url.startsWith('data:')) {
              const res = await fetch(img.url);
              blob = await res.blob();
            }
            const form = new FormData();
            if (blob) {
              const filename = img.name || 'image.png';
              form.append('file', blob, filename);
            } else {
              continue;
            }
            const uploadResp = await fetch(`/api/proxy/assets/${projectId}/upload`, {
              method: 'POST',
              body: form
            });
            if (uploadResp.ok) {
              const data = await uploadResp.json();
              preparedImages.push({ path: data.absolute_path, name: data.filename });
            }
          } catch (e) {
            console.error('Image upload failed:', e);
          }
        }
      }

      // Send act request via proxy
      const response = await fetch(`/api/proxy/chat/${projectId}/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          conversation_id: conversationId,
          cli_preference: options?.cliPreference,
          fallback_enabled: options?.fallbackEnabled,
          images: preparedImages,
          is_initial_prompt: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute act');
      }

      const result = await response.json();
      setCurrentSession(result);

      // Start polling for updates
      startPolling();

      return result;
    } catch (error) {
      console.error('Failed to execute act:', error);
      setError('Failed to execute act');
      setIsLoading(false);
      throw error;
    }
  }, [projectId, conversationId, startPolling]);

  // Clear messages
  const clearMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (conversationId) params.append('conversation_id', conversationId);

      const response = await fetch(
        `/api/proxy/chat/${projectId}/messages?${params.toString()}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to clear messages');

      setMessages([]);
      lastMessageCountRef.current = 0;
    } catch (error) {
      console.error('Failed to clear messages:', error);
      setError('Failed to clear messages');
    }
  }, [projectId, conversationId]);

  // Start polling on mount and when projectId changes
  useEffect(() => {
    loadMessages();
    startPolling();

    return () => {
      stopPolling();
    };
  }, [loadMessages, startPolling, stopPolling]);

  return {
    messages,
    isLoading,
    error,
    isConnected,
    currentSession,
    hasActiveRequests: isLoading, // Simplify for polling
    executeChat,
    executeAct,
    clearMessages,
    loadMessages
  };
}