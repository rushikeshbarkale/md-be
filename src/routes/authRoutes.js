const express = require("express");
const { signUp, login, getUserData } = require("../controllers/authController");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.post("/register", signUp);
router.post("/login", login);
router.get("/getUser", verifyToken, getUserData);

module.exports = router;
