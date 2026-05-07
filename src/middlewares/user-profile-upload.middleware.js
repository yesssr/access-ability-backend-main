/*
Tujuan: Memproses upload foto profil pada endpoint update user (/users/me).
Caller: users.routes.js (PATCH /me).
Dependensi: multer memory storage.
Main Functions: userProfileUploadMiddleware.
Side Effects: Menyisipkan file upload ke req.file jika field profile_image dikirim.
*/

import multer from "multer";

const imageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const userProfileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname !== "profile_image") {
      const error = new Error(`Unsupported file field: ${file.fieldname}`);
      error.status = 422;
      return cb(error);
    }

    if (!imageMimeTypes.has(file.mimetype)) {
      const error = new Error(
        "profile_image must be a jpg, png, webp, or gif file"
      );
      error.status = 422;
      return cb(error);
    }

    return cb(null, true);
  },
}).single("profile_image");

export const userProfileUploadMiddleware = (req, res, next) => {
  userProfileUpload(req, res, (err) => {
    if (err) return next(err);
    return next();
  });
};
