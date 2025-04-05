const express = require("express");
const {
  getDashboardStats,
  getDashboardTips,
  getDashboardProfile,
  updateDashboardProfile,
  getDashboardSettings,
  updateDashboardSettings,
  getDashboardWidgets,
} = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware"); // Import protect middleware

const router = express.Router();

// Apply protect middleware to all dashboard routes
router.use(protect);

router.get("/stats", getDashboardStats);
router.get("/tips", getDashboardTips);
router.get("/profile", getDashboardProfile);
router.put("/profile", updateDashboardProfile); // Use PUT for updates
router.get("/settings", getDashboardSettings);
router.put("/settings", updateDashboardSettings); // Use PUT for updates
router.get("/widgets", getDashboardWidgets);

module.exports = router;
