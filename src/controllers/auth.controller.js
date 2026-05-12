/*
Tujuan: Menangani autentikasi dan registrasi user/provider.
Caller: route auth.
Dependensi: User model, Provider model, util password/token.
Main Functions: register, login, me.
Side Effects: DB read/write users dan provider_profiles, generate JWT.
*/

import { User } from "../models/User.js";
import { Provider } from "../models/Provider.js";
import { ProviderCertification } from "../models/ProviderCertification.js";
import { ServiceType } from "../models/ServiceType.js";
import { ProviderSpecialization } from "../models/ProviderSpecialization.js";
import { uploadFileToStorage } from "../services/storage.service.js";
import { env } from "../config/env.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { signAccessToken } from "../utils/token.js";
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  handleGoogleMobileToken,
} from "../services/oauth.service.js";

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
};

export const register = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      password,
      role = "user",
      phone_number,
      phone,
      years_experience,
      province_id,
      province_name,
      regency_id,
      regency_name,
      base_location_city,
      base_location_lat,
      base_location_lng,
      bio,
      price_per_hour,
      provider_specialization,
    } = req.body;

    const profileImageFile = req.files?.profile_image?.[0] ?? null;
    const providerCertificateFile =
      req.files?.provider_certificate?.[0] ?? null;

    if (providerCertificateFile && role !== "provider") {
      return res.status(422).json({
        success: false,
        message: "provider_certificate can only be uploaded for provider role",
      });
    }

    const existing = await User.query().findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    if (
      role === "provider" &&
      (!province_id ||
        !province_name ||
        !regency_id ||
        !regency_name ||
        !base_location_city ||
        !price_per_hour ||
        !Array.isArray(provider_specialization) ||
        provider_specialization.length === 0)
    ) {
      return res.status(422).json({
        success: false,
        message:
          "province_id, province_name, regency_id, regency_name, base_location_city, price_per_hour, and provider_specialization are required for provider role",
      });
    }

    const password_hash = await hashPassword(password);

    let userImageUrl = null;
    if (profileImageFile) {
      const uploadResult = await uploadFileToStorage({
        buffer: profileImageFile.buffer,
        contentType: profileImageFile.mimetype,
        folder: env.storage.folders.profiles,
        originalName: profileImageFile.originalname,
      });
      userImageUrl = uploadResult.url;
    }

    let providerCertificateUrl = null;
    if (providerCertificateFile) {
      const uploadResult = await uploadFileToStorage({
        buffer: providerCertificateFile.buffer,
        contentType: providerCertificateFile.mimetype,
        folder: env.storage.folders.certificates,
        originalName: providerCertificateFile.originalname,
      });
      providerCertificateUrl = uploadResult.url;
    }

    const created = await User.transaction(async (trx) => {
      const user = await User.query(trx).insertAndFetch({
        full_name,
        email,
        password_hash,
        role,
        phone_number: phone_number ?? phone ?? null,
        image_url: userImageUrl,
      });

      let providerProfile = null;

      if (role === "provider") {
        const specializationIds = [
          ...new Set(provider_specialization.map((id) => Number(id))),
        ];

        const existingServiceTypes = await ServiceType.query(trx)
          .whereIn("id", specializationIds)
          .select("id");

        if (existingServiceTypes.length !== specializationIds.length) {
          const error = new Error(
            "One or more provider_specialization IDs are invalid service_type IDs"
          );
          error.status = 422;
          throw error;
        }

        providerProfile = await Provider.query(trx).insertAndFetch({
          user_id: user.id,
          bio: bio ?? null,
          years_experience: years_experience ?? null,
          province_id: String(province_id),
          province_name: String(province_name),
          regency_id: String(regency_id),
          regency_name: String(regency_name),
          base_location_city,
          base_location_lat: base_location_lat ?? null,
          base_location_lng: base_location_lng ?? null,
          price_per_hour,
          verification_status: "pending",
        });

        await ProviderSpecialization.query(trx).insert(
          specializationIds.map((serviceTypeId) => ({
            provider_profile_id: providerProfile.id,
            service_type_id: serviceTypeId,
          }))
        );

        if (providerCertificateUrl) {
          await ProviderCertification.query(trx).insert({
            provider_profile_id: providerProfile.id,
            file_url: providerCertificateUrl,
          });
        }
      }

      return { user, providerProfile };
    });

    const token = signAccessToken({
      sub: created.user.id,
      role: created.user.role,
      email: created.user.email,
    });

    return res.status(201).json({
      success: true,
      message: "Register success",
      data: {
        token,
        user: sanitizeUser(created.user),
        providerProfile: created.providerProfile,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.query().findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    await User.query()
      .patch({ last_login_at: new Date().toISOString() })
      .where("id", user.id);

    const token = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    // If provider, also fetch provider profile to include verification status
    let providerProfile = null;
    if (user.role === "provider") {
      try {
        providerProfile = await Provider.query().findOne({ user_id: user.id });
      } catch (e) {
        console.error(
          "[Auth] Failed to fetch providerProfile:",
          e?.message || e
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Login success",
      data: {
        token,
        user: sanitizeUser(user),
        providerProfile,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;

    const user = await User.query()
      .findById(userId)
      .withGraphFetched("providerProfile");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /auth/google/url - Generate OAuth URL untuk redirect ke Google (Web Flow)
 * Query params: client_type = 'web' | 'mobile' (default: 'web')
 */
export const googleAuthUrl = async (req, res, next) => {
  try {
    const { client_type = "web" } = req.query;

    const { url, state } = getGoogleAuthUrl(client_type);

    // Store state di session/cookie untuk CSRF validation (optional, bisa di-skip untuk SPA)
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    return res.status(200).json({
      success: true,
      data: {
        authUrl: url,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /auth/google/callback - Google OAuth callback handler (Web Flow)
 * Query params: code, state
 */
export const googleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
      });
    }

    // Validate state untuk CSRF protection (optional)
    const storedState = req.cookies?.oauth_state;
    if (storedState && storedState !== state) {
      return res.status(400).json({
        success: false,
        message: "Invalid state parameter. CSRF validation failed.",
      });
    }

    // Clear state cookie
    if (storedState) {
      res.clearCookie("oauth_state");
    }

    // Redirect ke frontend page yang melakukan exchange code ke backend.
    const frontendRedirectUrl = `${env.frontend.baseUrl}/auth/google/callback?code=${encodeURIComponent(
      code
    )}${state ? `&state=${encodeURIComponent(state)}` : ""}`;

    return res.redirect(frontendRedirectUrl);
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /auth/google/callback - Exchange Google authorization code from frontend callback page
 * Body: { code }
 */
export const googleCallbackExchange = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is required",
      });
    }

    const result = await handleGoogleCallback(code);

    return res.status(200).json({
      success: true,
      message: "Google OAuth authentication success",
      data: {
        token: result.accessToken,
        user: result.user,
        providerProfile: result.providerProfile ?? null,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /auth/google/mobile - Handle Google ID token dari mobile client
 * Body: { idToken, clientType }
 * Mobile flow: Google SDK di app sudah authenticate, jadi cukup verify token di backend
 */
export const googleMobileToken = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "idToken is required",
      });
    }

    const result = await handleGoogleMobileToken(idToken);

    return res.status(200).json({
      success: true,
      message: "Mobile OAuth authentication success",
      data: {
        token: result.accessToken,
        user: result.user,
      },
    });
  } catch (err) {
    return next(err);
  }
};
