# Getting Started — AutoSocial AI

Developer onboarding, setup, and demo guide. For the full product vision see
[README.md](README.md).

AutoSocial AI turns a raw video into edited, subtitled, captioned, multi-platform
social posts. This repo is a **working full-stack implementation** of that pipeline:
**upload → AI processing → publish → analytics**, all runnable locally.

---

## 1. What's actually built (real vs simulated)

Be clear on this when demoing — some parts are fully live, others are simulated
until each external integration is completed.

| Capability | Status |
|---|---|
| Dashboard, Videos, Upload, Schedule, Analytics, Settings pages | ✅ **Real** — live Postgres data |
| Upload a real video → stored in object storage → progress bar | ✅ **Real** (MinIO/R2) |
| AI pipeline worker (7 tracked steps, live job status) | ✅ **Real** |
| Transcription / subtitles (Whisper) | ✅ **Real** with a key, deterministic mock without |
| Captions + hashtags, per platform | ✅ **Real** with a key, mock without |
| Video editing: silence cut, 9:16 crop, subtitle burn, logo, thumbnail | ✅ **Real when `ffmpeg` is installed**, else steps skip |
| Publish / schedule flow + analytics dashboard | ✅ **Real** UI + data |
| **YouTube** publish — OAuth, upload, custom thumbnail, real stats | ✅ **Real** once Google creds are set |
| Instagram / Facebook / TikTok / LinkedIn publish | 🟡 **Simulated** stub (creates posts + demo metrics) |
| Auth / multi-tenant / billing | ❌ Not built (single seeded demo business) |

---

## 2. Prerequisites

- **Node 18+** (tested on 22)
- **Docker Desktop** — must be **running** before you start (it hosts Postgres, Redis, MinIO)
- Optional: **ffmpeg** for real video editing, **Google Cloud OAuth app** for real YouTube publishing

---

## 3. Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure (Postgres + Redis + MinIO) — Docker Desktop must be running
npm run db:up

# 3. Create the database schema + demo data
npm run prisma:migrate      # applies migrations
npm run prisma:seed         # seeds the "BrightSmile Dental" demo business

# 4. Run the app and the worker — in TWO separate terminals:
npm run dev                 # Terminal 1 → http://localhost:3000
npm run workers             # Terminal 2 → BullMQ worker (processing + publishing)
```

Open **http://localhost:3000** — it redirects straight to the dashboard (no login
wall, by design). **Both** `dev` and `workers` must run: without the worker,
uploads sit at `QUEUED` forever.

> First run: copy `.env.example` to `.env.local` if it doesn't exist. The DB/Redis/
> MinIO values already match the Docker defaults, so it works out of the box.

---

## 4. Configuration & API keys

All secrets live in **`.env.local`** (gitignored). See [.env.example](.env.example)
for the full list.

### Database + Redis + Storage — ✅ zero config
Defaults point at the Docker containers. Nothing to do for local dev.

### AI provider (captions, hashtags, subtitles)
Precedence: **`GROQ_API_KEY` → `OPENAI_API_KEY` → deterministic mock**.

- **Groq (recommended for demos — free, no credit card, OpenAI-compatible):**
  get a key at <https://console.groq.com/keys>, then set `GROQ_API_KEY` in `.env.local`.
  Uses Llama 3.3 70B for text and Whisper-large-v3 for transcription.
- **OpenAI (production quality, paid):** set `OPENAI_API_KEY`.
- **Neither:** the pipeline still runs using realistic mock output.

### Real video editing (ffmpeg)
Install ffmpeg and either put it on your PATH or set `FFMPEG_PATH` in `.env.local`:

```
FFMPEG_PATH="C:/ffmpeg/bin/ffmpeg.exe"
```

Windows: download a static build from <https://www.gyan.dev/ffmpeg/builds/> ("essentials"),
or `winget install Gyan.FFmpeg` / `choco install ffmpeg`. Without ffmpeg the media
steps are recorded as `skipped` and the processed video equals the original.

### YouTube (live publishing integration)
1. <https://console.cloud.google.com> → create a project
2. **APIs & Services → Library** → enable **"YouTube Data API v3"**
3. **OAuth consent screen** → External → add yourself as a **Test user**
4. **Credentials → Create OAuth client ID → Web application**, with authorized redirect URI:
   ```
   http://localhost:3000/api/social/youtube/callback
   ```
5. Put the Client ID/Secret in `.env.local`:
   ```
   YOUTUBE_CLIENT_ID="....apps.googleusercontent.com"
   YOUTUBE_CLIENT_SECRET="...."
   YOUTUBE_PRIVACY_STATUS="private"   # private (safe) | unlisted | public
   ```
6. **Settings → YouTube → Connect** in the app, approve, then publish.

> ⚠️ Any time you edit `.env.local`, **restart `npm run dev` and `npm run workers`** —
> env vars are only read at startup.

---

## 5. How it works (architecture)

```
Browser ──upload──▶ /api/upload ──▶ MinIO (video bytes)
                         │
                         ▼ enqueue
                   Redis + BullMQ ──▶ Worker (npm run workers)
                                          │
                        lib/pipeline/process-video.ts
                        1 transcribe (Whisper)   → downloads file, real/mock
                        2 subtitle (SRT)
                        3 silence removal ┐
                        4 edit: 9:16 crop │ ffmpeg (if installed)
                           + subtitle burn│
                           + logo overlay ┘
                        5 thumbnail (extract frame → upload)
                        6 captions  (per platform, Groq/OpenAI)
                        7 hashtags  (per platform)
                                          │
                                    Video = READY
                                          │
Settings ▶ connect account      Videos ▶ Publish dialog ──▶ /api/publish
                                          │
                                    Redis + BullMQ
                                          ▼
                        lib/pipeline/publish-post.ts
                        getPublisher(platform):
                          YOUTUBE + creds → real upload (lib/social/youtube.ts)
                          else           → stub publisher
                                          │
                                 ScheduledPost = PUBLISHED + Analytics
```

Each pipeline step is written to the `VideoJob` table so the UI can show live
progress and per-step results.

---

## 6. Project structure

```
app/
  (dashboard)/           # Dashboard, Upload, Videos, Schedule, Analytics, Settings
  api/
    upload/              # multipart upload → MinIO → create Video → enqueue
    videos/              # list / get / delete
    publish/             # create ScheduledPosts + enqueue publishing
    analytics/           # aggregated metrics
    social/
      youtube/connect    # start Google OAuth
      youtube/callback   # exchange code, store channel + tokens
      disconnect         # remove a connected account
components/              # UI primitives (Button/Card/Badge), dashboard, video, analytics
lib/
  ai/                    # client (provider selection), whisper, caption, hashtag
  media/ffmpeg.ts        # ffmpeg ops (silence, crop, subtitle burn, logo, thumbnail)
  social/                # publisher interface, youtube (real), stub for others
  pipeline/              # process-video, publish-post (the worker logic)
  queue/                 # BullMQ queues + enqueue helpers
  storage/               # S3/R2 client (MinIO in dev)
  db.ts  redis.ts  current.ts  env.ts  logger.ts  utils.ts
workers/                 # BullMQ worker entrypoint (npm run workers)
prisma/                  # schema, migrations, seed
```

---

## 7. Giving a client demo

### Pre-demo checklist (~5 min)
1. `npm run db:up` → `npm run prisma:migrate` → `npm run prisma:seed`
2. Set `GROQ_API_KEY` (free) → real AI captions/hashtags/subtitles
3. **Recommended:** install ffmpeg → real editing + real thumbnails
4. **Optional but impressive:** add Google OAuth creds → real YouTube publish
5. `npm run dev` + `npm run workers`

### 3-minute demo script
1. **Dashboard** — quick stats, recent activity.
2. **Upload** a 15–30s clip → real progress bar.
3. **Videos** — watch it go `PROCESSING → READY`; open it to show the **7 live AI
   steps** and the **real per-platform captions/hashtags**.
4. **Publish** dialog → select platforms → Publish now (connect YouTube live if creds set).
5. **Analytics** — engagement charts across platforms.

### Honest one-liner for the client
> "AI content generation and YouTube publishing are fully live today. The other
> four platforms are integrated at the pipeline level and go live as each
> platform's API is approved — a review process, not additional core engineering."

> If ffmpeg isn't installed, don't play the *output* video side-by-side (it equals
> the source); narrate the pipeline steps instead — they're all real and visible.

---

## 8. Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run workers` | BullMQ worker (video processing + publishing) |
| `npm run db:up` / `npm run db:down` | Start / stop Docker (Postgres, Redis, MinIO) |
| `npm run prisma:migrate` | Apply DB migrations |
| `npm run prisma:seed` | Load the demo business + videos |
| `npm run prisma:studio` | Browse the DB in Prisma Studio |
| `npx tsc --noEmit` | Typecheck |

### Ports
| Service | Port |
|---|---|
| Next.js app | 3000 |
| Postgres | 5432 |
| Redis | 6379 |
| MinIO API / console | 9000 / 9001 |

---

## 9. Troubleshooting

**`docker ... cannot find the file specified` / Prisma `PrismaClientInitializationError`**
Docker Desktop isn't running (or its daemon dropped). Open Docker Desktop, wait ~1 min,
then `npm run db:up`.

**`EPERM: operation not permitted, rename ...query_engine-windows.dll.node`**
A running `node` process (dev server or worker) is locking the Prisma engine.
**Stop `npm run dev` and `npm run workers` before running any `prisma` command.**

**Port 3000 already in use**
Another dev server is running. Stop it, or the app will fail to bind.

**Uploads stay at `QUEUED`**
The worker isn't running — start `npm run workers`.

**Captions look generic / same every time**
No AI key set — it's using mock output. Add `GROQ_API_KEY` and restart both processes.

**YouTube Connect says "not configured"**
`YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` are missing, or you didn't restart after adding them.

---

## 10. Stack notes (deltas from the spec README)

- **Next.js 16** (App Router) / **React 19** / **Tailwind v4** — scaffold defaults.
- **Prisma 6** with the classic `url = env(...)` datasource (pinned — do not bump to 7).
- **MinIO** stands in for Cloudflare R2 locally (S3-compatible).
- **Groq** added as the default free AI provider (OpenAI-compatible).
- UI primitives are hand-rolled (Button/Card/Badge) instead of the shadcn CLI.
- `lucide-react` here has no brand icons — platform icons use generic ones.
