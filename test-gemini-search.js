/**
 * Test script to verify Gemini API product search integration
 * Run with: node test-gemini-search.js
 */

const GEMINI_API_KEY = "AIzaSyCu4G6ntwx705rvvzCqOBMAP4I7oIo0FDc";

async function testGeminiSearch() {
  console.log("🔍 Testing Gemini API with Google Search grounding...\n");

  const searchQuery = "Find products for: wireless headphones with price range $50 to $200";

  console.log("Search Query:", searchQuery);
  console.log("\nSending request to Gemini API...\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${searchQuery}.

Please provide a list of at least 10 products with the following information for each:
- Product title
- Price (in USD)
- Product URL (actual shopping link)
- Brief description
- Merchant/retailer name
- Rating (if available)
- Number of reviews (if available)

Format the response as a JSON array of objects with these fields: title, price, productUrl, description, source, rating, reviewCount, availability.`,
                },
              ],
            },
          ],
          tools: [
            {
              googleSearch: {},
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error Response:", response.status, response.statusText);
      console.error("Error Body:", errorText);
      return;
    }

    const data = await response.json();
    console.log("✅ Success! Response received\n");

    // Extract text from response
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      const content = candidate.content;

      if (content && content.parts && content.parts.length > 0) {
        let responseText = "";
        for (const part of content.parts) {
          if (part.text) {
            responseText += part.text;
          }
        }

        console.log("📦 Gemini Response:\n");
        console.log(responseText.substring(0, 1000) + "...\n");

        // Try to extract JSON
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const products = JSON.parse(jsonMatch[0]);
            console.log(`✅ Found ${products.length} products in JSON format:\n`);

            products.slice(0, 3).forEach((product, index) => {
              console.log(`${index + 1}. ${product.title}`);
              console.log(`   Price: $${product.price}`);
              console.log(`   Source: ${product.source || "N/A"}`);
              console.log(`   URL: ${product.productUrl || "N/A"}`);
              console.log("");
            });
          } catch (parseError) {
            console.error("⚠️  Could not parse JSON from response:", parseError.message);
          }
        } else {
          console.log("⚠️  No JSON array found in response");
        }
      } else {
        console.log("⚠️  No content parts in response");
      }
    } else {
      console.log("⚠️  No candidates in response");
      console.log("Full response:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testGeminiSearch();
