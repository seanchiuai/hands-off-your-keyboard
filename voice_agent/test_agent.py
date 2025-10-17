#!/usr/bin/env python3
"""
Test script for Pipecat Voice Agent
Tests WebSocket connection and basic functionality
"""

import asyncio
import json
import websockets
import sys

async def test_connection():
    """Test basic WebSocket connection"""
    uri = "ws://localhost:8000?sessionId=test_123&userId=test_user"
    
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")
            
            # Send a test message
            test_message = json.dumps({
                "type": "text",
                "data": {"text": "Hello, can you hear me?"}
            })
            
            await websocket.send(test_message)
            print(f"📤 Sent: {test_message}")
            
            # Wait for response (with timeout)
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"📥 Received: {response[:100]}...")
                print("✅ Agent responded!")
            except asyncio.TimeoutError:
                print("⏱️  No response within 10 seconds")
            
    except ConnectionRefusedError:
        print("❌ Connection refused. Is the Pipecat agent running?")
        print("   Run: cd pipecat && python agent.py")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

async def main():
    print("=" * 50)
    print("Testing Pipecat Voice Agent")
    print("=" * 50)
    print()
    
    await test_connection()
    
    print()
    print("=" * 50)
    print("Test complete!")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())

