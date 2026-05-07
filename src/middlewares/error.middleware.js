export function notFoundHandler(req, res) {
  return res.status(404).json({ success: false, message: "Route not found" });
}
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  return res.status(status).json({ success: false, message: err.message || "Internal server error" });
}
