#!/usr/bin/env python3
"""
Voice Shopper - FastAPI WebSocket Server
Real-time AI voice agent accessible from the web browser
"""

import os
import sys
import logging
from typing import Dict, Any
from dotenv import load_dotenv

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import Pipecat framework components
try:
    from pipecat.pipeline.pipeline import Pipeline
    from pipecat.pipeline.task import PipelineTask, PipelineParams
    from pipecat.pipeline.runner import PipelineRunner
    from pipecat.processors.aggregators.llm_context import LLMContext
    from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
    from pipecat.services.google.llm import GoogleLLMService
    from pipecat.services.cartesia.tts import CartesiaTTSService
    from pipecat.transports.websocket.fastapi import (
        FastAPIWebsocketTransport,
        FastAPIWebsocketParams
    )
    from pipecat.audio.vad.silero import SileroVADAnalyzer
    from pipecat.serializers.protobuf import ProtobufFrameSerializer
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

# FastAPI app
app = FastAPI(title="Voice Shopper API")

# Add CORS middleware to allow browser connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VoiceShopperServer:
    """Voice Shopper WebSocket server"""

    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.cartesia_api_key = os.getenv("CARTESIA_API_KEY")
        self.convex_url = os.getenv("CONVEX_HTTP_URL")
        self.pipecat_secret = os.getenv("PIPECAT_SERVER_SECRET")

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
            user_id: User identifier from authentication
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
        # 1. Audio input from browser via WebSocket
        # 2. Context aggregator (manages conversation)
        # 3. LLM (Gemini processes and responds)
        # 4. TTS (text to speech)
        # 5. Audio output via WebSocket back to browser

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


# Initialize server instance
server = VoiceShopperServer()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Voice Shopper API",
        "version": "1.0.0"
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for voice chat
    Browser connects here to stream audio
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    # Generate session ID
    import time
    session_id = f"session_{int(time.time() * 1000)}"
    user_id = "browser_user"  # TODO: Get from authentication

    try:
        # Create WebSocket transport
        transport = FastAPIWebsocketTransport(
            websocket=websocket,
            params=FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                add_wav_header=True,
                vad_analyzer=SileroVADAnalyzer(),
                serializer=ProtobufFrameSerializer()
            )
        )

        # Create the pipeline for this session
        task = await server.create_pipeline(session_id, user_id, transport)

        # Handle connection event
        @transport.event_handler("on_client_connected")
        async def on_connected(transport, client):
            logger.info(f"Client connected: {client}")
            # Start the conversation
            await task.queue_frames([LLMRunFrame()])

        @transport.event_handler("on_client_disconnected")
        async def on_disconnected(transport, client):
            logger.info(f"Client disconnected: {client}")
            await task.cancel()

        # Run the pipeline
        runner = PipelineRunner()
        await runner.run(task)

        logger.info(f"Session {session_id} completed successfully")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Error in session {session_id}: {e}", exc_info=True)
        # Optionally notify Convex about the error
        await server.actions.log_conversation(
            session_id=session_id,
            speaker="system",
            text=f"Session error: {str(e)}",
            timestamp=time.time() * 1000
        )


def main():
    """Main entry point"""
    logger.info("=== Voice Shopper WebSocket Server ===")
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
