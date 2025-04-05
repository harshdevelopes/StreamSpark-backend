// controllers/waitlistController.js
const WaitlistEntry = require("../models/WaitlistEntry");
const asyncHandler = require("../middleware/asyncHandler");

// @desc    Add email to waitlist
// @route   POST /api/waitlist
// @access  Public
const addToWaitlist = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Please provide an email address");
  }

  // Check if email already exists (handled by unique index, but good practice)
  const existingEntry = await WaitlistEntry.findOne({ email });
  if (existingEntry) {
    // Decide response: success (already added) or conflict
    res.status(200).json({ message: "Email is already on the waitlist." });
    // Alternatively, send 409 Conflict:
    // res.status(409);
    // throw new Error('Email is already on the waitlist.');
    return; // Stop execution
  }

  // Create new entry
  const waitlistEntry = await WaitlistEntry.create({ email });

  if (waitlistEntry) {
    res.status(201).json({
      _id: waitlistEntry._id,
      email: waitlistEntry.email,
      createdAt: waitlistEntry.createdAt,
      message: "Successfully added to waitlist!",
    });
  } else {
    res.status(400);
    throw new Error("Invalid data");
  }
});

module.exports = {
  addToWaitlist,
};
