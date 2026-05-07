/*
Tujuan: Menangani OAuth2 authentication flow dengan Google untuk web dan mobile clients.
Caller: auth.controller.
Dependensi: google-auth-library, axios, User model, token utils.
Main Functions: getGoogleAuthUrl, handleGoogleCallback, handleGoogleMobileToken.
Side Effects: DB read/write users, generate JWT token.
*/

import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import { User } from "../models/User.js";
import { signAccessToken } from "../utils/token.js";
import { env } from "../config/env.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Inisialisasi Google OAuth Client
 */
const createGoogleOAuthClient = () => {
  return new OAuth2Client({
    clientId: env.oauth.googleClientId,
    clientSecret: env.oauth.googleClientSecret,
    redirectUri: env.oauth.googleCallbackUrl,
  });
};

/**
 * Generate URL untuk redirect user ke Google OAuth consent screen (Web Flow)
 * @param {string} clientType - 'web' | 'mobile'
 * @returns {string} Google OAuth URL
 */
export const getGoogleAuthUrl = (clientType = "web") => {
  const oauthClient = createGoogleOAuthClient();

  // State untuk security (CSRF protection)
  const state = uuidv4();

  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state,
    prompt: "consent", // Force re-consent untuk mendapat refresh token
  });

  return { url, state };
};

/**
 * Handle Google OAuth callback untuk Web (server-side)
 * @param {string} code - Authorization code dari Google
 * @returns {object} User dan access token
 */
export const handleGoogleCallback = async (code) => {
  try {
    const oauthClient = createGoogleOAuthClient();

    // Tukar authorization code dengan tokens
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    // Ambil user info dari Google
    const userInfo = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const { email, name, picture, id: googleId } = userInfo.data;

    // Cari atau buat user berdasarkan google_id
    let user = await User.query().findOne({ google_id: googleId });

    if (!user) {
      // Check apakah email sudah terdaftar dengan password auth
      const existingEmail = await User.query().findOne({ email });

      if (existingEmail) {
        // Email sudah terdaftar, return error untuk user merge account
        throw new Error(
          "Email already registered with password. Please login with password or use different email."
        );
      }

      // Buat user baru dari Google data
      user = await User.query().insertAndFetch({
        id: uuidv4(),
        email,
        full_name: name,
        google_id: googleId,
        oauth_provider: "google",
        oauth_token_data: {
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
        },
        password_hash: null, // OAuth user tidak punya password
        role: "user", // Default role untuk OAuth
        is_active: true,
        last_login_at: new Date().toISOString(),
      });
    } else {
      // Update existing user dengan latest token
      user = await User.query().patchAndFetchById(user.id, {
        last_login_at: new Date().toISOString(),
        oauth_token_data: {
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
        },
      });
    }

    // Generate JWT access token untuk app
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      user: sanitizeUser(user),
      accessToken,
    };
  } catch (error) {
    throw new Error(`Google OAuth callback failed: ${error.message}`);
  }
};

/**
 * Handle Google OAuth token untuk Mobile Client (langsung kirim ID token dari client)
 * Mobile client sudah authenticate dengan Google SDK, hanya verifikasi di backend
 * @param {string} idToken - ID token dari Google SDK (mobile app)
 * @returns {object} User dan access token
 */
export const handleGoogleMobileToken = async (idToken) => {
  try {
    const oauthClient = createGoogleOAuthClient();

    // Verifikasi ID token
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: env.oauth.googleClientId,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Cari atau buat user berdasarkan google_id
    let user = await User.query().findOne({ google_id: googleId });

    if (!user) {
      // Check apakah email sudah terdaftar dengan password auth
      const existingEmail = await User.query().findOne({ email });

      if (existingEmail) {
        throw new Error(
          "Email already registered with password. Please login with password or use different email."
        );
      }

      // Buat user baru dari Google data
      user = await User.query().insertAndFetch({
        id: uuidv4(),
        email,
        full_name: name,
        google_id: googleId,
        oauth_provider: "google",
        oauth_token_data: {
          last_verified_at: new Date().toISOString(),
          verified_idtoken: true,
        },
        password_hash: null, // OAuth user tidak punya password
        role: "user", // Default role untuk OAuth
        is_active: true,
        last_login_at: new Date().toISOString(),
      });
    } else {
      // Update last login
      user = await User.query().patchAndFetchById(user.id, {
        last_login_at: new Date().toISOString(),
        oauth_token_data: {
          last_verified_at: new Date().toISOString(),
          verified_idtoken: true,
        },
      });
    }

    // Generate JWT access token untuk app
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      user: sanitizeUser(user),
      accessToken,
    };
  } catch (error) {
    throw new Error(
      `Google mobile token verification failed: ${error.message}`
    );
  }
};

/**
 * Refresh access token menggunakan refresh token yang tersimpan
 */
export const refreshGoogleAccessToken = async (userId) => {
  try {
    const user = await User.query().findById(userId);

    if (!user || !user.oauth_token_data?.refresh_token) {
      throw new Error("User not found or refresh token unavailable");
    }

    const oauthClient = createGoogleOAuthClient();

    oauthClient.setCredentials({
      refresh_token: user.oauth_token_data.refresh_token,
    });

    const { credentials } = await oauthClient.refreshAccessToken();

    // Update token data
    await User.query().patchAndFetchById(userId, {
      oauth_token_data: {
        ...user.oauth_token_data,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
      },
    });

    return credentials;
  } catch (error) {
    throw new Error(`Google token refresh failed: ${error.message}`);
  }
};

/**
 * Helper untuk sanitize user object (remove sensitive data)
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const { password_hash, oauth_token_data, ...safe } = user;
  return safe;
};
