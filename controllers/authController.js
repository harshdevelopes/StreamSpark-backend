// controllers/authController.js
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const generateToken = require("../utils/generateToken");
const { verifyGoogleToken } = require("../utils/googleAuth");

// @desc    Register a new user/streamer
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, displayName, email, password } = req.body;

  // Basic validation
  if (!username || !displayName || !email || !password) {
    res.status(400);
    throw new Error(
      "Please provide username, displayName, email, and password"
    );
  }

  // Check if user (email or username) already exists
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    res.status(400);
    // Provide specific feedback
    if (userExists.email === email.toLowerCase()) {
      throw new Error("User with this email already exists");
    } else {
      throw new Error("User with this username already exists");
    }
  }

  // Create user (password hashing handled by pre-save hook in User model)
  const user = await User.create({
    username,
    displayName,
    email,
    passwordHash: password, // Pass plain password, it will be hashed
    authProvider: "local",
    // Add default values if needed, uniqueAlertToken is generated automatically
  });

  if (user) {
    // Generate token
    const token = generateToken(user._id);

    // Respond with user data and token
    res.status(201).json({
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      socialLinks: user.socialLinks,
      alertTheme: user.alertTheme,
      alertSoundUrl: user.alertSoundUrl,
      uniqueAlertToken: user.uniqueAlertToken,
      createdAt: user.createdAt,
      authProvider: user.authProvider,
      token: token, // Send token to the client
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log("req", req.body);
  // console.log("password", password);

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  // Find user by email, explicitly select passwordHash for comparison
  const user = await User.findOne({ email }).select("+passwordHash");

  // Check if user exists and password matches
  if (user && (await user.comparePassword(password))) {
    // Generate token
    const token = generateToken(user._id);

    // Respond with user data and token
    res.json({
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      socialLinks: user.socialLinks,
      alertTheme: user.alertTheme,
      alertSoundUrl: user.alertSoundUrl,
      uniqueAlertToken: user.uniqueAlertToken,
      createdAt: user.createdAt,
      authProvider: user.authProvider,
      token: token, // Send token
    });
  } else {
    res.status(401); // Unauthorized
    throw new Error("Invalid email or password");
  }
});

// @desc    Google Authentication (Login/Register)
// @route   POST /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400);
    throw new Error("Google ID token is required");
  }

  try {
    // Verify the Google token
    const googleUser = await verifyGoogleToken(idToken);

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId: googleUser.googleId });

    // If user doesn't exist with googleId, check by email
    if (!user) {
      user = await User.findOne({ email: googleUser.email });

      // If user exists by email but no googleId, update the user
      if (user) {
        user.googleId = googleUser.googleId;
        user.authProvider = "google";

        // Update avatar if user doesn't have one
        if (!user.avatarUrl && googleUser.avatarUrl) {
          user.avatarUrl = googleUser.avatarUrl;
        }

        await user.save();
      } else {
        // Create a new user with Google data
        // Generate a unique username based on email or display name
        const baseUsername = googleUser.email.split("@")[0].toLowerCase();
        let username = baseUsername;
        let usernameExists = true;
        let counter = 1;

        // Find a unique username
        while (usernameExists) {
          const existingUser = await User.findOne({ username });
          if (!existingUser) {
            usernameExists = false;
          } else {
            username = `${baseUsername}${counter}`;
            counter++;
          }
        }

        user = await User.create({
          username,
          displayName: googleUser.displayName,
          email: googleUser.email,
          googleId: googleUser.googleId,
          avatarUrl: googleUser.avatarUrl || "",
          authProvider: "google",
        });
      }
    }

    // Generate token
    const token = generateToken(user._id);

    // Return user data with token
    res.json({
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      socialLinks: user.socialLinks,
      alertTheme: user.alertTheme,
      alertSoundUrl: user.alertSoundUrl,
      uniqueAlertToken: user.uniqueAlertToken,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
      token: token,
    });
  } catch (error) {
    res.status(401);
    throw new Error(`Google authentication failed: ${error.message}`);
  }
});

// @desc    Logout user (Conceptually - client removes token)
// @route   POST /api/auth/logout
// @access  Public (or Protected if needed to invalidate server-side sessions)
const logoutUser = asyncHandler(async (req, res) => {
  // For JWT, logout is typically handled client-side by removing the token.
  // If using httpOnly cookies for tokens, you would clear the cookie here.
  // Example for cookie-based logout:
  // res.cookie('jwt', '', {
  //   httpOnly: true,
  //   expires: new Date(0),
  // });
  res.status(200).json({ message: "Logout successful" });
});

// @desc    Get user profile (current authenticated user)
// @route   GET /api/auth/me
// @access  Private (Requires token)
const getMe = asyncHandler(async (req, res) => {
  // req.user is attached by the 'protect' middleware
  const user = req.user;

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      socialLinks: user.socialLinks,
      alertTheme: user.alertTheme,
      alertSoundUrl: user.alertSoundUrl,
      uniqueAlertToken: user.uniqueAlertToken,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  googleAuth,
};
