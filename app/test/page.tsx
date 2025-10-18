"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mic, Volume2, Wifi } from "lucide-react";

type TestStatus = "idle" | "testing" | "success" | "error";

interface TestResult {
  status: TestStatus;
  message: string;
  details?: string;
}

export default function TestPage() {
  const [microphoneTest, setMicrophoneTest] = useState<TestResult>({
    status: "idle",
    message: "Not tested",
  });
  const [apiKeysTest, setApiKeysTest] = useState<TestResult>({
    status: "idle",
    message: "Not tested",
  });
  const [websocketTest, setWebsocketTest] = useState<TestResult>({
    status: "idle",
    message: "Not tested",
  });
  const [audioLevel, setAudioLevel] = useState(0);

  // Test microphone access
  const testMicrophone = async () => {
    setMicrophoneTest({ status: "testing", message: "Testing microphone access..." });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // Create audio context to monitor audio levels
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Monitor audio levels for 3 seconds
      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.round((average / 255) * 100));
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach((track) => track.stop());
        audioContext.close();
        setAudioLevel(0);
      }, 3000);

      setMicrophoneTest({
        status: "success",
        message: "Microphone access granted",
        details: "Try speaking to see the audio level indicator above. The test will run for 3 seconds.",
      });
    } catch (error) {
      console.error("Microphone test failed:", error);
      setMicrophoneTest({
        status: "error",
        message: "Microphone access denied or unavailable",
        details: error instanceof Error ? error.message : "Please check your browser permissions and ensure a microphone is connected.",
      });
    }
  };

  // Test API keys
  const testApiKeys = async () => {
    setApiKeysTest({ status: "testing", message: "Testing API keys..." });

    try {
      const response = await fetch("/api/test-keys", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        const missingKeys = data.results
          .filter((r: { configured: boolean }) => !r.configured)
          .map((r: { name: string }) => r.name);

        if (missingKeys.length === 0) {
          setApiKeysTest({
            status: "success",
            message: "All API keys are configured",
            details: "Google Gemini, SerpAPI, and Pipecat server keys are all set.",
          });
        } else {
          setApiKeysTest({
            status: "error",
            message: `Missing API keys: ${missingKeys.join(", ")}`,
            details: "Check your .env.local file and ensure all required API keys are set.",
          });
        }
      } else {
        setApiKeysTest({
          status: "error",
          message: "Failed to test API keys",
          details: data.error || "Unknown error occurred",
        });
      }
    } catch (error) {
      console.error("API keys test failed:", error);
      setApiKeysTest({
        status: "error",
        message: "Failed to test API keys",
        details: error instanceof Error ? error.message : "Could not connect to API test endpoint",
      });
    }
  };

  // Test WebSocket connection
  const testWebSocket = async () => {
    setWebsocketTest({ status: "testing", message: "Testing WebSocket connection..." });

    const wsUrl = process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "ws://localhost:8000";

    try {
      const ws = new WebSocket(`${wsUrl}?sessionId=test&userId=test`);

      const timeout = setTimeout(() => {
        ws.close();
        setWebsocketTest({
          status: "error",
          message: "WebSocket connection timeout",
          details: `Could not connect to ${wsUrl}. Make sure the Pipecat voice agent is running.`,
        });
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setWebsocketTest({
          status: "success",
          message: "WebSocket connection successful",
          details: `Connected to voice agent at ${wsUrl}`,
        });
        ws.close();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setWebsocketTest({
          status: "error",
          message: "WebSocket connection failed",
          details: `Cannot connect to ${wsUrl}. Start the Pipecat server with: cd voice_agent && python agent.py`,
        });
      };
    } catch (error) {
      console.error("WebSocket test failed:", error);
      setWebsocketTest({
        status: "error",
        message: "WebSocket connection failed",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  // Run all tests
  const runAllTests = async () => {
    await testMicrophone();
    await testApiKeys();
    await testWebSocket();
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case "testing":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">System Tests</h1>
          <p className="text-muted-foreground text-lg">
            Test microphone access, API keys, and server connectivity
          </p>
        </div>

        {/* Run All Tests Button */}
        <div className="flex justify-center">
          <Button
            onClick={runAllTests}
            size="lg"
            className="w-full sm:w-auto"
            disabled={
              microphoneTest.status === "testing" ||
              apiKeysTest.status === "testing" ||
              websocketTest.status === "testing"
            }
          >
            {microphoneTest.status === "testing" ||
            apiKeysTest.status === "testing" ||
            websocketTest.status === "testing" ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Running Tests...
              </>
            ) : (
              "Run All Tests"
            )}
          </Button>
        </div>

        {/* Individual Tests */}
        <div className="grid gap-6">
          {/* Microphone Test */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic className="h-6 w-6" />
                  <div>
                    <CardTitle>Microphone Access</CardTitle>
                    <CardDescription>Test if your microphone is working</CardDescription>
                  </div>
                </div>
                {getStatusIcon(microphoneTest.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{microphoneTest.message}</p>
                {microphoneTest.details && (
                  <p className="text-sm text-muted-foreground mt-1">{microphoneTest.details}</p>
                )}
              </div>

              {/* Audio Level Indicator */}
              {audioLevel > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Audio Level: {audioLevel}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-100"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={testMicrophone}
                disabled={microphoneTest.status === "testing"}
                variant="outline"
                className="w-full"
              >
                {microphoneTest.status === "testing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Microphone"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* API Keys Test */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                  <div>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>Check if required API keys are configured</CardDescription>
                  </div>
                </div>
                {getStatusIcon(apiKeysTest.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{apiKeysTest.message}</p>
                {apiKeysTest.details && (
                  <p className="text-sm text-muted-foreground mt-1">{apiKeysTest.details}</p>
                )}
              </div>
              <Button
                onClick={testApiKeys}
                disabled={apiKeysTest.status === "testing"}
                variant="outline"
                className="w-full"
              >
                {apiKeysTest.status === "testing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test API Keys"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* WebSocket Test */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi className="h-6 w-6" />
                  <div>
                    <CardTitle>Voice Agent Connection</CardTitle>
                    <CardDescription>Test connection to Pipecat voice server</CardDescription>
                  </div>
                </div>
                {getStatusIcon(websocketTest.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{websocketTest.message}</p>
                {websocketTest.details && (
                  <p className="text-sm text-muted-foreground mt-1">{websocketTest.details}</p>
                )}
              </div>
              <Button
                onClick={testWebSocket}
                disabled={websocketTest.status === "testing"}
                variant="outline"
                className="w-full"
              >
                {websocketTest.status === "testing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test WebSocket"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Microphone Issues:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>Check browser permissions and allow microphone access</li>
                <li>Ensure your microphone is connected and working</li>
                <li>Try refreshing the page and testing again</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">API Keys Issues:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>Create a .env.local file in the project root</li>
                <li>Add GOOGLE_GENERATIVE_AI_API_KEY=your_key_here</li>
                <li>Add SERPAPI_KEY=your_key_here</li>
                <li>Add PIPECAT_SERVER_SECRET=your_secret_here</li>
                <li>Restart the development server after adding keys</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">WebSocket Connection Issues:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>Make sure the Pipecat voice agent is running</li>
                <li>Run: cd voice_agent && python agent.py</li>
                <li>Check that NEXT_PUBLIC_VOICE_AGENT_URL is set correctly</li>
                <li>Default is ws://localhost:8000</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
