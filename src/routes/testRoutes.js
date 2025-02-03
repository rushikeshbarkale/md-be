const express = require("express");

const router = express.Router();

router.get("/nodebe", (req, res) => {
  res.json({ message: "Node backend working" });
});

router.get("/docker", (req, res) => {
  res.json({ message: "Node backend checking from docker" });
});

module.exports = router;
