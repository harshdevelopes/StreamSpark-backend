// routes/authRoutes.js
const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  googleAuth,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware"); // Import protect middleware

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);
router.post("/logout", logoutUser); // Can be protected if needed
router.get("/me", protect, getMe); // Protect the /me route

module.exports = router;
