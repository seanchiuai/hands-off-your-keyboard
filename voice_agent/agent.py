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
    from pipecat.pipeline.pipeline import Pipeline
    from pipecat.pipeline.task import PipelineTask, PipelineParams
    from pipecat.pipeline.runner import PipelineRunner
    from pipecat.processors.aggregators.llm_context import LLMContext
    from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
    from pipecat.services.google.llm import GoogleLLMService
    from pipecat.services.cartesia.tts import CartesiaTTSService
    from pipecat.audio.vad.silero import SileroVADAnalyzer
    from pipecat.audio.vad.vad_analyzer import VADParams
    from pipecat.frames.frames import LLMRunFrame, EndFrame
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
        self.cartesia_api_key = os.getenv("CARTESIA_API_KEY")
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
            "CARTESIA_API_KEY": self.cartesia_api_key,
            "CONVEX_HTTP_URL": self.convex_url,
            "PIPECAT_SERVER_SECRET": self.pipecat_secret,
        }

        missing = [var for var, value in required_vars.items() if not value]

        if missing:
            logger.error(f"Missing required environment variables: {', '.join(missing)}")
            logger.error("Please check your .env file and ensure all required variables are set")
            sys.exit(1)

        logger.info("Configuration validated successfully")

    async def create_pipeline(self, session_id: str, user_id: str, transport):
        """
        Create a Pipecat pipeline for a voice session

        Args:
            session_id: Unique identifier for this voice session
            user_id: User identifier from Clerk authentication
            transport: WebSocket transport for this session

        Returns:
            Configured PipelineTask
        """
        logger.info(f"Creating pipeline for session {session_id}, user {user_id}")

        # Initialize LLM service (Gemini)
        llm_service = GoogleLLMService(
            api_key=self.google_api_key,
            model="gemini-1.5-flash",
        )

        # Initialize TTS service (Cartesia TTS)
        tts_service = CartesiaTTSService(
            api_key=self.cartesia_api_key,
            voice_id="71a7ad14-091c-4e8e-a314-022ece01c121",  # Pleasant female voice
        )

        # Build the system prompt with context
        system_prompt = get_system_prompt()

        # Setup conversation context
        messages = [
            {
                "role": "system",
                "content": system_prompt
            }
        ]

        context = LLMContext(messages)
        context_aggregator = LLMContextAggregatorPair(context)

        # Create the pipeline
        # The pipeline flow:
        # 1. Audio input from transport
        # 2. STT (handled by Google LLM service)
        # 3. Context aggregator (manages conversation)
        # 4. LLM (Gemini processes and responds)
        # 5. TTS (text to speech)
        # 6. Audio output via transport

        pipeline = Pipeline([
            transport.input(),
            context_aggregator.user(),
            llm_service,
            tts_service,
            transport.output(),
            context_aggregator.assistant()
        ])

        # Set up custom action handlers
        llm_service.register_function("search_products",
            lambda args: self.actions.search_products(session_id, user_id, **args))
        llm_service.register_function("save_item",
            lambda args: self.actions.save_item(session_id, user_id, **args))
        llm_service.register_function("get_user_preferences",
            lambda args: self.actions.get_user_preferences(user_id))

        # Create task with configuration
        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                enable_metrics=True,
                allow_interruptions=True
            )
        )

        logger.info(f"Pipeline created successfully for session {session_id}")
        return task

    async def handle_session(self, websocket, path):
        """
        Handle a new WebSocket connection (voice session)

        Args:
            websocket: WebSocket connection
            path: WebSocket path (can include session info)
        """
        # Parse session_id and user_id from WebSocket URL query parameters
        from urllib.parse import urlparse, parse_qs

        try:
            # Parse query parameters from WebSocket path
            parsed = urlparse(path)
            query_params = parse_qs(parsed.query)

            # Extract session ID (required)
            session_id = query_params.get('sessionId', [None])[0]
            if not session_id:
                logger.warning(f"No sessionId in WebSocket connection: {path}")
                session_id = f"session_{int(asyncio.get_event_loop().time() * 1000)}"

            # Extract user ID (optional, may come from authentication)
            user_id = query_params.get('userId', [None])[0]
            if not user_id:
                # Try to get from authentication headers or use generated ID
                user_id = f"user_{int(asyncio.get_event_loop().time() * 1000)}"
                logger.info(f"No userId provided, using generated: {user_id}")

            logger.info(f"New session started: {session_id} for user {user_id}")

        except Exception as e:
            logger.error(f"Error parsing WebSocket parameters: {e}")
            session_id = f"session_{int(asyncio.get_event_loop().time() * 1000)}"
            user_id = f"user_{int(asyncio.get_event_loop().time() * 1000)}"
            logger.warning(f"Using generated IDs: session={session_id}, user={user_id}")

        try:
            # For now, use LocalAudioTransport for development
            # TODO: Implement proper WebSocket transport when available
            from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams

            transport = LocalAudioTransport(
                params=LocalAudioTransportParams(
                    audio_in_enabled=True,
                    audio_out_enabled=True,
                    audio_in_sample_rate=16000,
                    audio_out_sample_rate=24000
                )
            )

            # Create the pipeline for this session
            task = await self.create_pipeline(session_id, user_id, transport)

            # Run the pipeline
            runner = PipelineRunner()
            await runner.run(task)

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

    async def run_local(self):
        """Run the agent locally for testing"""
        from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams

        logger.info("Starting Voice Shopper Agent (local mode)")
        logger.info(f"Convex backend: {self.convex_url}")
        logger.info("Speak into your microphone to interact with the agent")

        # Create local audio transport
        transport = LocalAudioTransport(
            params=LocalAudioTransportParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                audio_in_sample_rate=16000,
                audio_out_sample_rate=24000
            )
        )

        # Create session IDs for testing
        session_id = f"local_session_{int(asyncio.get_event_loop().time() * 1000)}"
        user_id = "local_user"

        # Create the pipeline
        task = await self.create_pipeline(session_id, user_id, transport)

        # Run the pipeline
        runner = PipelineRunner(handle_sigint=True)
        await runner.run(task)

    def run(self):
        """Run the agent"""
        try:
            asyncio.run(self.run_local())
        except KeyboardInterrupt:
            logger.info("Agent stopped by user")
        except Exception as e:
            logger.error(f"Agent error: {e}", exc_info=True)
            sys.exit(1)


def main():
    """Main entry point"""
    logger.info("=== Voice Shopper Agent ===")
    logger.info("Initializing Pipecat voice agent...")

    agent = VoiceShopperAgent()
    agent.run()


if __name__ == "__main__":
    main()
