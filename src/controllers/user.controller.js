/*
Tujuan: Menangani endpoint manajemen profil user yang sedang login.
Caller: src/routes/users.routes.js.
Dependensi: User model, express-validator, storage service, config env.
Main Functions: updateMyUser.
Side Effects: Update data users dan upload file foto profil ke object storage.
*/

import { User, sanitizeUser } from "../models/User.js";
import { validationResult } from "express-validator";
import { uploadFileToStorage } from "../services/storage.service.js";
import { env } from "../config/env.js";

export const updateMyUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { full_name, email, phone_number, phone } = req.body;
    const profileImageFile = req.file ?? null;

    if (email) {
      const existing = await User.query().findOne({ email });
      if (existing && existing.id !== userId) {
        return res.status(409).json({
          success: false,
          message: "Email is already used by another account",
        });
      }
    }

    const patch = {};
    if (typeof full_name !== "undefined") patch.full_name = full_name;
    if (typeof email !== "undefined") patch.email = email;
    if (typeof phone_number !== "undefined" || typeof phone !== "undefined") {
      const resolvedPhone =
        typeof phone_number !== "undefined" ? phone_number : phone;
      patch.phone_number = resolvedPhone ?? null;
    }

    if (profileImageFile) {
      const uploadResult = await uploadFileToStorage({
        buffer: profileImageFile.buffer,
        contentType: profileImageFile.mimetype,
        folder: env.storage.folders.profiles,
        originalName: profileImageFile.originalname,
      });
      patch.image_url = uploadResult.url;
    }

    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No updatable fields provided" });
    }

    const updated = await User.query().patchAndFetchById(userId, patch);

    return res
      .status(200)
      .json({ success: true, data: { user: sanitizeUser(updated) } });
  } catch (err) {
    return next(err);
  }
};
