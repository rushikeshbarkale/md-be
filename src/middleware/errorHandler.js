const errorHandler = (err, req, res, next) => {
  console.error("Error stack trace:", err.stack);

  // Handle specific error codes
  if (err.code === "ECONNREFUSED") {
    return res.status(503).json({
      success: false,
      message: "Database connection error. Please try again later.",
    });
  }

  if (err.code === "ER_BAD_FIELD_ERROR") {
    return res.status(400).json({
      success: false,
      message: "Bad request. Please check your parameters.",
    });
  }

  // Generic error handling
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
