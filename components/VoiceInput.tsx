"use client";

import { useState } from "react";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface VoiceInputProps {
  onTranscript?: (text: string) => void;
  onStatusChange?: (status: "idle" | "listening" | "processing" | "searching") => void;
}

export function VoiceInput({ onTranscript, onStatusChange }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Create session when voice starts
  const createSession = useMutation(api.voiceShopper.createSession);

  const handleSessionStart = async () => {
    setIsConnecting(true);
    onStatusChange?.("listening");

    try {
      // Create a new voice session
      const session = await createSession();

      // TODO: Connect to Pipecat WebSocket server
      // For now, this is a placeholder for the real implementation

      setIsListening(true);
      setIsConnecting(false);

      // Demo: Simulate speech recognition after 2 seconds
      setTimeout(() => {
        const demoTranscript = "I'm looking for wireless headphones under $150";
        onTranscript?.(demoTranscript);
        onStatusChange?.("processing");

        // Auto-end session after demo
        setTimeout(() => {
          handleSessionEnd();
        }, 1000);
      }, 2000);
    } catch (error) {
      console.error("Failed to create voice session:", error);
      setIsConnecting(false);
      onStatusChange?.("idle");
    }
  };

  const handleSessionEnd = () => {
    setIsListening(false);
    onStatusChange?.("idle");

    // TODO: Close WebSocket connection
    // For now, this is a placeholder
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <VoiceInputButton
        onSessionStart={handleSessionStart}
        onSessionEnd={handleSessionEnd}
        isConnecting={isConnecting}
        isActive={isListening}
      />
      <p className="mt-12 text-center text-sm text-muted-foreground max-w-md">
        Tap the microphone to start speaking. Tell me what you're looking for and I'll help you find it.
      </p>
    </div>
  );
}
