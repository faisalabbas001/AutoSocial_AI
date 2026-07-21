import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { PrismaClient, Platform, VideoStatus, PostStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean slate (dev only)
  await prisma.analytics.deleteMany();
  await prisma.scheduledPost.deleteMany();
  await prisma.thumbnail.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.caption.deleteMany();
  await prisma.videoJob.deleteMany();
  await prisma.video.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.business.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "owner@brightsmile.dental",
      name: "Dr. Sarah Smith",
      role: "OWNER",
      subscription: { create: { plan: "PROFESSIONAL", status: "active" } },
    },
  });

  const business = await prisma.business.create({
    data: {
      userId: user.id,
      name: "BrightSmile Dental",
      industry: "Dental Clinic",
      brandColor: "#6366f1",
    },
  });

  const platforms: Platform[] = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN"];
  const accounts = await Promise.all(
    platforms.map((platform, i) =>
      prisma.socialAccount.create({
        data: {
          businessId: business.id,
          platform,
          accountId: `acct_${platform.toLowerCase()}`,
          handle: "@brightsmiledental",
          followers: [2450, 1820, 5300, 980, 640][i],
          accessToken: "demo-token",
          expiresAt: new Date(Date.now() + 58 * 24 * 3600 * 1000),
        },
      }),
    ),
  );

  const videoSeeds = [
    { title: "Teeth Whitening Transformation", status: "READY" as VideoStatus, duration: 45 },
    { title: "5 Tips for Healthier Gums", status: "PUBLISHED" as VideoStatus, duration: 62 },
    { title: "Behind the Scenes: Modern Dentistry", status: "PROCESSING" as VideoStatus, duration: 88 },
    { title: "Patient Testimonial — Invisalign", status: "READY" as VideoStatus, duration: 51 },
    { title: "How We Keep Your Kids Smiling", status: "PUBLISHED" as VideoStatus, duration: 73 },
  ];

  for (const [i, v] of videoSeeds.entries()) {
    const video = await prisma.video.create({
      data: {
        businessId: business.id,
        title: v.title,
        status: v.status,
        duration: v.duration,
        fileSize: (v.duration ?? 60) * 1_500_000,
        originalUrl: `https://example.com/videos/original-${i}.mp4`,
        processedUrl: v.status === "PROCESSING" ? null : `https://example.com/videos/processed-${i}.mp4`,
        transcript: "Welcome to our clinic. Book your appointment today!",
        thumbnails: {
          create: { url: `https://picsum.photos/seed/vid${i}/1080/1920`, isPrimary: true },
        },
      },
    });

    if (v.status === "PUBLISHED") {
      for (const account of accounts.slice(0, 3)) {
        const views = 800 + Math.floor(Math.random() * 6000);
        await prisma.scheduledPost.create({
          data: {
            videoId: video.id,
            socialAccountId: account.id,
            platform: account.platform,
            caption: "✨ Amazing results at BrightSmile Dental! Book now 📞",
            hashtags: ["#SmileMakeover", "#DentalCare", "#Trending"],
            status: "PUBLISHED" as PostStatus,
            publishedAt: new Date(Date.now() - (i + 1) * 86400000),
            externalPostId: `ext_${account.platform}_${i}`,
            analytics: {
              create: {
                views,
                likes: Math.floor(views * 0.08),
                comments: Math.floor(views * 0.01),
                shares: Math.floor(views * 0.005),
                reach: Math.floor(views * 1.6),
                engagementRate: 0.095,
              },
            },
          },
        });
      }
    }
  }

  await prisma.notification.createMany({
    data: [
      { userId: user.id, type: "PROCESSING_COMPLETE", title: "Video ready", message: '"Teeth Whitening Transformation" is ready to publish.' },
      { userId: user.id, type: "PUBLISH_SUCCESS", title: "Post published", message: "Your video was published to Instagram." },
    ],
  });

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
