const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      // Add validation for URL-friendly characters if needed
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      // Simple email format validation (Corrected)
      match: [
        /^([\w\-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        "Please enter a valid email address",
      ],
    },
    passwordHash: {
      type: String,
      required: function () {
        // Password only required if not using OAuth
        return !this.googleId && !this.facebookId;
      },
      select: false, // Don't return password hash by default
    },
    avatarUrl: { type: String, default: "" },
    coverImageUrl: { type: String, default: "" },
    bio: { type: String, default: "" },
    socialLinks: {
      type: Map, // Using Map for flexible key-value pairs
      of: String,
      default: {},
    },
    alertTheme: { type: String, default: "default" }, // Default theme
    alertSoundUrl: { type: String, default: "" },
    paymentProviderDetails: {
      // Store securely, sensitive data handled elsewhere
      // TODO: Add razorpayAccountId
      // razorpayAccountId: { type: String }, // Example: Store linked account ID if using Razorpay Connect
      // Add other provider details as needed, avoid storing secrets directly
    },
    uniqueAlertToken: {
      type: String,
      unique: true,
      default: uuidv4, // Generate a unique token on creation
    },
    // OAuth fields
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values (only indexed if field exists)
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// --- Password Hashing Middleware ---
// Hash password before saving a new user
UserSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("passwordHash") || !this.passwordHash) return next();

  try {
    const salt = await bcrypt.genSalt(10); // Generate salt
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt); // Hash password
    next();
  } catch (error) {
    next(error); // Pass error to the next middleware
  }
});

// --- Instance Method for Password Comparison ---
// Compare entered password with the stored hash
UserSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
