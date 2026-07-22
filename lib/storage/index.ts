import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage client. In production this targets Cloudflare R2;
 * in local dev it targets the bundled MinIO container.
 */
let client: S3Client | null = null;

function s3(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  return client;
}

const BUCKET = process.env.S3_BUCKET_NAME || "autosocial-videos";

let bucketReady = false;

/**
 * Ensure the bucket exists and is publicly readable (dev convenience so uploaded
 * videos can be played back directly). Safe to call repeatedly — it's cached.
 */
export async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  try {
    await s3().send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3().send(new CreateBucketCommand({ Bucket: BUCKET }));
    await s3()
      .send(
        new PutBucketPolicyCommand({
          Bucket: BUCKET,
          Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: { AWS: ["*"] },
                Action: ["s3:GetObject"],
                Resource: [`arn:aws:s3:::${BUCKET}/*`],
              },
            ],
          }),
        }),
      )
      .catch(() => {
        /* policy is best-effort; R2 handles public access differently */
      });
  }
  bucketReady = true;
}

/** Presigned PUT URL the browser can upload directly to. */
export async function createUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  await ensureBucket();
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3(), cmd, { expiresIn });
}

/** Presigned GET URL for reading a private object. */
export async function createDownloadUrl(key: string, expiresIn = 3600) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3(), cmd, { expiresIn });
}

/** Upload a buffer directly (server-side) and return its public URL. */
export async function putObject(key: string, body: Buffer, contentType: string) {
  await ensureBucket();
  await s3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  return publicUrl(key);
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Stable public URL for an object (CDN-backed in production). */
export function publicUrl(key: string) {
  const base = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET}`;
  return `${base.replace(/\/$/, "")}/${key}`;
}

/** Build a namespaced object key for an uploaded video. */
export function videoKey(businessId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `videos/${businessId}/${Date.now()}-${safe}`;
}

/** Recover the object key from a public URL (null if it isn't one of ours). */
export function keyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const base = (process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET}`).replace(/\/$/, "");
  return url.startsWith(`${base}/`) ? url.slice(base.length + 1) : null;
}
