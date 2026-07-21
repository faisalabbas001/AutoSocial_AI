<div align="center">

# 🚀 AutoSocial AI

### AI-Powered Social Media Automation Platform for Local Businesses

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://www.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

**Stop losing customers to inactive social media. Let AI handle everything.**

[🌐 Live Demo](#) · [📖 Documentation](#) · [🐛 Report Bug](#) · [💡 Request Feature](#) · [💼 Enterprise](#)

</div>

---

## 🚦 Project Status — For Developers

> **📖 This README is the product vision.** For how to **install, run, and demo the
> actual code**, start with **[GETTING_STARTED.md](GETTING_STARTED.md)**.

The pipeline is **built and working end-to-end** (upload → AI processing → publish →
analytics). Here's what's real vs. simulated today:

| Capability | Status |
|---|---|
| Full dashboard (6 pages), upload, videos, schedule, analytics, settings | ✅ **Real** — live Postgres data |
| Real video upload → object storage (MinIO/R2) with progress | ✅ **Real** |
| AI pipeline worker: transcribe → subtitle → silence → edit → thumbnail → caption → hashtag | ✅ **Real**, each step tracked |
| Captions / hashtags / subtitles (Groq or OpenAI; mock fallback) | ✅ **Real** with a key |
| Video editing (silence cut, 9:16 crop, subtitle burn, thumbnail) | ✅ **Real when `ffmpeg` installed**, else skipped |
| **YouTube** publishing — OAuth, upload, thumbnail, real stats | ✅ **Real** with Google creds |
| Instagram / Facebook / TikTok / LinkedIn publishing | 🟡 **Simulated** stub |
| Auth / multi-tenant / billing | ❌ Not built yet |

**Quick start** (details in [GETTING_STARTED.md](GETTING_STARTED.md)):

```bash
npm install
npm run db:up            # Docker: Postgres + Redis + MinIO
npm run prisma:migrate
npm run prisma:seed
npm run dev              # Terminal 1 → http://localhost:3000
npm run workers          # Terminal 2 → background worker
```

---

## 📋 Table of Contents

- [Project Status (developers)](#-project-status--for-developers)
- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution — How AutoSocial AI Reduces Your Costs](#-solution--how-autosocial-ai-reduces-your-costs)
- [Key Features](#-key-features)
- [Dashboard Pages — Complete Guide](#-dashboard-pages--complete-guide)
- [Settings & Social Media Connection](#-settings--social-media-connection)
- [How AI Video Editing Works — In Depth](#-how-ai-video-editing-works--in-depth)
- [How AI Subtitle Generation Works — Whisper AI](#-how-ai-subtitle-generation-works--whisper-ai)
- [How AI Caption Generation Works](#-how-ai-caption-generation-works)
- [How AI Hashtag Generation Works](#-how-ai-hashtag-generation-works)
- [How Thumbnail Generation Works](#-how-thumbnail-generation-works)
- [Multi-Platform Publishing — Detailed](#-multi-platform-publishing--detailed)
- [User Workflow](#-user-workflow)
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Database Schema](#-database-schema)
- [AI Processing Pipeline](#-ai-processing-pipeline)
- [Security](#-security)
- [Scalability](#-scalability)
- [Business Model](#-business-model)
- [Cost Comparison — Why AutoSocial AI](#-cost-comparison--why-autosocial-ai)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Docker Setup](#-docker-setup)
- [API Overview](#-api-overview)
- [AI Assistant — Future Feature](#-ai-assistant--future-feature)
- [Roadmap](#-roadmap)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🎯 Overview

**AutoSocial AI** is an enterprise-grade, AI-powered social media automation platform purpose-built for local businesses. It eliminates the need for manual video editing and social media management by intelligently processing, optimizing, and publishing content across all major social platforms — automatically.

> **Core Mission:** Reduce the cost and time of social media management by 90% for local businesses using AI.

### 🏆 Who Is This For?

| Industry | Use Case |
|---|---|
| 🦷 Dental Clinics | Before/after treatments, tips, patient testimonials |
| 🐾 Pet Clinics & Vets | Animal care content, clinic tours, pet health tips |
| 💇 Salons & Barbers | Transformation videos, style trends, tutorials |
| 🍽️ Restaurants | Food showcases, chef specials, behind-the-scenes |
| 💪 Gyms & Fitness | Workout clips, transformation stories, class promos |
| 👗 Clothing & Tailors | Product showcases, styling tips, new arrivals |
| 🏠 Real Estate Agencies | Property tours, market insights, client testimonials |
| 💆 Beauty Clinics | Treatment showcases, skincare tips, promotions |
| 📣 Marketing Agencies | Multi-client content management at scale |

---

## 🔴 Problem Statement

Local business owners face a critical social media challenge:

```
❌ No time to create and edit videos regularly
❌ Professional video editors cost $500–$2,000/month
❌ Social media managers add another $1,000–$3,000/month
❌ Inconsistent posting leads to inactive accounts
❌ Inactive accounts = lost customers + weak online presence
❌ Competitors with active social media capture their market share
```

**The result:** Businesses with great services lose customers to competitors who simply post more consistently.

---

## ✅ Solution — How AutoSocial AI Reduces Your Costs

AutoSocial AI acts as your **AI Social Media Employee** — working 24/7, never missing a posting schedule, at a fraction of the cost.

### 💸 The #1 Priority: Reducing Your Overhead

The entire platform is designed around one principle: **eliminate the $2,000–$5,000/month cost of hiring human video editors and social media managers.**

| Task | Human Cost | AutoSocial AI | You Save |
|---|---|---|---|
| Video Editing (30 videos/month) | $1,200/month | ✅ Automatic | $1,200 |
| Subtitle Creation | $200/month | ✅ Automatic (Whisper AI) | $200 |
| Caption Writing | $300/month | ✅ Automatic (GPT-4o) | $300 |
| Hashtag Research | $100/month | ✅ Automatic | $100 |
| Thumbnail Design | $150/month | ✅ Automatic | $150 |
| Scheduling & Publishing | $500/month | ✅ Automatic | $500 |
| Analytics Reporting | $300/month | ✅ Automatic | $300 |
| **Total** | **$2,750/month** | **$29–$79/month** | **$2,671+/month** |

> **97% cost reduction** — that's over **$32,000 saved per year** for a single business.

```
✅ Upload a raw video → AI does everything else
✅ Auto-edit, optimize, subtitle, caption, publish
✅ Post to Instagram, TikTok, YouTube Shorts, Facebook, LinkedIn
✅ Cost: $29–$199/month vs $2,000–$5,000/month for human staff
✅ Time saved: 15–20 hours/week per business
✅ No technical skills required — just record and upload
```

---

## ✨ Key Features

### 🎬 AI Video Processing
- **Silence Removal** — Automatically detects and removes silent gaps using audio analysis
- **Auto-Trimming** — Removes dead frames from start and end
- **Vertical Conversion** — Smart crop/resize to 9:16 for Reels/Shorts/TikTok
- **Quality Optimization** — FFmpeg-powered compression without quality loss
- **Brand Logo Overlay** — Automatic watermark placement
- **Subtitle Burning** — Burned-in or soft subtitles via Whisper AI

### 📝 AI Content Generation
- **Caption Generator** — GPT-4o powered captions tailored to business type and platform
- **Hashtag Generator** — Trending, niche, and brand hashtags per platform
- **Thumbnail Creator** — Auto-extracted best frames + text overlay
- **SEO Optimization** — Keywords, descriptions, and titles optimized per platform

### 📅 Multi-Platform Publishing
- **Instagram** — Reels + Posts
- **Facebook** — Videos + Stories
- **TikTok** — Short-form videos
- **YouTube Shorts** — Auto-uploaded
- **LinkedIn** — Professional video posts

### 📊 Analytics Dashboard
- Views, Likes, Comments, Reach per post
- Follower growth tracking
- Best performing content analysis
- Posting history and engagement rates

### 🔔 Smart Notifications
- Upload completed alerts
- Publishing success/failure notifications
- Scheduled post reminders
- Email + Push notifications

---

## 📱 Dashboard Pages — Complete Guide

The dashboard opens directly when a user accesses the platform — **no login wall, no friction**. Every page is designed for non-technical business owners.

### 🏠 Home Dashboard
The central command center showing:
- **Quick Stats** — Total videos uploaded, processed, published this month
- **Recent Activity** — Latest uploads with live processing status bars
- **Publishing Calendar** — Visual calendar showing scheduled and published posts
- **Performance Summary** — This week's total views, likes, and engagement across all platforms
- **Quick Upload Button** — One-click access to upload a new video

### 📤 Upload Page
- **Drag & Drop Zone** — Drop video files directly into the browser
- **Supported Formats** — MP4, MOV, AVI, MKV, WebM
- **Maximum File Size** — 2GB per video
- **Progress Bar** — Real-time upload percentage with estimated time remaining
- **Upload History** — Full list of previous uploads with status indicators (Processing, Ready, Published, Failed)
- **Batch Upload** — Upload multiple videos at once (Professional plan and above)

### 🎬 Videos Page
- **Video Library** — Grid/list view of all uploaded and processed videos
- **Status Filters** — Filter by: All, Processing, Ready for Review, Published, Scheduled
- **Video Preview** — Click any video to see original vs. processed comparison
- **Quick Actions** — Publish, Schedule, Re-process, Download, Delete
- **Search & Sort** — Find videos by title, date, status, or platform

### 📅 Schedule Page
- **Calendar View** — Monthly/weekly calendar with drag-to-schedule functionality
- **Queue Management** — Ordered list of upcoming scheduled posts
- **Optimal Time Suggestions** — AI recommends best posting times per platform based on audience data
- **Bulk Scheduling** — Schedule multiple videos across multiple platforms in one action

### 📊 Analytics Page
- **Overview Dashboard** — Aggregated metrics across all platforms
- **Per-Post Analytics** — Detailed views, likes, comments, shares, reach for each post
- **Platform Comparison** — See which platform performs best for your content
- **Follower Growth Chart** — Track follower increases over time
- **Engagement Rate Trends** — Weekly/monthly engagement trend lines
- **Best Performing Content** — Top 10 posts ranked by engagement
- **Posting History** — Full history of when and where content was published

### ⚙️ Settings Page
Detailed in the next section — this is where users connect social media accounts, configure branding, and manage preferences.

---

## 🔗 Settings & Social Media Connection

The **Settings page** is where business owners configure their accounts and — most importantly — **connect their social media platforms** for automated publishing.

### How Social Media Connection Works

Connecting social accounts is designed to be as simple as possible:

```mermaid
flowchart TD
    A[⚙️ Open Settings Page] --> B[📱 Social Accounts Tab]
    B --> C[Click 'Connect' Button]
    C --> D{Choose Platform}
    D --> E[📸 Instagram]
    D --> F[📘 Facebook]
    D --> G[🎵 TikTok]
    D --> H[▶️ YouTube]
    D --> I[💼 LinkedIn]
    E & F & G & H & I --> J[🔐 OAuth 2.0 Login Popup]
    J --> K[User Grants Permissions]
    K --> L[✅ Account Connected]
    L --> M[🟢 Status: Active]
    M --> N[Ready to Publish!]
```

### Step-by-Step Connection Process

1. **Navigate to Settings** → Click the ⚙️ gear icon in the sidebar
2. **Open Social Accounts Tab** → See all available platforms with Connect/Disconnect buttons
3. **Click "Connect"** next to your desired platform (e.g., Instagram)
4. **OAuth Popup Opens** → You log into your social media account in a secure popup window
5. **Grant Permissions** → Allow AutoSocial AI to publish content on your behalf
6. **Connection Confirmed** → A green ✅ badge appears next to the connected account
7. **Done!** → All future videos can now be published to that platform automatically

### Settings Page — All Tabs

| Tab | What It Contains |
|---|---|
| 🏢 **Business Profile** | Business name, industry type, logo upload, brand colors |
| 📱 **Social Accounts** | Connect/disconnect Instagram, Facebook, TikTok, YouTube, LinkedIn |
| 🎨 **Branding** | Default logo overlay position, subtitle style, watermark settings |
| 🔔 **Notifications** | Toggle email/push notifications for uploads, publishing, failures |
| 📝 **Default Preferences** | Default caption tone, hashtag count, thumbnail style |
| 💳 **Subscription** | Current plan, usage, upgrade/downgrade |
| 🔒 **Security** | Change password, two-factor authentication, active sessions |

### Connected Accounts Dashboard

Once connected, each social account card shows:

```
┌─────────────────────────────────────────────┐
│  📸 Instagram          🟢 Connected         │
│  @yourbusiness                               │
│  Followers: 2,450  │  Posts via AI: 23       │
│  Last Published: 2 hours ago                 │
│  Token Expires: 58 days                      │
│  [📊 View Stats]  [🔄 Reconnect]  [❌ Remove]│
└─────────────────────────────────────────────┘
```

> **Token Auto-Refresh:** AutoSocial AI automatically refreshes OAuth tokens before they expire, so your accounts stay connected without manual intervention.

> **Multi-Account Support:** On the Agency plan, connect up to 50 social accounts across multiple businesses.

---

## 🎬 How AI Video Editing Works — In Depth

AutoSocial AI uses **FFmpeg** — the industry-standard open-source media processing engine — combined with custom AI analysis to transform raw footage into platform-ready content.

### What the AI Does to Your Video

| Step | What Happens | Technology | Why It Matters |
|---|---|---|---|
| **1. Silence Detection** | Scans the audio track and identifies gaps with no speech or music | FFmpeg `silencedetect` filter | Removes boring pauses that cause viewers to scroll away |
| **2. Silence Removal** | Cuts silent segments (configurable: >0.5s, >1s, >2s thresholds) | FFmpeg audio/video sync trim | Creates fast-paced, engaging content that holds attention |
| **3. Auto-Trimming** | Detects dead frames at the start/end of the video | FFmpeg scene detection | Removes the "reaching for the camera" moments |
| **4. Vertical Conversion** | Converts horizontal (16:9) video to vertical (9:16) | FFmpeg crop + scale with smart center detection | Required format for Reels, Shorts, and TikTok |
| **5. Quality Optimization** | Re-encodes with optimal bitrate for each platform | FFmpeg H.264/H.265 encoding | Maintains visual quality while reducing file size by 40-60% |
| **6. Compression** | Reduces file size without perceptible quality loss | FFmpeg CRF (Constant Rate Factor) tuning | Faster uploads, lower bandwidth costs |
| **7. Logo Overlay** | Places your business logo at a configurable position | FFmpeg overlay filter | Professional branding on every video |
| **8. Subtitle Burning** | Renders subtitles directly onto the video frames | FFmpeg ASS/SRT subtitle rendering | 85% of social media videos are watched with sound off |

### Processing Performance

| Video Length | Processing Time | Output Formats |
|---|---|---|
| 30 seconds | ~1 minute | 9:16 (Reels/Shorts/TikTok) |
| 1 minute | ~2-3 minutes | 9:16 + 16:9 (landscape) |
| 5 minutes | ~8-10 minutes | 9:16 + 16:9 + 1:1 (square) |
| 15 minutes | ~15-20 minutes | All formats |

---

## 🎙️ How AI Subtitle Generation Works — Whisper AI

**OpenAI Whisper** is a state-of-the-art automatic speech recognition (ASR) model that powers AutoSocial AI's subtitle engine.

### Why Whisper AI?

- **Accuracy:** 95%+ word-level accuracy across 99 languages
- **Speed:** Processes 1 minute of audio in ~10 seconds
- **Cost:** Open-source model — no per-minute API charges when self-hosted
- **Timestamps:** Provides word-level timestamps for perfectly synced subtitles

### Subtitle Generation Process

```
Raw Video Audio → Whisper v3 Model → Word-Level Transcription
→ Sentence Grouping → SRT/ASS File → Style Formatting
→ Burned onto Video OR Soft Subtitle Track
```

### Subtitle Styles Available

| Style | Description | Best For |
|---|---|---|
| **Classic** | White text, black outline, bottom-center | Professional content |
| **Bold Pop** | Large bold text with colored background | Attention-grabbing Reels |
| **Karaoke** | Word-by-word highlight as spoken | Music/storytelling |
| **Minimal** | Small, clean text at bottom | Aesthetic content |

> **Multi-Language Support:** Whisper automatically detects the spoken language. Subtitles can be generated in the original language or auto-translated to 50+ languages.

---

## ✍️ How AI Caption Generation Works

AutoSocial AI uses **OpenAI GPT-4o** to generate platform-specific, engagement-optimized captions for every video.

### How It Works

1. **Transcript Analysis** — GPT-4o reads the Whisper-generated transcript to understand the video content
2. **Business Context** — The AI considers your business type (dentist, salon, gym, etc.) and brand voice
3. **Platform Optimization** — Generates different caption styles for each platform:
   - **Instagram** — Emotional, story-driven, with line breaks and emoji
   - **TikTok** — Short, punchy, trend-aware with hooks
   - **YouTube** — SEO-optimized description with timestamps and keywords
   - **Facebook** — Conversational, community-focused
   - **LinkedIn** — Professional, value-driven, thought-leadership style
4. **CTA Included** — Each caption includes a relevant call-to-action ("Book Now", "Visit Us", "Follow for More")

### Example Output

> **Input:** A 45-second video of a dentist performing teeth whitening
>
> **Instagram Caption Generated:**
> ✨ This transformation took just 45 minutes! ✨
>
> Watch this incredible teeth whitening journey — from stained to stunning.
>
> 📍 Dr. Smith's Dental Clinic
> 📞 Book your appointment today → Link in bio
>
> #TeethWhitening #DentalCare #SmileMakeover #BeforeAndAfter

---

## #️⃣ How AI Hashtag Generation Works

Hashtags are critical for discoverability. AutoSocial AI generates a smart mix of hashtags using GPT-4o analysis.

### Hashtag Strategy (per post)

| Category | Count | Example | Purpose |
|---|---|---|---|
| 🔥 **Trending** | 3-5 | #SmileMakeover #GlowUp | Ride viral waves |
| 🎯 **Niche** | 5-8 | #DentistLife #TeethWhitening | Reach target audience |
| 📍 **Local** | 2-3 | #NYCDentist #ManhattanSmile | Local SEO & discovery |
| 🏷️ **Brand** | 1-2 | #DrSmithDental #AutoSocialAI | Brand recognition |
| **Total** | **11-18** | | **Optimal range per platform** |

### Platform-Specific Hashtag Counts

- **Instagram:** 20-30 hashtags (in first comment for cleaner look)
- **TikTok:** 5-8 hashtags (fewer = better on TikTok)
- **YouTube Shorts:** 3-5 hashtags (in description + title)
- **LinkedIn:** 3-5 hashtags (professional, industry-specific)
- **Facebook:** 3-5 hashtags (minimal usage, focus on reach)

---

## 🖼️ How Thumbnail Generation Works

AutoSocial AI generates eye-catching thumbnails automatically — no Photoshop or Canva needed.

### Process

1. **Frame Extraction** — FFmpeg analyzes the entire video and extracts the **top 5 sharpest, most visually appealing frames** using scene-change detection and blur analysis
2. **Face Detection** — If faces are present, the AI selects frames where faces are clearly visible and well-lit
3. **Text Overlay** — Adds engaging title text derived from the AI-generated caption
4. **Brand Integration** — Overlays your business logo in a non-intrusive position
5. **Format Optimization** — Generates thumbnails in platform-specific dimensions:

| Platform | Dimensions | Format |
|---|---|---|
| YouTube Shorts | 1280 × 720 | JPG/PNG |
| Instagram Reels | 1080 × 1920 | JPG |
| TikTok | 1080 × 1920 | JPG |
| Facebook | 1280 × 720 | JPG |
| LinkedIn | 1200 × 627 | PNG |

> **User Control:** Before publishing, you can choose from the 5 generated thumbnail options or upload your own custom thumbnail.

---

## 📲 Multi-Platform Publishing — Detailed

### Supported Platforms & Capabilities

| Platform | Content Type | Scheduling | Analytics | API Used |
|---|---|---|---|---|
| 📸 **Instagram** | Reels, Feed Posts | ✅ Yes | ✅ Views, Likes, Comments, Reach | Instagram Graph API |
| 📘 **Facebook** | Videos, Stories, Reels | ✅ Yes | ✅ Views, Reactions, Shares | Facebook Graph API |
| 🎵 **TikTok** | Short Videos | ✅ Yes | ✅ Views, Likes, Comments | TikTok Content Posting API |
| ▶️ **YouTube** | Shorts, Regular Videos | ✅ Yes | ✅ Views, Likes, Subscribers | YouTube Data API v3 |
| 💼 **LinkedIn** | Video Posts | ✅ Yes | ✅ Views, Reactions, Comments | LinkedIn Marketing API |

### Publishing Options

- **⚡ Instant Publish** — Publish immediately to selected platforms with one click
- **📅 Scheduled Publish** — Pick a date, time, and timezone — the system publishes automatically
- **🤖 AI-Optimized Timing** — Let the AI choose the best time based on your audience engagement data
- **📢 Multi-Platform** — Publish to all 5 platforms simultaneously with platform-specific captions and hashtags

## 🔄 User Workflow

```mermaid
flowchart TD
    A[🏪 Business Owner] --> B[📱 Dashboard]
    B --> C[📤 Upload Raw Video]
    C --> D[🔄 AI Processing Queue]
    D --> E[🎙️ Speech-to-Text / Whisper AI]
    E --> F[📝 Subtitle Generation]
    F --> G[🔇 Silence Detection & Removal]
    G --> H[✂️ Auto Video Editing / FFmpeg]
    H --> I[🏷️ Brand Logo Overlay]
    I --> J[🖼️ Thumbnail Generation]
    J --> K[✍️ AI Caption Generation / GPT-4o]
    K --> L[#️⃣ AI Hashtag Generation]
    L --> M[🔍 SEO Optimization]
    M --> N[👁️ Preview Screen]
    N --> O{Approve?}
    O -- ✅ Yes --> P[📅 Schedule or Publish Now]
    O -- ✏️ Edit --> N
    P --> Q[📲 Multi-Platform Publishing]
    Q --> R[Instagram]
    Q --> S[TikTok]
    Q --> T[YouTube Shorts]
    Q --> U[Facebook]
    Q --> V[LinkedIn]
    R & S & T & U & V --> W[📊 Analytics Dashboard]
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15 | Full-stack React framework, App Router, SSR |
| React | 18 | UI component library |
| TypeScript | 5.0 | Type safety across the entire codebase |
| Tailwind CSS | 3.4 | Utility-first styling, responsive design |
| Shadcn UI | Latest | Accessible, customizable component library |
| React Hook Form | 7 | Performant form handling with minimal re-renders |
| Zod | 3 | Schema validation for forms and API inputs |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Next.js API Routes | 15 | Serverless API endpoints, co-located with frontend |
| PostgreSQL | 16 | Primary relational database |
| Prisma ORM | 5 | Type-safe database access, migrations |
| Redis | 7 | Caching, session storage, queue backend |
| BullMQ | 5 | Distributed job queue for AI processing workers |
| Pino | 8 | High-performance structured logging |

> **Note on Backend Architecture:** The platform uses Next.js API Routes for rapid development. For teams requiring microservices, NestJS can replace this layer — both share identical Prisma/PostgreSQL/Redis infrastructure.

### AI & Media
| Technology | Purpose |
|---|---|
| OpenAI GPT-4o | Caption generation, hashtag suggestions, content ideas |
| OpenAI Whisper | Speech-to-text, subtitle generation |
| FFmpeg | Video processing, format conversion, compression |
| Sharp | Image processing for thumbnails |

### Infrastructure
| Technology | Purpose |
|---|---|
| Cloudflare R2 | Primary object storage (S3-compatible, zero egress cost) |
| Docker + Compose | Containerization and local orchestration |
| GitHub Actions | CI/CD pipeline, automated testing and deployment |
| Hetzner/Contabo VPS | Cost-effective production hosting |
| Sentry | Error tracking and performance monitoring |

---

## 📁 Folder Structure

```
autosocial-ai/
├── 📁 app/                          # Next.js App Router
│   ├── 📁 (dashboard)/              # Dashboard route group
│   │   ├── 📁 dashboard/            # Main dashboard page
│   │   ├── 📁 upload/               # Video upload page
│   │   ├── 📁 videos/               # Video management
│   │   ├── 📁 schedule/             # Post scheduling
│   │   ├── 📁 analytics/            # Analytics views
│   │   ├── 📁 settings/             # Account & business settings
│   │   └── 📁 social-accounts/      # Social media connections
│   ├── 📁 api/                      # API route handlers
│   │   ├── 📁 upload/               # Video upload endpoints
│   │   ├── 📁 videos/               # Video CRUD operations
│   │   ├── 📁 ai/                   # AI processing triggers
│   │   ├── 📁 publish/              # Social publishing endpoints
│   │   ├── 📁 analytics/            # Analytics data endpoints
│   │   ├── 📁 webhooks/             # Platform webhooks
│   │   └── 📁 notifications/        # Notification handlers
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Landing/home page
│
├── 📁 components/                   # Reusable UI components
│   ├── 📁 ui/                       # Shadcn base components
│   ├── 📁 dashboard/                # Dashboard-specific components
│   ├── 📁 video/                    # Video player, uploader, editor
│   ├── 📁 analytics/                # Charts and metrics components
│   └── 📁 shared/                   # Global shared components
│
├── 📁 lib/                          # Core utilities and services
│   ├── 📁 ai/                       # AI service integrations
│   │   ├── caption.ts               # GPT-4o caption generation
│   │   ├── hashtag.ts               # Hashtag generation logic
│   │   └── whisper.ts               # Whisper transcription
│   ├── 📁 media/                    # Media processing
│   │   ├── ffmpeg.ts                # FFmpeg processing pipeline
│   │   ├── thumbnail.ts             # Thumbnail extraction
│   │   └── upload.ts                # File upload utilities
│   ├── 📁 queue/                    # BullMQ job definitions
│   │   ├── video.queue.ts           # Video processing queue
│   │   └── publish.queue.ts         # Publishing queue
│   ├── 📁 social/                   # Social platform SDKs
│   │   ├── instagram.ts             # Instagram Graph API
│   │   ├── tiktok.ts                # TikTok API
│   │   ├── youtube.ts               # YouTube Data API
│   │   ├── facebook.ts              # Facebook API
│   │   └── linkedin.ts              # LinkedIn API
│   ├── 📁 storage/                  # Object storage (R2/S3)
│   ├── db.ts                        # Prisma client singleton
│   ├── redis.ts                     # Redis client
│   └── utils.ts                     # Shared utility functions
│
├── 📁 workers/                      # BullMQ background workers
│   ├── video.worker.ts              # Main video processing worker
│   └── publish.worker.ts            # Social publishing worker
│
├── 📁 prisma/                       # Database layer
│   ├── schema.prisma                # Full database schema
│   └── 📁 migrations/               # Migration history
│
├── 📁 hooks/                        # Custom React hooks
├── 📁 store/                        # Client state (Zustand)
├── 📁 types/                        # TypeScript type definitions
├── 📁 config/                       # App configuration
├── 📁 public/                       # Static assets
├── docker-compose.yml               # Local development stack
├── Dockerfile                       # Production container
├── .env.example                     # Environment variables template
└── package.json
```

---

## 🗄️ Database Schema

```mermaid
erDiagram
    User ||--o{ Business : owns
    Business ||--o{ SocialAccount : connects
    Business ||--o{ Video : uploads
    Video ||--o{ VideoJob : processes
    Video ||--o{ Caption : has
    Video ||--o{ Hashtag : has
    Video ||--o{ Thumbnail : has
    Video ||--o{ ScheduledPost : schedules
    ScheduledPost ||--o{ Analytics : tracks
    User ||--o{ Notification : receives
    User ||--o{ Subscription : subscribes

    User {
        uuid id PK
        string email
        string name
        string avatar
        string role
        timestamp createdAt
    }

    Business {
        uuid id PK
        uuid userId FK
        string name
        string industry
        string logoUrl
        string brandColor
        timestamp createdAt
    }

    SocialAccount {
        uuid id PK
        uuid businessId FK
        string platform
        string accountId
        string accessToken
        string refreshToken
        timestamp expiresAt
    }

    Video {
        uuid id PK
        uuid businessId FK
        string title
        string originalUrl
        string processedUrl
        string status
        int duration
        int fileSize
        timestamp createdAt
    }

    VideoJob {
        uuid id PK
        uuid videoId FK
        string jobType
        string status
        json result
        string errorMessage
        timestamp processedAt
    }

    ScheduledPost {
        uuid id PK
        uuid videoId FK
        uuid socialAccountId FK
        string platform
        string caption
        string[] hashtags
        string thumbnailUrl
        string status
        timestamp scheduledAt
        timestamp publishedAt
    }

    Analytics {
        uuid id PK
        uuid scheduledPostId FK
        int views
        int likes
        int comments
        int shares
        int reach
        float engagementRate
        timestamp recordedAt
    }

    Subscription {
        uuid id PK
        uuid userId FK
        string plan
        string status
        timestamp currentPeriodEnd
    }
```

---

## ⚙️ AI Processing Pipeline

```mermaid
flowchart LR
    A[📤 Video Upload] --> B[☁️ Store in R2]
    B --> C[📋 Add to BullMQ Queue]
    C --> D[👷 Worker Picks Up Job]
    D --> E[🎙️ Whisper: Speech-to-Text]
    E --> F[📝 Generate SRT Subtitles]
    F --> G[🔇 FFmpeg: Remove Silence]
    G --> H[✂️ FFmpeg: Trim & Resize]
    H --> I[🏷️ FFmpeg: Add Logo Watermark]
    I --> J[🖼️ Extract Thumbnail Frame]
    J --> K[✍️ GPT-4o: Generate Caption]
    K --> L[#️⃣ GPT-4o: Generate Hashtags]
    L --> M[📦 Final Video Packaged]
    M --> N[✅ Mark Job Complete]
    N --> O[🔔 Notify User]
    O --> P[👁️ User Preview & Approve]
    P --> Q[📅 Schedule or Publish]
    Q --> R[📲 Platform APIs]
    R --> S[📊 Analytics Collected]
```

### Processing Details

| Step | Technology | Description |
|---|---|---|
| Upload | Next.js + R2 | Chunked multipart upload, up to 2GB |
| Queuing | BullMQ + Redis | Priority queues, retry logic, job tracking |
| Speech-to-Text | Whisper v3 | Multi-language support, word-level timestamps |
| Silence Removal | FFmpeg silencedetect | Configurable threshold and duration |
| Video Editing | FFmpeg | Trim, resize, compress, subtitle burn |
| Thumbnail | Sharp + FFmpeg | Best-frame extraction + text overlay |
| Caption | GPT-4o | Business-type-aware, platform-specific |
| Hashtags | GPT-4o | Trending + niche + brand hashtags |
| Publishing | Platform APIs | OAuth 2.0, token refresh, retry on failure |

---

## 🔒 Security

> **Note on Access:** The platform is designed for rapid onboarding. The dashboard is accessible immediately without a login wall, ensuring business owners can explore the tool instantly. Authentication (OAuth/Email) is only required when saving sensitive settings or connecting social accounts.

| Security Layer | Implementation |
|---|---|
| **Authentication** | Direct dashboard access with optional secure sessions for advanced settings |
| **Authorization** | Role-Based Access Control (RBAC) — Owner, Manager, Viewer |
| **API Security** | Rate limiting via Redis (100 req/min per user) |
| **Input Validation** | Zod schemas on all API routes |
| **File Uploads** | MIME type validation, size limits, virus scan hooks |
| **Secrets** | Environment variables, never committed to git |
| **HTTPS** | TLS termination at reverse proxy (Nginx/Caddy) |
| **Audit Logs** | All destructive actions logged with user + timestamp |
| **SQL Injection** | Prisma ORM parameterized queries |
| **XSS Prevention** | Next.js built-in output escaping |

---

## 📈 Scalability

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   [App Server]  [App Server]  [App Server]   ← Horizontal Scaling
        │
        ├── PostgreSQL (Primary + Read Replicas)
        ├── Redis Cluster (Cache + Queue)
        ├── BullMQ Workers (Auto-scaled)
        └── Cloudflare R2 (Unlimited Storage)
```

| Concern | Solution |
|---|---|
| **Video Processing** | BullMQ workers scale independently from web servers |
| **Database** | PostgreSQL with read replicas for analytics queries |
| **Storage** | Cloudflare R2 — S3-compatible, zero egress cost |
| **Caching** | Redis caches API responses, session data, job results |
| **CDN** | Cloudflare CDN for processed video delivery |
| **Stateless API** | No server-side sessions — scales horizontally |
| **Queue Backpressure** | BullMQ rate limiting prevents worker overload |

---

## 💰 Business Model

| Plan | Price | Videos/Month | Platforms | Users | AI Features |
|---|---|---|---|---|---|
| 🆓 **Free** | $0 | 5 | 2 | 1 | Basic editing, subtitles |
| 🚀 **Starter** | $29/mo | 30 | 3 | 1 | Full AI editing, captions, hashtags |
| 💼 **Professional** | $79/mo | 100 | 5 | 3 | + Analytics, scheduling, brand templates |
| 🏢 **Agency** | $199/mo | 500 | 5 | 10 | + Multi-business, white-label, priority processing |
| 🏭 **Enterprise** | Custom | Unlimited | 5+ | Unlimited | + Dedicated support, custom AI models, SLA |

---

## 💸 Cost Comparison — Why AutoSocial AI

This is the core value proposition. Here's an honest, detailed cost breakdown:

### Monthly Cost: Traditional Approach vs AutoSocial AI

| Expense | Hiring Humans | AutoSocial AI (Pro Plan) |
|---|---|---|
| Video Editor (part-time) | $1,200–$2,000 | $0 (AI automated) |
| Social Media Manager | $1,000–$3,000 | $0 (AI automated) |
| Subtitle Services | $150–$300 | $0 (Whisper AI) |
| Thumbnail Designer | $100–$200 | $0 (AI automated) |
| Scheduling Tool (Buffer/Hootsuite) | $50–$100 | $0 (built-in) |
| Analytics Tool | $30–$100 | $0 (built-in) |
| **Monthly Total** | **$2,530–$5,700** | **$79** |
| **Annual Total** | **$30,360–$68,400** | **$948** |
| **You Save** | — | **$29,412–$67,452/year** |

### Time Savings Per Week

| Task | Manual Time | With AutoSocial AI |
|---|---|---|
| Editing 5 videos | 10 hours | 0 hours (AI) |
| Writing 5 captions | 2 hours | 0 hours (AI) |
| Researching hashtags | 1 hour | 0 hours (AI) |
| Creating thumbnails | 2 hours | 0 hours (AI) |
| Scheduling posts | 1 hour | 5 minutes |
| Checking analytics | 1 hour | 5 minutes |
| **Weekly Total** | **17 hours** | **10 minutes** |

> **Bottom Line:** AutoSocial AI reduces social media management costs by **97%** and saves **17+ hours per week.** For a local business owner, that's the equivalent of hiring a full-time employee — for less than the price of a monthly Netflix subscription.

---

## 🚀 Installation

> ℹ️ **These are the original spec steps.** For the **tested, up-to-date** setup
> (Groq AI, MinIO, ffmpeg, YouTube OAuth, troubleshooting), follow
> **[GETTING_STARTED.md](GETTING_STARTED.md)**.

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
docker >= 24.0.0
docker-compose >= 2.0.0
```

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/autosocial-ai.git
cd autosocial-ai

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local

# 4. Start infrastructure (PostgreSQL + Redis)
docker-compose up -d postgres redis

# 5. Run database migrations
npx prisma migrate dev

# 6. Seed demo data
npx prisma db seed

# 7. Start development server
npm run dev

# 8. Start background workers (separate terminal)
npm run workers
```

Visit `http://localhost:3000` — the dashboard loads directly, no login required in development mode.

---

## 🔐 Environment Variables

```bash
# ─── Database ───────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/autosocial"

# ─── Redis ──────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ─── OpenAI ─────────────────────────────────────────────
OPENAI_API_KEY="sk-..."

# ─── Storage (Cloudflare R2) ─────────────────────────────
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="autosocial-videos"
R2_PUBLIC_URL="https://your-bucket.r2.dev"

# ─── Social Media APIs ───────────────────────────────────
INSTAGRAM_APP_ID="..."
INSTAGRAM_APP_SECRET="..."
TIKTOK_CLIENT_KEY="..."
TIKTOK_CLIENT_SECRET="..."
YOUTUBE_CLIENT_ID="..."
YOUTUBE_CLIENT_SECRET="..."
FACEBOOK_APP_ID="..."
FACEBOOK_APP_SECRET="..."
LINKEDIN_CLIENT_ID="..."
LINKEDIN_CLIENT_SECRET="..."

# ─── App Config ──────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# ─── Monitoring ──────────────────────────────────────────
SENTRY_DSN="https://..."
```

---

## 🐳 Docker Setup

### Development

```yaml
# docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: autosocial
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Production

```bash
# Build production image
docker build -t autosocial-ai:latest .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload raw video file |
| `GET` | `/api/videos` | List all videos |
| `GET` | `/api/videos/:id` | Get video details + job status |
| `POST` | `/api/ai/process/:id` | Trigger AI processing |
| `GET` | `/api/ai/status/:jobId` | Get processing job status |
| `POST` | `/api/publish` | Publish to social platforms |
| `POST` | `/api/schedule` | Schedule a post |
| `GET` | `/api/analytics` | Get analytics overview |
| `GET` | `/api/analytics/:postId` | Get per-post analytics |
| `POST` | `/api/social/connect` | Connect social account |
| `DELETE` | `/api/social/:id` | Disconnect social account |

---

## 🤖 AI Assistant — Future Feature

A planned intelligent assistant that acts as your **virtual social media strategist:**

| Feature | Description |
|---|---|
| 💡 **Video Ideas** | AI suggests content ideas based on your industry, audience, and trending topics |
| 📈 **Trending Topics** | Real-time trending topic alerts for your niche |
| ⏰ **Optimal Posting Times** | Data-driven recommendations for when your audience is most active |
| 📅 **Content Calendar** | AI generates a full month content calendar with themes and video suggestions |
| 🎄 **Seasonal Campaigns** | Auto-suggests holiday-specific and seasonal promotion ideas |
| 🏆 **Competitor Analysis** | Monitors competitor social media activity and suggests how to outperform them |
| 📊 **Performance Insights** | Weekly AI-generated reports explaining what content worked and why |

> This feature will be available in Q1 2026 for Professional plan and above.

---

## 🗺️ Roadmap

### Q3 2025 — Foundation
- [x] Video upload & storage
- [x] AI processing pipeline
- [x] Multi-platform publishing
- [x] Analytics dashboard

### Q4 2025 — Intelligence
- [ ] AI Content Calendar
- [ ] Trend Analysis & Topic Suggestions
- [ ] Multi-language Subtitle Translation
- [ ] Custom Brand Templates

### Q1 2026 — Scale
- [ ] AI Avatar Videos
- [ ] AI Voiceover Generation
- [ ] Automatic Highlight Detection
- [ ] AI Comment Reply Suggestions

### Q2 2026 — Enterprise
- [ ] CRM Integration (HubSpot, Salesforce)
- [ ] WhatsApp Business Notifications
- [ ] White-label Solution for Agencies
- [ ] Advanced AI Editing Styles

---

## ❓ FAQ

**Q: How long does AI processing take?**
> Typically 2–5 minutes for a 1-minute video. Longer videos may take 10–15 minutes.

**Q: What video formats are supported?**
> MP4, MOV, AVI, MKV, WebM. Maximum file size: 2GB.

**Q: Can I edit the AI-generated captions before publishing?**
> Yes. Every output goes through a preview screen where you can edit captions, hashtags, and thumbnails before approving.

**Q: Which social platforms are supported?**
> Instagram, TikTok, YouTube Shorts, Facebook, and LinkedIn. Twitter/X support coming soon.

**Q: Is my video data secure?**
> Yes. Videos are stored in encrypted Cloudflare R2 buckets and deleted from processing servers after completion.

---

## 🤝 Contributing

We welcome contributions! Please read our contribution guide before submitting a PR.

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/amazing-feature

# 3. Make your changes and commit
git commit -m "feat: add amazing feature"

# 4. Push to your fork
git push origin feature/amazing-feature

# 5. Open a Pull Request
```

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `chore:` — Maintenance tasks
- `perf:` — Performance improvements

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 📬 Contact

| Channel | Link |
|---|---|
| 🌐 Website | [autosocial.ai](#) |
| 📧 Email | hello@autosocial.ai |
| 🐦 Twitter | [@autosocialai](#) |
| 💼 LinkedIn | [AutoSocial AI](#) |
| 💬 Discord | [Join Community](#) |

---

<div align="center">

**Built with ❤️ to help local businesses grow online**

⭐ **Star this repo** if AutoSocial AI saves your time and money!

</div>
