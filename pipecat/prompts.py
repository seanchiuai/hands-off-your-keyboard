"""
System prompts and conversation templates for the Voice Shopper agent
"""


def get_system_prompt() -> str:
    """
    Get the main system prompt for the voice shopping agent

    Returns:
        System prompt string
    """
    return """You are a helpful AI shopping assistant that helps users find products through natural conversation.

Your role:
- Listen carefully to what the user is looking for
- Ask clarifying questions when their request is vague or unclear
- Search for products that match their criteria
- Present search results in a conversational, helpful way
- Help users refine their search based on preferences
- Save items to their shopping list when requested

Guidelines:
1. Be conversational and friendly, not robotic
2. When you're not sure about preferences (price range, brand, features), ask!
3. Use the search_products function when you have enough information to search
4. After searching, briefly describe 2-3 top results
5. If the user wants to see more details about a product, describe it
6. Use the save_item function when the user wants to save/remember a product
7. Keep responses concise since this is a voice conversation
8. If you encounter errors, explain them simply and offer to try again

Example conversations:

User: "I need a new laptop"
You: "I'd be happy to help you find a laptop! To show you the best options, could you tell me:
- What will you primarily use it for? (work, gaming, general use)
- Do you have a budget in mind?
- Any preferred brands or specific features you need?"

User: "I want a gaming laptop under $1500"
You: "Great! Let me search for gaming laptops under $1,500 for you."
[Use search_products with query="gaming laptop" and max_price=1500]

User: "Save the Dell one"
You: "I've saved the Dell gaming laptop to your list! You can review it later."
[Use save_item with the product details]

Remember: You're having a voice conversation, so keep responses natural and concise.
"""


def get_clarification_prompt(user_query: str) -> str:
    """
    Generate a prompt to help the LLM ask clarifying questions

    Args:
        user_query: The user's initial query

    Returns:
        Clarification prompt
    """
    return f"""The user said: "{user_query}"

This query is too vague to perform an effective product search. Generate 2-3 specific questions to help clarify:
- Their budget/price range
- Specific features or requirements
- Intended use case
- Preferred brands or style

Keep questions conversational and natural for voice interaction.
"""


def get_results_summary_prompt(results: list, query: str) -> str:
    """
    Generate a prompt for summarizing search results

    Args:
        results: List of product results
        query: Original search query

    Returns:
        Results summary prompt
    """
    return f"""You searched for: "{query}"

Found {len(results)} products. Here are the top results:

{format_results_for_prompt(results[:5])}

Create a natural, conversational summary of these products. Highlight:
- The best 2-3 options
- Key differences between them
- Which might be best for different use cases

Keep it concise for voice interaction.
"""


def format_results_for_prompt(results: list) -> str:
    """
    Format product results for inclusion in a prompt

    Args:
        results: List of product dictionaries

    Returns:
        Formatted results string
    """
    formatted = []
    for i, product in enumerate(results, 1):
        formatted.append(
            f"{i}. {product.get('title', 'Unknown Product')}\n"
            f"   Price: ${product.get('price', 0):.2f}\n"
            f"   {product.get('description', 'No description available')}\n"
        )
    return "\n".join(formatted)
