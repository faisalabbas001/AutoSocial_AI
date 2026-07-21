import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
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

/** Presigned PUT URL the browser can upload directly to. */
export async function createUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3(), cmd, { expiresIn });
}

/** Presigned GET URL for reading a private object. */
export async function createDownloadUrl(key: string, expiresIn = 3600) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3(), cmd, { expiresIn });
}

export async function putObject(key: string, body: Buffer, contentType: string) {
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
