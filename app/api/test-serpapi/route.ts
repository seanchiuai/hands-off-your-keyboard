import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.SERPAPI_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "SERPAPI_KEY not configured in environment variables",
      });
    }

    // Test the API with a simple search query
    const response = await fetch(
      `https://serpapi.com/search.json?q=test&api_key=${apiKey}&num=1`,
      {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.error || `SerpAPI returned status ${response.status}`,
      });
    }

    const data = await response.json();

    // Check if there's an error in the response
    if (data.error) {
      return NextResponse.json({
        success: false,
        error: data.error,
      });
    }

    return NextResponse.json({
      success: true,
      message: "SerpAPI is working correctly",
      searchesLeft: data.search_metadata?.total_searches_left || "Unknown",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to connect to SerpAPI",
    });
  }
}
