const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token =
    req.cookies.token || req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "No token provided. Unauthorized." });
  }

  try {
    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { id: decoded.id, role: decoded.role };

    next();
  } catch (error) {
    console.error(error);
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

module.exports = authMiddleware;
