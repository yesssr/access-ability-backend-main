import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

const trimSlash = (value = "") => value.replace(/\/+$/, "");

const endpoint = trimSlash(env.storage.endpointS3);
const publicBaseUrl = trimSlash(env.storage.publicBaseUrl);
const uploadTimeoutMs = Number(env.storage.uploadTimeoutMs || 20000);

const s3Client = new S3Client({
  region: env.storage.region,
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.storage.accessKeyId,
    secretAccessKey: env.storage.secretAccessKey,
  },
});

const detectExtension = (originalName = "", contentType = "") => {
  const byName = originalName.split(".").pop();
  if (byName && byName !== originalName) {
    return byName.toLowerCase();
  }

  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "application/pdf") return "pdf";
  return "bin";
};

const buildPublicUrl = (bucket, key) => {
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${key}`;
  }
  return `${endpoint}/${bucket}/${key}`;
};

const ensureStorageConfig = () => {
  if (!env.storage.accessKeyId || !env.storage.secretAccessKey) {
    const error = new Error("Storage credentials are not configured");
    error.status = 500;
    throw error;
  }

  if (!env.storage.endpointS3) {
    const error = new Error("Storage endpoint is not configured");
    error.status = 500;
    throw error;
  }

  if (!env.storage.bucket) {
    const error = new Error("Storage bucket is not configured");
    error.status = 500;
    throw error;
  }
};

export const uploadFileToStorage = async ({
  buffer,
  contentType,
  folder,
  originalName,
}) => {
  ensureStorageConfig();

  if (!buffer?.length) {
    const error = new Error("File buffer is required");
    error.status = 400;
    throw error;
  }

  if (!contentType) {
    const error = new Error("File content type is required");
    error.status = 400;
    throw error;
  }

  const extension = detectExtension(originalName, contentType);
  const key = `${folder}/${Date.now()}-${randomUUID()}.${extension}`;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), uploadTimeoutMs);

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.storage.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
      { abortSignal: abortController.signal }
    );
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeoutError = new Error("Storage upload timed out");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  return {
    key,
    url: buildPublicUrl(env.storage.bucket, key),
  };
};
