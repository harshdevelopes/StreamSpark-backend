const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId }, // Payload: typically includes user ID
    process.env.JWT_SECRET, // Secret key from environment variables
    // "sampletokenheretotest", // Secret key from environment variables
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" } // Token expiry time
  );
};

module.exports = generateToken;
