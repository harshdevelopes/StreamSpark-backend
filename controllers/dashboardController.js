const User = require("../models/User");
const Tip = require("../models/Tip");
const asyncHandler = require("../middleware/asyncHandler");

// @desc    Get dashboard stats for the logged-in streamer
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
  const streamerId = req.user._id; // User ID from 'protect' middleware

  // Calculate Total Tips (Successful only)
  const totalTipsResult = await Tip.aggregate([
    { $match: { streamerId: streamerId, status: "SUCCESSFUL" } },
    { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
  ]);
  const totalTipsAmount =
    totalTipsResult.length > 0 ? totalTipsResult[0].totalAmount : 0;

  // Calculate Tips Today (Successful only)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const tipsTodayResult = await Tip.aggregate([
    {
      $match: {
        streamerId: streamerId,
        status: "SUCCESSFUL",
        processedAt: { $gte: todayStart, $lte: todayEnd },
      },
    },
    { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
  ]);
  const tipsTodayAmount =
    tipsTodayResult.length > 0 ? tipsTodayResult[0].totalAmount : 0;

  // Calculate Total Successful Tips Count (could represent 'supporters' if names aren't unique)
  const totalSuccessfulTipsCount = await Tip.countDocuments({
    streamerId: streamerId,
    status: "SUCCESSFUL",
  });

  // Calculate Unique Supporters (based on tipperName for successful tips)
  // Note: This counts distinct names, which might not be perfectly unique users.
  // A more robust approach might involve user accounts for tippers if needed later.
  const uniqueSupportersResult = await Tip.distinct("tipperName", {
    streamerId: streamerId,
    status: "SUCCESSFUL",
  });
  const uniqueSupportersCount = uniqueSupportersResult.length;

  res.json({
    totalTips: totalTipsAmount, // Renamed for clarity based on your doc
    tipsToday: tipsTodayAmount, // Renamed for clarity
    // totalSuccessfulTips: totalSuccessfulTipsCount, // Optionally return total count
    uniqueSupporters: uniqueSupportersCount, // Renamed for clarity
  });
});

// @desc    Get paginated list of tips for the logged-in streamer
// @route   GET /api/dashboard/tips
// @access  Private
const getDashboardTips = asyncHandler(async (req, res) => {
  const streamerId = req.user._id;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10; // Default limit
  const skip = (page - 1) * limit;

  // Fetch tips for the user, sorted by newest first
  const tips = await Tip.find({ streamerId: streamerId })
    .sort({ createdAt: -1 }) // Sort by creation date descending
    .skip(skip)
    .limit(limit);
  // Optionally populate streamer details if needed, though unlikely here
  // .populate('streamerId', 'username displayName');

  // Get total count for pagination
  const totalTips = await Tip.countDocuments({ streamerId: streamerId });
  const totalPages = Math.ceil(totalTips / limit);

  res.json({
    tips: tips,
    currentPage: page,
    totalPages: totalPages,
    totalTips: totalTips,
  });
});

// @desc    Get profile data for the logged-in streamer
// @route   GET /api/dashboard/profile
// @access  Private
const getDashboardProfile = asyncHandler(async (req, res) => {
  // req.user already contains the necessary data from 'protect' middleware
  const user = req.user;
  res.json({
    // Return only the fields specified in the documentation
    displayName: user.displayName,
    bio: user.bio,
    socialLinks: user.socialLinks,
    avatarUrl: user.avatarUrl,
    coverImageUrl: user.coverImageUrl,
  });
});

// @desc    Update profile data for the logged-in streamer
// @route   PUT /api/dashboard/profile
// @access  Private
const updateDashboardProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id); // Get user instance

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Update fields if they exist in the request body
  user.displayName = req.body.displayName ?? user.displayName;
  user.bio = req.body.bio ?? user.bio;
  user.socialLinks = req.body.socialLinks ?? user.socialLinks; // Assuming JSON object

  // --- Image Upload Handling Placeholder ---
  // Actual image upload needs middleware (like multer) and storage logic (S3, Cloudinary, etc.)
  // The request body might contain URLs from a client-side upload process, or file data.
  // Example assuming URLs are sent after client-side upload:
  if (req.body.avatarUrl !== undefined) {
    // Check if field is explicitly present
    user.avatarUrl = req.body.avatarUrl;
  }
  if (req.body.coverImageUrl !== undefined) {
    user.coverImageUrl = req.body.coverImageUrl;
  }
  // --- End Placeholder ---

  const updatedUser = await user.save();

  // Respond with the updated, relevant fields
  res.json({
    displayName: updatedUser.displayName,
    bio: updatedUser.bio,
    socialLinks: updatedUser.socialLinks,
    avatarUrl: updatedUser.avatarUrl,
    coverImageUrl: updatedUser.coverImageUrl,
  });
});

// @desc    Get settings (alerts) for the logged-in streamer
// @route   GET /api/dashboard/settings
// @access  Private
const getDashboardSettings = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json({
    alertTheme: user.alertTheme,
    alertSoundUrl: user.alertSoundUrl,
  });
});

// @desc    Update settings (alerts) for the logged-in streamer
// @route   PUT /api/dashboard/settings
// @access  Private
const updateDashboardSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Update fields if provided
  user.alertTheme = req.body.alertTheme ?? user.alertTheme;
  user.alertSoundUrl = req.body.alertSoundUrl ?? user.alertSoundUrl;

  const updatedUser = await user.save();

  res.json({
    alertTheme: updatedUser.alertTheme,
    alertSoundUrl: updatedUser.alertSoundUrl,
  });
});

// @desc    Get widget information for the logged-in streamer
// @route   GET /api/dashboard/widgets
// @access  Private
const getDashboardWidgets = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json({
    alertToken: user.uniqueAlertToken, // The crucial token for the alert URL
    alertTheme: user.alertTheme, // Current theme setting
    alertSoundUrl: user.alertSoundUrl, // Current sound setting
  });
});

module.exports = {
  getDashboardStats,
  getDashboardTips,
  getDashboardProfile,
  updateDashboardProfile,
  getDashboardSettings,
  updateDashboardSettings,
  getDashboardWidgets,
};
