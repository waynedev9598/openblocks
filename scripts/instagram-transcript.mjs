#!/usr/bin/env node

const API_KEY = "d8l61FnXL8Qr0q6a7rUC42tYO4u1";
const BASE_URL = "https://api.scrapecreators.com/v2/instagram/media/transcript";

async function getTranscript(instagramUrl) {
  const url = new URL(BASE_URL);
  url.searchParams.set("url", instagramUrl);

  const res = await fetch(url, {
    method: "GET",
    headers: { "x-api-key": API_KEY },
    signal: AbortSignal.timeout(60_000), // 60s timeout (API can take 10-30s)
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body}`);
  }

  const data = await res.json();

  if (!data.success) {
    throw new Error(`API returned success=false: ${JSON.stringify(data)}`);
  }

  return data.transcripts;
}

// --- Main ---
const reelUrl = process.argv[2] || "https://www.instagram.com/p/DUXSGETkTKd/";

console.log(`Fetching transcript for: ${reelUrl}`);
console.log("This may take 10-30 seconds...\n");

try {
  const transcripts = await getTranscript(reelUrl);

  if (!transcripts || transcripts.length === 0) {
    console.log("No transcript returned (no speech detected or video too long).");
  } else {
    for (const t of transcripts) {
      console.log(`--- [${t.shortcode}] ---`);
      console.log(t.text);
      console.log();
    }
  }
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
}
