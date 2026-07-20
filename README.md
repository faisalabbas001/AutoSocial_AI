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

## 📋 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [User Workflow](#-user-workflow)
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Database Schema](#-database-schema)
- [AI Processing Pipeline](#-ai-processing-pipeline)
- [Security](#-security)
- [Scalability](#-scalability)
- [Business Model](#-business-model)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Docker Setup](#-docker-setup)
- [API Overview](#-api-overview)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

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

## ✅ Solution

AutoSocial AI acts as your **AI Social Media Employee** — working 24/7, never missing a posting schedule, at a fraction of the cost.

```
✅ Upload a raw video → AI does everything else
✅ Auto-edit, optimize, subtitle, caption, publish
✅ Post to Instagram, TikTok, YouTube Shorts, Facebook, LinkedIn
✅ Cost: $29–$199/month vs $2,000–$5,000/month for human staff
✅ Time saved: 15–20 hours/week per business
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

| Security Layer | Implementation |
|---|---|
| **Authentication** | Session-based auth with encrypted cookies |
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

| Plan | Price | Videos/Month | Platforms | Users |
|---|---|---|---|---|
| 🆓 **Free** | $0 | 5 | 2 | 1 |
| 🚀 **Starter** | $29/mo | 30 | 3 | 1 |
| 💼 **Professional** | $79/mo | 100 | 5 | 3 |
| 🏢 **Agency** | $199/mo | 500 | 5 | 10 |
| 🏭 **Enterprise** | Custom | Unlimited | 5+ | Unlimited |

> **Cost Savings vs. Human Staff:**
> - Human video editor + social media manager: **$2,000–$5,000/month**
> - AutoSocial AI Professional: **$79/month**
> - **Savings: 97% cost reduction**

---

## 🚀 Installation

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
