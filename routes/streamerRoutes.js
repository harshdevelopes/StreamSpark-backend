// routes/streamerRoutes.js
const express = require("express");
const { getStreamerProfile } = require("../controllers/streamerController");

const router = express.Router();

router.get("/:username", getStreamerProfile);

module.exports = router;
