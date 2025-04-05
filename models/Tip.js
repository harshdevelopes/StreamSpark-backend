const mongoose = require("mongoose");

const TipSchema = new mongoose.Schema(
  {
    streamerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // Reference to the User model
    },
    tipperName: {
      type: String,
      required: [true, "Tipper name is required"],
      trim: true,
      default: "Anonymous", // Provide a default
    },
    amount: {
      type: Number, // Store as number (consider Decimal128 for high precision if needed)
      required: [true, "Amount is required"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      uppercase: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    paymentProvider: {
      type: String,
      required: true,
      enum: ["Razorpay", "Other"], // Define allowed providers
    },
    paymentOrderId: {
      // Order ID from provider (e.g., Razorpay Order ID)
      type: String,
      required: true,
      unique: true, // Ensure order IDs are unique
    },
    paymentId: {
      // Payment ID from provider after success (e.g., Razorpay Payment ID)
      type: String,
      index: true, // Index for faster lookups if needed
    },
    paymentSignature: {
      // Signature for verification (e.g., Razorpay Signature)
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "SUCCESSFUL", "FAILED"],
      default: "PENDING",
      index: true,
    },
    processedAt: {
      // Timestamp when the payment was confirmed (successful/failed)
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Tip = mongoose.model("Tip", TipSchema);
module.exports = Tip;
