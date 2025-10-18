"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2 } from "lucide-react";

// Extend Window type for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceChatPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Web Speech Recognition
  const initSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      if (finalTranscript) {
        console.log("Final transcript:", finalTranscript);
        setTranscript(finalTranscript);
        // Send to server
        sendToServer(finalTranscript.trim());
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setStatus(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      if (isListening) {
        // Restart if still supposed to be listening
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
  };

  // Initialize WebSocket connection
  const connectToServer = async () => {
    try {
      setStatus("Connecting...");

      // Connect to WebSocket server
      const ws = new WebSocket("ws://localhost:8000/ws");

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setStatus("Connected - Ready to chat");
        wsRef.current = ws;
      };

      ws.onmessage = async (event) => {
        console.log("Received message from server");

        const message = JSON.parse(event.data);

        if (message.type === "response") {
          setResponse(message.text);
          setStatus("Assistant responded");
        } else if (message.type === "audio") {
          // Convert hex string back to audio bytes
          const audioBytes = hexToBytes(message.data);
          await playAudioData(audioBytes);
        } else if (message.type === "error") {
          setStatus(`Error: ${message.message}`);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setStatus("Error connecting");
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setStatus("Disconnected");
        stopListening();
      };

    } catch (error) {
      console.error("Failed to connect:", error);
      setStatus("Connection failed");
    }
  };

  // Send transcript to server
  const sendToServer = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "transcript",
        text: text
      }));
      setStatus("Processing...");
    }
  };

  // Convert hex string to Uint8Array
  const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  };

  // Start listening
  const startListening = () => {
    if (!recognitionRef.current) {
      initSpeechRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setStatus("Listening...");
      } catch (error) {
        console.error("Failed to start recognition:", error);
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setStatus("Connected - Ready to chat");
    }
  };

  // Play received audio (raw PCM)
  const playAudioData = async (audioBytes: Uint8Array) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      // Convert PCM bytes to AudioBuffer
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        audioBytes.length / 2, // 16-bit samples
        24000 // sample rate
      );

      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(audioBytes.buffer);

      for (let i = 0; i < audioBytes.length / 2; i++) {
        // Convert 16-bit PCM to float
        const sample = dataView.getInt16(i * 2, true) / 32768.0;
        channelData[i] = sample;
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  // Disconnect from server
  const disconnect = () => {
    stopListening();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setStatus("Disconnected");
    setTranscript("");
    setResponse("");
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Card className="w-full max-w-2xl bg-gray-800/50 backdrop-blur border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-white">
            Voice Shopping Assistant
          </CardTitle>
          <p className="text-center text-gray-400 mt-2">
            Talk to your AI shopping companion
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Display */}
          <div className="flex items-center justify-center space-x-2 text-lg">
            <div className={`w-3 h-3 rounded-full ${
              isConnected
                ? isListening
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-green-500'
                : 'bg-gray-500'
            }`} />
            <span className="text-white font-medium">{status}</span>
          </div>

          {/* Connection Controls */}
          <div className="flex flex-col space-y-4">
            {!isConnected ? (
              <Button
                onClick={connectToServer}
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
              >
                Connect to Assistant
              </Button>
            ) : (
              <>
                {/* Microphone Toggle */}
                <Button
                  onClick={toggleListening}
                  size="lg"
                  variant={isListening ? "destructive" : "default"}
                  className="w-full text-lg py-6 flex items-center justify-center space-x-2"
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-6 h-6" />
                      <span>Stop Talking</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6" />
                      <span>Start Talking</span>
                    </>
                  )}
                </Button>

                {/* Disconnect Button */}
                <Button
                  onClick={disconnect}
                  size="lg"
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {/* Transcription Display */}
          {transcript && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-400 font-medium mb-1">You said:</p>
              <p className="text-white">{transcript}</p>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-400 font-medium mb-1">Assistant:</p>
              <p className="text-white">{response}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-700/30 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-white flex items-center space-x-2">
              <Volume2 className="w-5 h-5" />
              <span>How to use:</span>
            </h3>
            <ul className="text-sm text-gray-300 space-y-1 ml-7 list-disc">
              <li>Click "Connect to Assistant" to start</li>
              <li>Click "Start Talking" and speak clearly</li>
              <li>The AI will respond with voice and text</li>
              <li>Ask about products, save items, or get recommendations</li>
            </ul>
          </div>

          {/* Visual Indicator */}
          {isListening && (
            <div className="flex items-center justify-center space-x-2">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-500 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 30 + 10}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-red-500 font-medium">Listening...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
