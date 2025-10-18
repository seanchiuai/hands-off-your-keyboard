import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "GOOGLE_GENERATIVE_AI_API_KEY not configured in environment variables",
      });
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Simple test prompt
    const result = await model.generateContent("Reply with just the word 'OK' if you can read this.");
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      message: "Gemini API is working correctly",
      testResponse: text,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to connect to Gemini API",
    });
  }
}
