# Atlas

Atlas is a modular `Next.js + TypeScript` prototype for the 2026 Hack-AI-thon Expedia challenge. It ingests the provided Expedia property + review datasets, precomputes high-value information gaps, and turns them into one adaptive follow-up question during the review flow.

## What is working now

- Local ingestion pipeline for `Description_PROC.csv` and `Reviews_PROC.csv`
- Derived property catalog with candidate gaps, evidence, and question templates
- API routes for property loading, session start, and answer preview
- Custom RAG pipeline with offline OpenAI embeddings over property + review evidence
- Mockup-faithful Expedia-style frontend for:
  - stay confirmation
  - typed or voice-first review mode
  - one retrieval-grounded smart follow-up
  - impact/profile screen with badges, taste profile, and photo evidence cards
- Browser-native voice mode:
  - spoken prompts via Speech Synthesis
  - review dictation via Web Speech API
  - voice capture for the follow-up answer
- Optional server-side photo labeling using OpenAI vision, with safe fallbacks when no key is present
- Optional OpenAI question-polishing hook when `OPENAI_API_KEY` is present

## Project structure

- [`data/raw`](./data/raw): source CSVs copied from the hackathon materials
- [`data/generated`](./data/generated): derived catalog artifacts created by the ingestion pipeline
- [`scripts`](./scripts): offline ingestion and validation scripts
- [`src/app`](./src/app): Next.js routes, pages, and API endpoints
- [`src/components/reviewiq`](./src/components/reviewiq): the main Atlas client UI
- [`src/lib/reviewiq`](./src/lib/reviewiq): runtime data loading, question selection, answer preview, and OpenAI integration
- [`src/types`](./src/types): browser typing shims

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Generate the derived catalog:

```bash
npm run ingest
```

3. Optionally validate the generated artifacts:

```bash
npm run check:data
```

4. Start the app:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Environment variables

Create `.env.local` if you want OpenAI-assisted question polishing:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

The app works without an API key. In that mode it uses the deterministic gap engine and question templates only.
With an API key, `npm run ingest` also builds the semantic RAG index and the live session flow upgrades from heuristic-only selection to retrieval-grounded question generation.

For durable hosted demo state on Vercel, also add:

```bash
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

Optional:

```bash
REVIEWIQ_DEMO_BLOB_PATH=reviewiq/demo/demo-db.json
```

When `BLOB_READ_WRITE_TOKEN` is set, Atlas stores demo customer state in Vercel Blob instead of `data/demo/demo-db.json`, so review submissions, trip renames, and reset behavior persist on the hosted site. Uploaded review photos are also stored in Blob and saved back into the demo state as hosted URLs.

Without `BLOB_READ_WRITE_TOKEN`, the app falls back to the local JSON demo store for development.

## Vercel deployment

1. Push the repo to GitHub.
2. Import the repo into Vercel as a new project.
3. Create a Vercel Blob store in that project.
4. Add `OPENAI_API_KEY` if you want AI-powered follow-ups / review enhancement in production.
5. Confirm `BLOB_READ_WRITE_TOKEN` is present in the project environment.
6. Deploy.

After deployment, the hosted Atlas demo should behave like local development, except demo state will persist in Blob instead of a local file.

## Current system design

The prototype is intentionally split into an offline data phase and a lightweight online phase.

### Offline phase

- Parse property descriptions and reviews
- Normalize structured fields, rating JSON, and review text
- Build candidate gaps per property
- Attach evidence snippets and question templates
- Embed property and review chunks for semantic retrieval
- Save the derived catalog in `data/generated/catalog.json`
- Save the semantic index in `data/generated/rag-index.json`

### Online phase

- Start a review session for one property
- Rerank precomputed gaps against the traveler’s draft review + ratings
- Retrieve semantic evidence from the property-specific RAG index
- Use a low-cost OpenAI model to choose and phrase one grounded follow-up
- Preview the structured fact that would be updated

## Condensed architecture

To keep the repo lighter, the app now leans on a smaller set of core files:

- [`src/components/reviewiq/reviewiq-client.tsx`](./src/components/reviewiq/reviewiq-client.tsx)
- [`src/lib/reviewiq/session.ts`](./src/lib/reviewiq/session.ts)
- [`src/app/globals.css`](./src/app/globals.css)

That keeps the frontend close to the provided mockup without spreading one flow across many tiny files, while the heavier data-pipeline logic stays separate in `scripts/`.

## Security note

The hackathon key should stay in `.env.local` only. That file is already ignored by git and should never be committed or pasted into a public repo.

## Next recommended steps

- Upgrade voice mode from browser speech APIs to server-backed STT/TTS when you want more reliability
- Persist sessions and candidate updates in Postgres or Supabase
- Add a steward console for approving candidate fact updates
- Add multilingual generation instead of the current language-shell UI

## Verification

- `npm run ingest`
- `npm run check:data`
- `npm run build`
