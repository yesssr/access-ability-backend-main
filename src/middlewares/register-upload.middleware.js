import multer from "multer";

const imageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const certificateMimeTypes = new Set([...imageMimeTypes, "application/pdf"]);

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "profile_image") {
    if (!imageMimeTypes.has(file.mimetype)) {
      const error = new Error(
        "profile_image must be a jpg, png, webp, or gif file"
      );
      error.status = 422;
      return cb(error);
    }
    return cb(null, true);
  }

  if (file.fieldname === "provider_certificate") {
    if (!certificateMimeTypes.has(file.mimetype)) {
      const error = new Error(
        "provider_certificate must be an image (jpg/png/webp/gif) or pdf file"
      );
      error.status = 422;
      return cb(error);
    }
    return cb(null, true);
  }

  const error = new Error(`Unsupported file field: ${file.fieldname}`);
  error.status = 422;
  return cb(error);
};

const registerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    files: 2,
    fileSize: 10 * 1024 * 1024,
  },
}).fields([
  { name: "profile_image", maxCount: 1 },
  { name: "provider_certificate", maxCount: 1 },
]);

const normalizeProviderSpecialization = (value) => {
  if (value === undefined || value === null || Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fallback ke format "1,2,3" jika bukan JSON array.
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item));
};

const normalizeNumberField = (value, parser) => {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const parsed = parser(value);
  return Number.isNaN(parsed) ? value : parsed;
};

export const registerUploadMiddleware = (req, res, next) => {
  registerUpload(req, res, (err) => {
    if (err) return next(err);

    req.body.provider_specialization = normalizeProviderSpecialization(
      req.body.provider_specialization
    );

    req.body.years_experience = normalizeNumberField(
      req.body.years_experience,
      (value) => Number.parseInt(value, 10)
    );

    req.body.price_per_hour = normalizeNumberField(
      req.body.price_per_hour,
      (value) => Number.parseFloat(value)
    );

    req.body.base_location_lat = normalizeNumberField(
      req.body.base_location_lat,
      (value) => Number.parseFloat(value)
    );

    req.body.base_location_lng = normalizeNumberField(
      req.body.base_location_lng,
      (value) => Number.parseFloat(value)
    );

    next();
  });
};
