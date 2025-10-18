#!/usr/bin/env python3
"""
Voice Shopper - Simple WebSocket Server
Simplified version for browser audio streaming
"""

import os
import sys
import asyncio
import logging
import json
from typing import Dict
from dotenv import load_dotenv

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import Pipecat framework components
try:
    from pipecat.services.google.llm import GoogleLLMService
    from pipecat.services.cartesia.tts import CartesiaTTSService
    from pipecat.processors.aggregators.llm_context import LLMContext
except ImportError as e:
    print(f"Error: Pipecat dependencies not installed. Run: pip install -r requirements.txt")
    print(f"Details: {e}")
    sys.exit(1)

# Import custom modules
from prompts import get_system_prompt

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="Voice Shopper API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VoiceShopperServer:
    """Simplified Voice Shopper server"""

    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.cartesia_api_key = os.getenv("CARTESIA_API_KEY")
        self._validate_config()

    def _validate_config(self):
        """Validate configuration"""
        required_vars = {
            "GOOGLE_API_KEY": self.google_api_key,
            "CARTESIA_API_KEY": self.cartesia_api_key,
        }

        missing = [var for var, value in required_vars.items() if not value]
        if missing:
            logger.error(f"Missing required environment variables: {', '.join(missing)}")
            sys.exit(1)

        logger.info("Configuration validated successfully")

    async def process_text(self, text: str) -> str:
        """
        Process text through Gemini LLM

        Args:
            text: User's text input

        Returns:
            LLM response text
        """
        try:
            # Initialize Gemini
            from google import generativeai as genai
            genai.configure(api_key=self.google_api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')

            # Get system prompt
            system_prompt = get_system_prompt()

            # Generate response
            full_prompt = f"{system_prompt}\n\nUser: {text}\n\nAssistant:"
            response = model.generate_content(full_prompt)

            return response.text

        except Exception as e:
            logger.error(f"Error processing text: {e}")
            return "I'm sorry, I encountered an error processing your request."

    async def synthesize_speech(self, text: str) -> bytes:
        """
        Convert text to speech using Cartesia

        Args:
            text: Text to convert to speech

        Returns:
            Audio bytes
        """
        try:
            import httpx

            url = "https://api.cartesia.ai/tts/bytes"
            headers = {
                "X-API-Key": self.cartesia_api_key,
                "Cartesia-Version": "2024-06-10",
                "Content-Type": "application/json"
            }
            data = {
                "model_id": "sonic-english",
                "transcript": text,
                "voice": {
                    "mode": "id",
                    "id": "71a7ad14-091c-4e8e-a314-022ece01c121"
                },
                "output_format": {
                    "container": "raw",
                    "encoding": "pcm_s16le",
                    "sample_rate": 24000
                }
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data, timeout=30.0)
                response.raise_for_status()
                return response.content

        except Exception as e:
            logger.error(f"Error synthesizing speech: {e}")
            return b""


# Initialize server
server = VoiceShopperServer()


@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "ok",
        "service": "Voice Shopper API (Simple)",
        "version": "1.0.0"
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for simple text-based communication
    Browser sends text, server responds with audio
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    session_id = f"session_{int(asyncio.get_event_loop().time() * 1000)}"

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            logger.info(f"Received text: {data}")

            # Parse message
            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "transcript":
                    # User spoke something
                    user_text = message.get("text", "")
                    logger.info(f"User said: {user_text}")

                    # Process through LLM
                    response_text = await server.process_text(user_text)
                    logger.info(f"Assistant response: {response_text}")

                    # Send text response first
                    await websocket.send_json({
                        "type": "response",
                        "text": response_text
                    })

                    # Convert to speech
                    audio_data = await server.synthesize_speech(response_text)

                    if audio_data:
                        # Send audio data
                        await websocket.send_json({
                            "type": "audio",
                            "data": audio_data.hex()  # Send as hex string
                        })

            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received: {data}")
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid message format"
                })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Error in session {session_id}: {e}", exc_info=True)


def main():
    """Main entry point"""
    logger.info("=== Voice Shopper Simple WebSocket Server ===")
    logger.info("Starting FastAPI server...")

    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", "8000"))

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )


if __name__ == "__main__":
    main()
