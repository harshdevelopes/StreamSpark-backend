// routes/tipRoutes.js
const express = require("express");
const {
  createTipOrder,
  verifyTipPayment,
} = require("../controllers/tipController");
// Note: These routes are public facing for the tipping process

const router = express.Router();

router.post("/order", createTipOrder);
router.post("/verify", verifyTipPayment);

module.exports = router;
