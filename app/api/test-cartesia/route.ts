import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if the Cartesia API key exists in the voice_agent environment
    // Since we can't directly access the Python server's env from Next.js,
    // we'll try to ping the voice agent server to see if it's configured

    const voiceAgentUrl = process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "http://localhost:8000";

    try {
      // Try to reach a health endpoint on the voice agent
      const response = await fetch(`${voiceAgentUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          message: "Voice agent is running and Cartesia should be configured",
          details: data,
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "Voice agent is not responding correctly",
        });
      }
    } catch (fetchError: any) {
      return NextResponse.json({
        success: false,
        error: "Cannot reach voice agent server. Make sure it's running with: cd voice_agent && python server.py",
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to test Cartesia API",
    });
  }
}
