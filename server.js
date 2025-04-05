const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Check if .env file exists
const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("ERROR: .env file not found!");
  console.error(`Expected location: ${envPath}`);
  console.error("Please create a .env file with your environment variables");
  console.error(
    "Required variables: DATABASE_URL, JWT_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET"
  );
  process.exit(1);
}

// Load environment variables from .env file
const result = dotenv.config();
if (result.error) {
  console.error("ERROR: Failed to load .env file:", result.error.message);
  process.exit(1);
}

// Verify critical environment variables are set
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(
    `ERROR: Missing required environment variables: ${missingVars.join(", ")}`
  );
  console.error(
    "Please check your .env file and ensure these variables are set"
  );
  process.exit(1);
}

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db"); // Database connection logic (to be created)
const { setupWebSocket } = require("./services/websocketService"); // WebSocket logic (to be created)
const errorHandler = require("./middleware/errorHandler"); // Error handling middleware (to be created)
const User = require("./models/User"); // <-- Import User model

// Placeholder Route Imports (to be created)
const authRoutes = require("./routes/authRoutes");
const waitlistRoutes = require("./routes/waitlistRoutes");
const streamerRoutes = require("./routes/streamerRoutes");
const tipRoutes = require("./routes/tipRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

console.log("JWT_SECRET loaded:", process.env.JWT_SECRET); // Add this line for testing
console.log("DB URL loaded:", process.env.DATABASE_URL); // Add this line for testing

// Connect to database first, with explicit async handling
(async function startServer() {
  try {
    // Connect to MongoDB first
    await connectDB();

    const app = express();
    const PORT = process.env.PORT || 5001;

    // Middleware
    app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      })
    );
    app.use(express.json());

    // API Routes
    app.get("/api/health", (req, res) => res.json({ status: "ok" }));
    app.use("/api/auth", authRoutes);
    app.use("/api/waitlist", waitlistRoutes);
    app.use("/api/streamers", streamerRoutes);
    app.use("/api/tips", tipRoutes);
    app.use("/api/dashboard", dashboardRoutes);

    // Error Handling Middleware (Should be last)
    app.use(errorHandler);

    // Create HTTP server and integrate Socket.IO
    const server = http.createServer(app);
    console.log("📋 HTTP Server created");

    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });
    console.log("📋 Socket.IO instance created:", !!io);
    console.log("📋 Socket.IO methods:", Object.keys(io).join(", "));

    // Setup WebSocket connection handling
    console.log("📋 About to call setupWebSocket...");
    setupWebSocket(io);
    console.log("📋 setupWebSocket called");

    // Add a test event to check if Socket.IO works
    io.on("connection", (socket) => {
      console.log(
        "📋 Server-level connection handler received connection:",
        socket.id
      );
    });

    // Only start server if database connected successfully
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server initialized and listening on port ${PORT}`);
    });

    module.exports = { app, server, io };
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
})();
