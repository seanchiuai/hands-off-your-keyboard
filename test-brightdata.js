/**
 * Test script to verify Bright Data SERP API integration
 * Run with: node test-brightdata.js
 */

const BRIGHT_DATA_API_KEY = "fb11b8cc91247e466fb11e99a4f787f969e7e20ec973dd50a272bd18d226eff1";
const BRIGHT_DATA_ZONE = "serp_api1";

async function testBrightDataSearch() {
  console.log("🔍 Testing Bright Data SERP API...\n");

  // Build Google Shopping URL
  const searchParams = new URLSearchParams({
    q: "wireless headphones",
    tbm: "shop", // Google Shopping
    hl: "en",
    gl: "us",
    num: "10",
  });

  const googleShoppingUrl = `https://www.google.com/search?${searchParams.toString()}&brd_json=1`;

  console.log("Request URL:", googleShoppingUrl);
  console.log("Zone:", BRIGHT_DATA_ZONE);
  console.log("\nSending request to Bright Data...\n");

  try {
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIGHT_DATA_API_KEY}`,
      },
      body: JSON.stringify({
        zone: BRIGHT_DATA_ZONE,
        url: googleShoppingUrl,
        format: "json",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error Response:", response.status, response.statusText);
      console.error("Error Body:", errorText);
      return;
    }

    const data = await response.json();
    console.log("✅ Success! Response received\n");

    // Check for shopping results
    if (data.shopping_results && data.shopping_results.length > 0) {
      console.log(`📦 Found ${data.shopping_results.length} shopping results:\n`);

      data.shopping_results.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title || "No title"}`);
        console.log(`   Price: ${item.price || "N/A"}`);
        console.log(`   Source: ${item.source || item.merchant || "Unknown"}`);
        console.log(`   URL: ${item.link || item.url || "N/A"}`);
        console.log("");
      });
    } else if (data.inline_shopping && data.inline_shopping.length > 0) {
      console.log(`📦 Found ${data.inline_shopping.length} inline shopping results:\n`);

      data.inline_shopping.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title || "No title"}`);
        console.log(`   Price: ${item.price || "N/A"}`);
        console.log(`   Source: ${item.source || item.merchant || "Unknown"}`);
        console.log("");
      });
    } else {
      console.log("⚠️  No shopping results found in response");
      console.log("Response structure:", Object.keys(data));
      console.log("\nFull response:", JSON.stringify(data, null, 2).substring(0, 500) + "...");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testBrightDataSearch();
