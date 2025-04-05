// controllers/tipController.js
const Tip = require("../models/Tip");
const User = require("../models/User");
// const razorpay = require("../services/razorpayService"); // Import Razorpay instance
// const razorpay = false;
const crypto = require("crypto"); // Node.js crypto module for verification
const asyncHandler = require("../middleware/asyncHandler");
const { getIo, emitToStreamer } = require("../services/websocketService"); // Import WebSocket functions

// @desc    Create a payment order
// @route   POST /api/tips/order
// @access  Public
const createTipOrder = asyncHandler(async (req, res) => {
  // TODO: Uncomment this when Razorpay is ready
  //--------------------------------
  // if (!razorpay) {
  //   res.status(503); // Service Unavailable
  //   throw new Error(
  //     "Payment service is currently unavailable. Configuration missing."
  //   );
  // }
  //--------------------------------

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

  const amountInPaise = Math.round(Number(amount) * 100); // Razorpay expects amount in smallest currency unit (e.g., paise for INR)

  if (amountInPaise <= 0) {
    res.status(400);
    throw new Error("Amount must be positive.");
  }

  const options = {
    amount: amountInPaise,
    currency: currency.toUpperCase(),
    receipt: `receipt_tip_${Date.now()}`, // Unique receipt ID
    // Add transfer details if using Razorpay Route/Connect for direct transfer
    // transfer_group: 'order_rcptid_G0001', // Example transfer group
    // "transfers": [
    //   {
    //     "account": streamer.paymentProviderDetails?.razorpayAccountId, // Target account ID from User model
    //     "amount": amountInPaise, // Or calculate platform fee etc.
    //     "currency": currency.toUpperCase(),
    //     // on_hold: 0, // Release immediately
    //     // on_hold_until: 1671223800 // Or release at specific time
    //   }
    // ]
  };

  try {
    // TODO: Uncomment this when Razorpay is ready
    //--------------------------------
    // const order = await razorpay.orders.create(options);
    //--------------------------------
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
      paymentOrderId: order.id, // Store Razorpay order_id
      status: "PENDING",
    });

    res.status(201).json({
      orderId: order.id,
      tipId: tip._id, // Internal tip ID
      providerKeyId: process.env.RAZORPAY_KEY_ID, // Public Key ID for frontend
      amount: order.amount, // Amount in paise
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    res.status(500);
    // Check for specific Razorpay errors if needed
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
  // TODO: Uncomment this when Razorpay is ready
  //--------------------------------
  // if (!razorpay) {
  //   res.status(503); // Service Unavailable
  //   throw new Error("Payment service is currently unavailable.");
  // }
  // // Destructure expected fields from Razorpay callback
  // const { razorpay_payment_id, razorpay_order_id, razorpay_signature, tipId } =
  //   req.body;

  // if (
  //   !razorpay_payment_id ||
  //   !razorpay_order_id ||
  //   !razorpay_signature ||
  //   !tipId
  // ) {
  //   res.status(400);
  //   throw new Error("Missing payment verification details.");
  // }
  //--------------------------------
  // TODO: Uncomment this when Razorpay is ready

  const { tipId, razorpay_order_id, razorpay_signature, razorpay_payment_id } =
    req.body;
  console.log("🆑 ------------------------------------🆑");
  console.log("🆑 ~ verifyTipPayment ~ tipId:", tipId);
  console.log("🆑 ------------------------------------🆑");
  // const razorpay_payment_id = Math.random().toString(36).substring(2, 15);

  // const razorpay_order_id = Math.random().toString(36).substring(2, 15);
  // const razorpay_signature = Math.random().toString(36).substring(2, 15);

  // Find the corresponding Tip record using internal tipId or razorpay_order_id
  // Using tipId is generally safer if provided reliably from the client context
  const tip = await Tip.findById(tipId);

  //TEMPORARY
  const alertPayload = {
    name: "John Doe",
    amount: "₹100.00", // Send formatted string
    currency: "INR",
    message: "Great stream!",
    tipId: "507f1f77bcf86cd799439011",
    timestamp: new Date().toISOString(),
  };
  console.log(`📦 Alert payload prepared:`, alertPayload);

  // Emit event to the specific streamer's room/connection
  console.log(
    `📣 Attempting to emit WebSocket event to streamer: ${tip.streamerId}`
  );
  const emitted = emitToStreamer(
    tip.streamerId.toString(),
    "new_tip",
    alertPayload
  );
  if (emitted) {
    console.log(
      `✅ Successfully emitted new_tip event for streamer: ${tip.streamerId}`
    );
  } else {
    console.log(
      `⚠️ No active WebSocket connections for streamer: ${tip.streamerId}`
    );
  }
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

    // --- Trigger Real-time Alert ---
    console.log(`🔔 Preparing real-time alert for streamer: ${tip.streamerId}`);
    try {
      // Format the amount (example)
      const formattedAmount = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: tip.currency,
        minimumFractionDigits: 0, // Adjust as needed
        maximumFractionDigits: 2,
      }).format(tip.amount);
      console.log(`💰 Formatted amount: ${formattedAmount}`);

      const alertPayload = {
        name: tip.tipperName,
        amount: formattedAmount, // Send formatted string
        currency: tip.currency,
        message: tip.message,
        tipId: tip._id.toString(),
        timestamp: new Date().toISOString(),
      };
      console.log(`📦 Alert payload prepared:`, alertPayload);

      // Emit event to the specific streamer's room/connection
      console.log(
        `📣 Attempting to emit WebSocket event to streamer: ${tip.streamerId}`
      );
      const emitted = emitToStreamer(
        tip.streamerId.toString(),
        "new_tip",
        alertPayload
      );

      if (emitted) {
        console.log(
          `✅ Successfully emitted new_tip event for streamer: ${tip.streamerId}`
        );
      } else {
        console.log(
          `⚠️ No active WebSocket connections for streamer: ${tip.streamerId}`
        );
      }
    } catch (socketError) {
      console.error(
        `❌ Error emitting WebSocket event for tip ${tip._id}:`,
        socketError
      );
      // Decide how to handle: log, maybe retry later? Payment is still successful.
    }

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
