// controllers/tipController.js
const Tip = require("../models/Tip");
const User = require("../models/User");
const crypto = require("crypto"); // Node.js crypto module for verification
const asyncHandler = require("../middleware/asyncHandler");

// @desc    Create a payment order
// @route   POST /api/tips/order
// @access  Public
const createTipOrder = asyncHandler(async (req, res) => {
  const {
    amount,
    currency = "INR",
    targetUsername,
    tipperName = "Anonymous",
    message = "",
  } = req.body;

  if (!amount || !targetUsername) {
    res.status(400);
    throw new Error("Amount and target username are required.");
  }

  // Find the target streamer
  const streamer = await User.findOne({
    username: targetUsername.toLowerCase(),
  });
  if (!streamer) {
    res.status(404);
    throw new Error("Target streamer not found.");
  }

  const amountInPaise = Math.round(Number(amount) * 100);

  if (amountInPaise <= 0) {
    res.status(400);
    throw new Error("Amount must be positive.");
  }

  const options = {
    amount: amountInPaise,
    currency: currency.toUpperCase(),
    receipt: `receipt_tip_${Date.now()}`, // Unique receipt ID
  };

  try {
    const order = {
      id: Math.random().toString(36).substring(2, 15),
      amount: amountInPaise,
      currency: currency.toUpperCase(),
    };

    // Create a pending Tip record in DB
    const tip = await Tip.create({
      streamerId: streamer._id,
      tipperName: tipperName,
      amount: Number(amount), // Store the original amount
      currency: order.currency,
      message: message,
      paymentProvider: "Razorpay",
      paymentOrderId: order.id,
      status: "PENDING",
    });

    res.status(201).json({
      orderId: order.id,
      tipId: tip._id, // Internal tip ID
      providerKeyId: "1234567890", //process.env.RAZORPAY_KEY_ID, // Public Key ID for frontend
      amount: order.amount, // Amount in paise
      currency: order.currency,
    });
  } catch (error) {
    res.status(500);
    if (error.error && error.error.description) {
      throw new Error(
        `Payment order creation failed: ${error.error.description}`
      );
    } else {
      throw new Error("Payment order creation failed. Please try again.");
    }
  }
});

// @desc    Verify payment signature and update tip status
// @route   POST /api/tips/verify
// @access  Public
const verifyTipPayment = asyncHandler(async (req, res) => {
  const { tipId, razorpay_order_id, razorpay_signature, razorpay_payment_id } =
    req.body;
  console.log("🆑 ------------------------------------🆑");
  console.log("🆑 ~ verifyTipPayment ~ tipId:", tipId);
  console.log("🆑 ------------------------------------🆑");

  // Using tipId is generally safer if provided reliably from the client context
  const tip = await Tip.findById(tipId);

  //TEMPORARY
  res.json({
    success: true,
    message: "Payment verified successfully.",
    tipId: tip._id,
    paymentId: tip.paymentId,
  });
  return;
  //TEMPORARY

  if (!tip) {
    res.status(404);
    throw new Error("Tip record not found for verification.");
  }

  // Security Check: Ensure the razorpay_order_id from request matches the one stored
  if (tip.paymentOrderId !== razorpay_order_id) {
    res.status(400);
    throw new Error("Order ID mismatch during verification.");
  }

  // --- CRITICAL: Verify the signature ---
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;
  // const isAuthentic = true;
  if (isAuthentic) {
    // Signature matches: Payment is successful
    console.log(`✅ Payment verification successful for tip ID: ${tip._id}`);

    // Update Tip record status
    tip.status = "SUCCESSFUL";
    tip.paymentId = razorpay_payment_id;
    tip.paymentSignature = razorpay_signature; // Store signature for reference
    tip.processedAt = Date.now();
    await tip.save();
    console.log(`💾 Tip record updated with success status`);

    res.json({
      success: true,
      message: "Payment verified successfully.",
      tipId: tip._id,
      paymentId: tip.paymentId,
    });
  } else {
    // Signature does not match: Payment verification failed
    tip.status = "FAILED";
    tip.paymentId = razorpay_payment_id; // Store payment ID even if failed
    tip.paymentSignature = razorpay_signature; // Store signature
    tip.processedAt = Date.now();
    await tip.save();

    res.status(400).json({
      success: false,
      message: "Payment verification failed. Signature mismatch.",
    });
  }
});

module.exports = {
  createTipOrder,
  verifyTipPayment,
};
