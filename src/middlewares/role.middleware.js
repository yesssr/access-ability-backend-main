export const authorizeRoles =
  (...roles) =>
  (req, res, next) => {
    const currentRole = req.user?.role;

    if (!currentRole) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
