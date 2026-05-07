import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Create access token from payload
 * @param {object} payload
 * @returns {string}
 */
export const signAccessToken = (payload) =>
  jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

/**
 * Verify access token and decode payload
 * @param {string} token
 * @returns {object|string}
 */
export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.secret);
