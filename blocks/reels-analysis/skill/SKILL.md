---
name: reels-analysis
version: 1.0.0
description: |
  Save and analyze Instagram reels with transcripts. Paste an IG URL to fetch the
  transcript via ScrapeCreators API and store it in the reels-analysis block. Use when
  the user pastes an Instagram URL, says "save this reel", "transcribe this instagram",
  "analyze this reel", or wants to manage their saved reels library.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - WebFetch

---

# Reels Analysis Skill

## Quick Start

When the user pastes an Instagram URL and wants to save it:

```bash
# Save a reel (fetches transcript automatically, takes 10-30 seconds)
curl -s -X POST http://localhost:3200/api/blocks/reels-analysis/reels \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.instagram.com/p/SHORTCODE/"}' | python3 -m json.tool
```

The server calls the ScrapeCreators API to fetch the transcript, then stores everything.

## Block API Reference

All routes are under `/api/blocks/reels-analysis`.

### POST /reels
Save a new reel. The server fetches the transcript from ScrapeCreators automatically.

**Body:**
```json
{
  "url": "https://www.instagram.com/p/DUXSGETkTKd/",
  "notes": "Great hook technique",
  "tags": ["ai", "workflow"]
}
```

Only `url` is required. Returns 201 with the saved reel, or 409 if already saved.

### GET /reels
List saved reels with optional filters.

**Query params:** `?status=saved|analyzed|used`, `?tag=content`, `?q=searchterm`

### GET /reels/:id
Get a single reel with full transcript.

### PATCH /reels/:id
Update reel properties.

**Body (all fields optional):**
```json
{
  "notes": "Updated notes",
  "tags": ["ai", "hook", "tutorial"],
  "status": "analyzed"
}
```

### DELETE /reels/:id
Remove a saved reel.

## Reel Data Shape

```json
{
  "id": "uuid",
  "url": "https://www.instagram.com/p/DUXSGETkTKd/",
  "shortcode": "DUXSGETkTKd",
  "transcript": "Full transcript text...",
  "author": null,
  "caption": null,
  "thumbnailUrl": null,
  "notes": "User notes",
  "tags": ["ai", "workflow"],
  "status": "saved",
  "createdAt": "2026-03-31T...",
  "updatedAt": "2026-03-31T..."
}
```

Status values: `saved` (just saved), `analyzed` (reviewed/tagged), `used` (used for content).

## ScrapeCreators API (for reference)

**Endpoint:** `GET https://api.scrapecreators.com/v2/instagram/media/transcript`
**Header:** `x-api-key: d8l61FnXL8Qr0q6a7rUC42tYO4u1`
**Query param:** `url` — Instagram post or reel URL
**Timing:** 10-30 seconds, videos must be under 2 minutes
**Response:** `{ success: true, transcripts: [{ id, shortcode, text }] }`

For carousel posts, returns multiple transcripts. The block concatenates them.
Returns null for text field if no speech detected.

## Typical Workflow

1. User pastes an IG reel URL → POST to save (transcript auto-fetched)
2. User reviews transcript, adds notes and tags → PATCH to update
3. User marks as "analyzed" when done reviewing
4. Later, user marks as "used" when incorporated into content
