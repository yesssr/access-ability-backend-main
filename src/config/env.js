/*
Tujuan: Memusatkan konfigurasi environment aplikasi.
Caller: bootstrap app, middleware, service, dan route composition.
Dependensi: dotenv dan environment variables proses runtime.
Main Functions: export object env untuk konfigurasi DB, JWT, bcrypt, rate limit, dan feature flags.
Side Effects: Memuat file .env ke process.env saat startup.
*/

import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  features: {
    enableAiMatching: process.env.ENABLE_AI_MATCHING === "true",
  },

  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "access_ability",
    ssl: process.env.DB_SSL === "true",
    schema: process.env.DB_SCHEMA || "app_mvp",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "change-this-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "change-this-refresh-secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  bcrypt: {
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  },

  storage: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    endpointS3: process.env.AWS_ENDPOINT_URL_S3 || "",
    endpointIam: process.env.AWS_ENDPOINT_URL_IAM || "",
    publicBaseUrl:
      process.env.AWS_PUBLIC_BASE_URL ||
      `https://${
        process.env.AWS_S3_BUCKET || "access-ability"
      }.t3.tigrisfiles.io`,
    region: process.env.AWS_REGION || "auto",
    bucket: process.env.AWS_S3_BUCKET || "access-ability",
    uploadTimeoutMs: Number(process.env.AWS_UPLOAD_TIMEOUT_MS || 20000),
    folders: {
      profiles: "profiles",
      certificates: "certificates",
    },
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 100),
  },

  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    googleCallbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:3000/api/v1/auth/google/callback",
  },

  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL || "http://localhost:3000",
  },
};
