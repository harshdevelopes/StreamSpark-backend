// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Assuming User model path
const asyncHandler = require("./asyncHandler"); // Helper for async route handlers

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // const decoded = jwt.verify(token, "sampletokenheretotest");

      // Get user from the token payload (id) and attach to request
      // Exclude passwordHash using .select('-passwordHash')
      req.user = await User.findById(decoded.id).select("-passwordHash");

      if (!req.user) {
        res.status(401);
        throw new Error("Not authorized, user not found");
      }

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }
});

// Optional: Middleware to check if user is an admin (if needed later)
// const admin = (req, res, next) => {
//   if (req.user && req.user.isAdmin) { // Assuming an 'isAdmin' field on User model
//     next();
//   } else {
//     res.status(403); // Forbidden
//     throw new Error('Not authorized as an admin');
//   }
// };

module.exports = { protect /*, admin */ };
