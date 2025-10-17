"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onSessionStart: () => void;
  onSessionEnd: () => void;
  isConnecting?: boolean;
  isActive?: boolean;
  className?: string;
}

/**
 * Voice Input Button Component
 * Controls voice session (start/stop) with visual feedback
 */
export function VoiceInputButton({
  onSessionStart,
  onSessionEnd,
  isConnecting = false,
  isActive = false,
  className,
}: VoiceInputButtonProps) {
  const [isPulsing, setIsPulsing] = useState(false);

  // Create pulsing animation when active
  useEffect(() => {
    if (isActive) {
      setIsPulsing(true);
    } else {
      setIsPulsing(false);
    }
  }, [isActive]);

  const handleClick = () => {
    if (isConnecting) return;

    if (isActive) {
      onSessionEnd();
    } else {
      onSessionStart();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing ring animation when active */}
      {isPulsing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-24 rounded-full bg-red-500/20 animate-ping" />
          <div className="absolute h-20 w-20 rounded-full bg-red-500/30 animate-pulse" />
        </div>
      )}

      {/* Main button */}
      <Button
        onClick={handleClick}
        disabled={isConnecting}
        size="lg"
        className={cn(
          "relative h-16 w-16 rounded-full transition-all duration-300",
          isActive
            ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50"
            : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/50",
          isConnecting && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {isConnecting ? (
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        ) : isActive ? (
          <MicOff className="h-6 w-6 text-white" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Status text */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <p className="text-sm font-medium text-muted-foreground">
          {isConnecting
            ? "Connecting..."
            : isActive
            ? "Listening..."
            : "Click to start"}
        </p>
      </div>
    </div>
  );
}
