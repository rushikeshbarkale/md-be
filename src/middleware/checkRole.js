const checkRole = (req, res, next) => {
  const { role } = req.user; // 'req.user' is populated by verifyToken
  if (role === "supplier" || role === "admin") {
    return next(); //proceed if the user has correct role
  }
  return res.status(403).json({
    message: "Access denied. Only suppliers or admins can add products.",
  });
};

module.exports = checkRole;
