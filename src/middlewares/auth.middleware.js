import { verifyAccessToken } from "../utils/token.js";
export function authenticate(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    req.user = verifyAccessToken(h.split(" ")[1]);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
