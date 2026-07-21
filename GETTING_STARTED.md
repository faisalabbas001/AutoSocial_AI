# Getting Started — AutoSocial AI (local dev)

This is the working scaffold of the platform described in [README.md](README.md).
It runs a full **upload → AI pipeline → publish → analytics** loop locally.

## What works today

| Area | Status |
|---|---|
| Dashboard, Videos, Upload, Schedule, Analytics, Settings pages | ✅ Real data from Postgres |
| Upload → creates Video → enqueues processing | ✅ |
| AI pipeline worker (transcribe → subtitle → silence → edit → thumbnail → caption → hashtag) | ✅ Runs, records each step |
| Per-platform caption + hashtag generation (GPT-4o, mock fallback) | ✅ |
| Publish pipeline → per-platform posts + analytics | ✅ (stub publisher) |
| OpenAI (captions/hashtags/Whisper) | ✅ real when `OPENAI_API_KEY` set, else deterministic mock |
| FFmpeg media ops | ✅ run when `ffmpeg` is on PATH, else recorded as skipped |
| Real social OAuth + publishing, R2 uploads | 🔜 wired as stubs / presigned-URL helpers, need app credentials |

## Prerequisites

- Node 18+ (tested on 22), Docker Desktop **running**.

## Setup

```bash
# 1. Install deps
npm install

# 2. Start Postgres + Redis + MinIO
npm run db:up            # docker compose up -d

# 3. Create the schema and seed demo data
npm run prisma:migrate   # applies migrations
npm run prisma:seed      # BrightSmile Dental demo business

# 4. Run the app + the background worker (two terminals)
npm run dev              # http://localhost:3000
npm run workers          # BullMQ worker: video + publish queues
```

Open http://localhost:3000 — it redirects to the dashboard (no login wall, per spec).

## Enabling real AI

Set `OPENAI_API_KEY` in `.env.local`. Without it, captions/hashtags/transcripts
use deterministic mock output so the pipeline is fully runnable offline.

## Enabling real video processing

Install FFmpeg and ensure `ffmpeg` is on your PATH. The pipeline auto-detects it;
without it, media steps are recorded as `skipped` and the pipeline still completes.

## Ports

| Service | Port |
|---|---|
| Next.js app | 3000 |
| Postgres | 5432 |
| Redis | 6379 |
| MinIO (S3) / console | 9000 / 9001 |

## Notable stack deltas from the spec README

- **Next.js 16** (App Router) / **React 19** / **Tailwind v4** (scaffold defaults).
- **Prisma 6** with the classic `url = env(...)` datasource.
- **MinIO** stands in for Cloudflare R2 in local dev (S3-compatible).
- UI primitives are hand-rolled (Button/Card/Badge) rather than the shadcn CLI.
