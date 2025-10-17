#!/usr/bin/env python3
"""
Voice Shopper - Pipecat Agent
Real-time AI voice agent for conversational shopping assistance
"""

import os
import sys
import asyncio
import logging
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Import Pipecat framework components
try:
    from pipecat.pipeline import Pipeline
    from pipecat.processors.aggregators.llm_response import LLMResponseAggregator
    from pipecat.processors.aggregators.sentence import SentenceAggregator
    from pipecat.services.google import GoogleLLMService, GoogleTTSService
    from pipecat.transports.websocket import WebsocketServerTransport
    from pipecat.vad.silero import SileroVAD
except ImportError as e:
    print(f"Error: Pipecat dependencies not installed. Run: pip install -r requirements.txt")
    print(f"Details: {e}")
    sys.exit(1)

# Import custom modules
from actions import VoiceShopperActions
from prompts import get_system_prompt

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VoiceShopperAgent:
    """
    Main Voice Shopper agent that orchestrates the Pipecat pipeline
    """

    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.convex_url = os.getenv("CONVEX_HTTP_URL")
        self.pipecat_secret = os.getenv("PIPECAT_SERVER_SECRET")
        self.host = os.getenv("SERVER_HOST", "0.0.0.0")
        self.port = int(os.getenv("SERVER_PORT", "8000"))

        # Validate required environment variables
        self._validate_config()

        # Initialize custom actions handler
        self.actions = VoiceShopperActions(
            convex_url=self.convex_url,
            secret=self.pipecat_secret
        )

    def _validate_config(self):
        """Validate that required environment variables are set"""
        required_vars = {
            "GOOGLE_API_KEY": self.google_api_key,
            "CONVEX_HTTP_URL": self.convex_url,
            "PIPECAT_SERVER_SECRET": self.pipecat_secret,
        }

        missing = [var for var, value in required_vars.items() if not value]

        if missing:
            logger.error(f"Missing required environment variables: {', '.join(missing)}")
            logger.error("Please check your .env file and ensure all required variables are set")
            sys.exit(1)

        logger.info("Configuration validated successfully")

    async def create_pipeline(self, session_id: str, user_id: str) -> Pipeline:
        """
        Create a Pipecat pipeline for a voice session

        Args:
            session_id: Unique identifier for this voice session
            user_id: User identifier from Clerk authentication

        Returns:
            Configured Pipecat pipeline
        """
        logger.info(f"Creating pipeline for session {session_id}, user {user_id}")

        # Initialize LLM service (Gemini)
        llm_service = GoogleLLMService(
            api_key=self.google_api_key,
            model="gemini-1.5-flash",
        )

        # Initialize TTS service (Google TTS)
        tts_service = GoogleTTSService(
            api_key=self.google_api_key,
            voice_id="en-US-Neural2-F",  # Female voice
        )

        # Initialize VAD (Voice Activity Detection)
        vad = SileroVAD()

        # Create sentence aggregator to group words into sentences
        sentence_aggregator = SentenceAggregator()

        # Create LLM response aggregator
        llm_aggregator = LLMResponseAggregator()

        # Build the system prompt with context
        system_prompt = get_system_prompt()

        # Create the pipeline
        # The pipeline flow:
        # 1. Audio input → VAD (detect when user is speaking)
        # 2. VAD → STT (speech to text)
        # 3. STT → Sentence Aggregator (group into sentences)
        # 4. Sentences → LLM (Gemini processes and responds)
        # 5. LLM → Custom Actions (triggers research, saves items, etc.)
        # 6. LLM Response → TTS (text to speech)
        # 7. TTS → Audio output to user

        pipeline = Pipeline([
            vad,
            sentence_aggregator,
            llm_service,
            llm_aggregator,
            tts_service,
        ])

        # Configure LLM with system prompt and custom actions
        await llm_service.set_context({
            "messages": [
                {"role": "system", "content": system_prompt},
            ],
            "tools": self.actions.get_tool_definitions(),
        })

        # Set up custom action handlers
        llm_service.register_function("search_products",
            lambda args: self.actions.search_products(session_id, user_id, **args))
        llm_service.register_function("save_item",
            lambda args: self.actions.save_item(session_id, user_id, **args))
        llm_service.register_function("get_user_preferences",
            lambda args: self.actions.get_user_preferences(user_id))

        logger.info(f"Pipeline created successfully for session {session_id}")
        return pipeline

    async def handle_session(self, websocket, path):
        """
        Handle a new WebSocket connection (voice session)

        Args:
            websocket: WebSocket connection
            path: WebSocket path (can include session info)
        """
        # Extract session_id and user_id from path or query params
        # In production, you'd parse these from the WebSocket connection
        # For now, we'll use placeholder values
        session_id = f"session_{asyncio.get_event_loop().time()}"
        user_id = "user_placeholder"  # In production, get from authentication

        logger.info(f"New session started: {session_id} for user {user_id}")

        try:
            # Create the pipeline for this session
            pipeline = await self.create_pipeline(session_id, user_id)

            # Create WebSocket transport
            transport = WebsocketServerTransport(websocket)

            # Connect pipeline to transport
            await pipeline.run(transport)

            logger.info(f"Session {session_id} completed successfully")

        except Exception as e:
            logger.error(f"Error in session {session_id}: {e}", exc_info=True)
            # Optionally notify Convex about the error
            await self.actions.log_conversation(
                session_id=session_id,
                speaker="system",
                text=f"Session error: {str(e)}",
                timestamp=asyncio.get_event_loop().time() * 1000
            )

    async def start_server(self):
        """Start the WebSocket server"""
        import websockets

        logger.info(f"Starting Voice Shopper Agent server on {self.host}:{self.port}")
        logger.info(f"Convex backend: {self.convex_url}")

        async with websockets.serve(self.handle_session, self.host, self.port):
            logger.info(f"Server is running! Connect WebSocket clients to ws://{self.host}:{self.port}")
            await asyncio.Future()  # Run forever

    def run(self):
        """Run the agent server"""
        try:
            asyncio.run(self.start_server())
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
        except Exception as e:
            logger.error(f"Server error: {e}", exc_info=True)
            sys.exit(1)


def main():
    """Main entry point"""
    logger.info("=== Voice Shopper Agent ===")
    logger.info("Initializing Pipecat voice agent...")

    agent = VoiceShopperAgent()
    agent.run()


if __name__ == "__main__":
    main()
