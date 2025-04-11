const { OAuth2Client } = require("google-auth-library");

// Create a new instance of the OAuth2 client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and return user info
 * @param {string} token - The Google ID token to verify
 * @returns {Object} Google user information
 */
const verifyGoogleToken = async (token) => {
  try {
    // Verify the token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Get the payload from the ticket
    const payload = ticket.getPayload();

    // Return necessary user information
    return {
      googleId: payload.sub, // The Google ID is stored as 'sub' in the payload
      email: payload.email,
      displayName: payload.name,
      firstName: payload.given_name,
      lastName: payload.family_name,
      avatarUrl: payload.picture,
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    console.error("Error verifying Google token:", error);
    throw new Error("Invalid Google token");
  }
};

module.exports = { verifyGoogleToken };
