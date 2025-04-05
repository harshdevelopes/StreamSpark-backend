// websocket-test.js
const { io } = require("socket.io-client");

// Get token from command line arguments
const token = process.argv[2];
if (!token) {
  console.error("Please provide a token as a command line argument.");
  console.error("Usage: node websocket-test.js YOUR_TOKEN");
  process.exit(1);
}

// Connect to the WebSocket server
const socket = io("http://localhost:5001", {
  query: { token },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

console.log("Attempting to connect to WebSocket server...");

// Connection events
socket.on("connect", () => {
  console.log("Connected to WebSocket server!");
  console.log("Socket ID:", socket.id);

  // Test ping event
  console.log("Sending ping event...");
  socket.emit("ping", { timestamp: Date.now() });
});

socket.on("authenticated", (data) => {
  console.log("Authentication successful:", data);
});

socket.on("pong", (data) => {
  console.log("Received pong:", data);
  console.log("Latency:", Date.now() - data.timestamp, "ms");
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

// Keep the script running
setTimeout(() => {
  console.log("Test completed. Press Ctrl+C to exit.");
}, 5000);
