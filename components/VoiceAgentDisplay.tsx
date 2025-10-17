"use client";

import { useEffect, useRef } from "react";
import { Bot, User, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConversationMessage {
  speaker: "user" | "agent" | "system";
  text: string;
  timestamp: number;
}

interface VoiceAgentDisplayProps {
  messages: ConversationMessage[];
  isAgentSpeaking?: boolean;
  agentStatus?: "idle" | "listening" | "thinking" | "speaking" | "searching";
  className?: string;
}

/**
 * Voice Agent Display Component
 * Shows conversation history and agent status
 */
export function VoiceAgentDisplay({
  messages,
  isAgentSpeaking = false,
  agentStatus = "idle",
  className,
}: VoiceAgentDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getStatusBadge = () => {
    const statusConfig = {
      idle: { label: "Ready", variant: "secondary" as const },
      listening: { label: "Listening", variant: "default" as const },
      thinking: { label: "Thinking", variant: "default" as const },
      speaking: { label: "Speaking", variant: "default" as const },
      searching: { label: "Searching products", variant: "default" as const },
    };

    const config = statusConfig[agentStatus];

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {(agentStatus === "thinking" || agentStatus === "searching") && (
          <Loader2 className="h-3 w-3 animate-spin" />
        )}
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Conversation</CardTitle>
        {getStatusBadge()}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Start a conversation by clicking the microphone button
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ConversationBubble
                key={index}
                speaker={message.speaker}
                text={message.text}
                timestamp={message.timestamp}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Individual conversation bubble component
 */
function ConversationBubble({
  speaker,
  text,
  timestamp,
}: ConversationMessage) {
  const isUser = speaker === "user";
  const isSystem = speaker === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-muted-foreground italic">{text}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-blue-600" : "bg-purple-600"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2 shadow-sm",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-muted text-foreground"
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
        </div>
        <span className="text-xs text-muted-foreground px-2">
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
