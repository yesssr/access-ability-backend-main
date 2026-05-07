import multer from "multer";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname !== "certificate_file") {
      const error = new Error("Unsupported file field");
      error.status = 422;
      return cb(error);
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error(
        "certificate_file must be an image (jpg/png/webp/gif) or pdf file"
      );
      error.status = 422;
      return cb(error);
    }

    return cb(null, true);
  },
}).single("certificate_file");

export const providerCertificateUploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};
