// controllers/streamerController.js
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");

// @desc    Get public streamer profile by username
// @route   GET /api/streamers/:username
// @access  Public
const getStreamerProfile = asyncHandler(async (req, res) => {
  const username = req.params.username.toLowerCase(); // Ensure case-insensitivity

  // Find user by username, select only public fields
  const streamer = await User.findOne({ username }).select(
    "username displayName avatarUrl coverImageUrl bio socialLinks createdAt" // Specify fields to return
  );

  if (streamer) {
    res.json(streamer);
  } else {
    res.status(404);
    throw new Error("Streamer not found");
  }
});

module.exports = {
  getStreamerProfile,
};
