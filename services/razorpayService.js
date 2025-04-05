// services/razorpayService.js
const Razorpay = require("razorpay");

let razorpayInstance;

try {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn(
      "Razorpay Key ID or Key Secret not found in environment variables. Payment processing will be disabled."
    );
    // You might want to throw an error here in production if keys are mandatory
    // throw new Error('Razorpay Key ID or Key Secret not found.');
    razorpayInstance = null; // Explicitly set to null if keys are missing
  } else {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("Razorpay instance initialized successfully.");
  }
} catch (error) {
  console.error("Failed to initialize Razorpay:", error);
  razorpayInstance = null; // Ensure instance is null on error
}

module.exports = razorpayInstance; // Export the instance (could be null)
