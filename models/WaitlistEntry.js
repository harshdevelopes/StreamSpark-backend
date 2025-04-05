const mongoose = require("mongoose");

const WaitlistEntrySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^([\w\-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        "Please enter a valid email address",
      ],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const WaitlistEntry = mongoose.model("WaitlistEntry", WaitlistEntrySchema);
module.exports = WaitlistEntry;
