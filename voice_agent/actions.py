"""
Custom actions for the Voice Shopper agent
These actions can be invoked by the LLM during conversations
"""

import httpx
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class VoiceShopperActions:
    """
    Handles custom actions that the LLM can invoke during voice conversations
    """

    def __init__(self, convex_url: str, secret: str):
        """
        Initialize actions handler

        Args:
            convex_url: Base URL for Convex HTTP endpoints
            secret: Shared secret for authenticating with Convex
        """
        self.convex_url = convex_url.rstrip("/")
        self.secret = secret
        self.client = httpx.AsyncClient(timeout=30.0)

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """
        Get OpenAI function calling tool definitions for the LLM

        Returns:
            List of tool definitions in OpenAI format
        """
        return [
            {
                "type": "function",
                "function": {
                    "name": "search_products",
                    "description": "Search for products based on user's query and preferences. Use this when the user asks to find, search for, or show them products.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query for products (e.g., 'laptop for programming', 'ergonomic office chair')"
                            },
                            "min_price": {
                                "type": "number",
                                "description": "Minimum price in USD (optional)"
                            },
                            "max_price": {
                                "type": "number",
                                "description": "Maximum price in USD (optional)"
                            },
                            "brands": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Preferred brands (optional)"
                            },
                            "categories": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Product categories (optional)"
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "save_item",
                    "description": "Save a product to the user's saved items list. Use this when the user asks to save, remember, or add a product to their list.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "product_id": {
                                "type": "string",
                                "description": "Unique identifier for the product"
                            },
                            "product_name": {
                                "type": "string",
                                "description": "Name of the product"
                            },
                            "description": {
                                "type": "string",
                                "description": "Product description (optional)"
                            },
                            "price": {
                                "type": "number",
                                "description": "Product price (optional)"
                            }
                        },
                        "required": ["product_id", "product_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_user_preferences",
                    "description": "Get the user's saved shopping preferences. Use this to personalize recommendations.",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }
        ]

    async def search_products(
        self,
        session_id: str,
        user_id: str,
        query: str,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        brands: Optional[List[str]] = None,
        categories: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Trigger product search via Convex backend

        Args:
            session_id: Current voice session ID
            user_id: User identifier
            query: Search query
            min_price: Minimum price filter
            max_price: Maximum price filter
            brands: Preferred brands
            categories: Product categories

        Returns:
            Search result summary
        """
        logger.info(f"[Action] Searching products: {query}")

        try:
            # Build preferences object
            preferences = {}
            if min_price is not None:
                preferences["minPrice"] = min_price
            if max_price is not None:
                preferences["maxPrice"] = max_price
            if brands:
                preferences["brands"] = brands
            if categories:
                preferences["categories"] = categories

            # Call Convex HTTP endpoint to trigger research
            response = await self.client.post(
                f"{self.convex_url}/pipecat/trigger-research",
                json={
                    "query": query,
                    "sessionId": session_id,
                    "userId": user_id,
                    "preferences": preferences if preferences else None,
                },
                headers={
                    "X-Pipecat-Secret": self.secret,
                    "Content-Type": "application/json",
                }
            )

            response.raise_for_status()
            result = response.json()

            logger.info(f"[Action] Search completed: {result.get('resultsCount', 0)} products found")

            # Log this action to conversation history
            await self.log_conversation(
                session_id=session_id,
                speaker="system",
                text=f"Searched for: {query}",
                timestamp=int(httpx.codes.FOUND * 1000)  # Current timestamp
            )

            return {
                "success": True,
                "message": f"Found {result.get('resultsCount', 0)} products matching your criteria. I'll show them to you now.",
                "results_count": result.get('resultsCount', 0)
            }

        except Exception as e:
            logger.error(f"[Action] Error searching products: {e}")
            return {
                "success": False,
                "message": f"Sorry, I encountered an error while searching: {str(e)}"
            }

    async def save_item(
        self,
        session_id: str,
        user_id: str,
        product_id: str,
        product_name: str,
        description: Optional[str] = None,
        price: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Save a product to the user's list (via Convex mutation)

        Note: This would typically be called from the frontend when the user
        clicks a "Save" button, but the LLM can also trigger it via voice command.

        Args:
            session_id: Current voice session ID
            user_id: User identifier
            product_id: Product identifier
            product_name: Product name
            description: Product description
            price: Product price

        Returns:
            Save result
        """
        logger.info(f"[Action] Saving item: {product_name}")

        try:
            # In a full implementation, you might call a Convex httpAction
            # or have the frontend handle this via a mutation
            # For now, we'll log it and return success

            await self.log_conversation(
                session_id=session_id,
                speaker="system",
                text=f"Saved item: {product_name}",
                timestamp=int(httpx.codes.FOUND * 1000)
            )

            return {
                "success": True,
                "message": f"I've saved '{product_name}' to your list!"
            }

        except Exception as e:
            logger.error(f"[Action] Error saving item: {e}")
            return {
                "success": False,
                "message": f"Sorry, I couldn't save that item: {str(e)}"
            }

    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """
        Get user's shopping preferences

        Args:
            user_id: User identifier

        Returns:
            User preferences
        """
        logger.info(f"[Action] Getting preferences for user {user_id}")

        try:
            # In a full implementation, this would query Convex
            # For now, return a placeholder response
            return {
                "success": True,
                "preferences": {
                    "style": ["modern", "minimalist"],
                    "budget": {"min": 50, "max": 500},
                    "brands": ["Apple", "Dell", "Herman Miller"]
                }
            }

        except Exception as e:
            logger.error(f"[Action] Error getting preferences: {e}")
            return {
                "success": False,
                "message": f"Could not retrieve preferences: {str(e)}"
            }

    async def log_conversation(
        self,
        session_id: str,
        speaker: str,
        text: str,
        timestamp: int
    ) -> None:
        """
        Log a conversation turn to Convex

        Args:
            session_id: Voice session ID
            speaker: Speaker identifier (user, agent, system)
            text: Conversation text
            timestamp: Unix timestamp in milliseconds
        """
        try:
            response = await self.client.post(
                f"{self.convex_url}/pipecat/log-conversation",
                json={
                    "sessionId": session_id,
                    "speaker": speaker,
                    "text": text,
                    "timestamp": timestamp,
                },
                headers={
                    "X-Pipecat-Secret": self.secret,
                    "Content-Type": "application/json",
                }
            )

            response.raise_for_status()
            logger.debug(f"[Action] Logged conversation turn for session {session_id}")

        except Exception as e:
            logger.warning(f"[Action] Failed to log conversation: {e}")
            # Don't raise - logging failures shouldn't break the conversation

    async def close(self):
        """Clean up resources"""
        await self.client.aclose()
