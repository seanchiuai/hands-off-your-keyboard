"use client";

import { useRef, useCallback, useEffect } from "react";

interface WebSocketMessage {
  type: "audio" | "text" | "status" | "error" | "function_call";
  data: any;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onAudioData?: (audioData: ArrayBuffer) => void;
}

/**
 * Hook for managing WebSocket connection to Pipecat voice agent
 */
export function useWebSocketConnection(options: UseWebSocketOptions) {
  const { url, onMessage, onOpen, onClose, onError, onAudioData } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WebSocket] Connected to voice agent");
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          // Binary audio data
          event.data.arrayBuffer().then((buffer) => {
            onAudioData?.(buffer);
          });
        } else if (typeof event.data === "string") {
          // JSON message
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            onMessage?.(message);
          } catch (error) {
            console.error("[WebSocket] Failed to parse message:", error);
          }
        }
      };

      ws.onclose = () => {
        console.log("[WebSocket] Connection closed");
        onClose?.();

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error("[WebSocket] Max reconnection attempts reached");
        }
      };

      ws.onerror = (error) => {
        // WebSocket errors are typically empty Event objects with little useful info
        // Don't log here - let the onError callback handle user-facing notifications
        onError?.(error);
      };
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      onError?.(error as Event);
    }
  }, [url, onMessage, onOpen, onClose, onError, onAudioData]);

  /**
   * Send audio data to server
   */
  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioData);
    }
  }, []);

  /**
   * Send JSON message to server
   */
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendAudio,
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}

