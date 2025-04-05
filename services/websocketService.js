// services/websocketService.js
const User = require("../models/User"); // Needed to map token to user ID

let ioInstance = null;
const connectedUsers = new Map(); // Map: userId -> Set<socket.id>

function setupWebSocket(io) {
  console.log("🔌 WebSocket server initializing...");
  ioInstance = io;

  // Log socket namespace middleware
  io.use((socket, next) => {
    console.log(`🔄 Socket middleware processing connection: ${socket.id}`);
    console.log(
      `🔑 Token provided: ${socket.handshake.query.token ? "Yes" : "No"}`
    );
    next();
  });

  io.on("connection", async (socket) => {
    console.log(`✅ WebSocket client connected: ${socket.id}`);
    console.log(`📊 Current connections count: ${io.engine.clientsCount}`);

    // --- Authentication/Identification via Token ---
    const token = socket.handshake.query.token; // Get token from query param ?token=UNIQUE_TOKEN
    let userId = null;

    if (token) {
      console.log(
        `🔍 Authenticating socket ${socket.id} with token: ${token.substring(
          0,
          6
        )}...`
      );
      try {
        // Find user by their unique alert token
        const user = await User.findOne({ uniqueAlertToken: token }).select(
          "_id"
        );
        if (user) {
          userId = user._id.toString();
          console.log(
            `✅ WebSocket client ${socket.id} authenticated for user ${userId} via token.`
          );

          // Store the mapping
          if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
            console.log(`📌 Creating new socket set for user ${userId}`);
          }
          connectedUsers.get(userId).add(socket.id);
          console.log(
            `📊 User ${userId} now has ${
              connectedUsers.get(userId).size
            } active connections`
          );

          // Optional: Join a room specific to the user
          socket.join(userId);
          console.log(`🔗 Socket ${socket.id} joined room: ${userId}`);

          // Emit a successful authentication event
          socket.emit("authenticated", { success: true });
          console.log(`📣 Sent 'authenticated' event to socket ${socket.id}`);
        } else {
          console.log(
            `❌ WebSocket client ${socket.id} failed authentication: Invalid token.`
          );
          socket.emit("error", {
            message: "Authentication failed: Invalid token",
          });
          socket.disconnect(true); // Disconnect if token is invalid
        }
      } catch (error) {
        console.error(
          `❌ Error during WebSocket authentication for token ${token.substring(
            0,
            6
          )}...:`,
          error
        );
        socket.emit("error", { message: "Authentication error" });
        socket.disconnect(true);
      }
    } else {
      console.log(
        `❌ WebSocket client ${socket.id} did not provide an authentication token.`
      );
      socket.emit("error", { message: "No authentication token provided" });
      socket.disconnect(true); // Disconnect if no token provided
    }

    // Log all socket events for debugging
    const originalOn = socket.on;
    socket.on = function (event, handler) {
      if (event !== "error" && event !== "disconnect") {
        return originalOn.call(this, event, (...args) => {
          console.log(
            `📥 Socket ${socket.id} received '${event}' event with data:`,
            args
          );
          return handler.apply(this, args);
        });
      } else {
        return originalOn.call(this, event, handler);
      }
    };

    socket.on("disconnect", (reason) => {
      console.log(
        `❌ WebSocket client disconnected: ${socket.id}, reason: ${reason}`
      );
      // Clean up the mapping
      if (userId && connectedUsers.has(userId)) {
        connectedUsers.get(userId).delete(socket.id);
        console.log(
          `📊 User ${userId} now has ${
            connectedUsers.get(userId).size
          } active connections left`
        );
        if (connectedUsers.get(userId).size === 0) {
          connectedUsers.delete(userId);
          console.log(`🧹 User ${userId} fully disconnected from WebSocket.`);
        }
      }
      console.log(`📊 Total connections remaining: ${io.engine.clientsCount}`);
    });

    // Handle other potential client-side events if needed
    socket.on("ping", (data) => {
      console.log(`📣 Received ping from ${socket.id}`);
      socket.emit("pong", { timestamp: Date.now() });
    });
  });

  // Log global connection events on the main io instance
  const ioEvents = ["connection", "connect_error", "disconnect"];
  ioEvents.forEach((event) => {
    io.engine.on(event, (error) => {
      if (event === "connect_error") {
        console.log(`❌ Socket.IO server connection error:`, error);
      } else {
        console.log(`🔌 Socket.IO server event: ${event}`);
      }
    });
  });

  console.log("🚀 WebSocket server setup complete");
}

function getIo() {
  if (!ioInstance) {
    console.error("❌ Socket.IO not initialized! Call setupWebSocket first.");
    throw new Error("Socket.IO not initialized!");
  }
  return ioInstance;
}

// Function to emit an event to a specific streamer's connected sockets
function emitToStreamer(userId, eventName, data) {
  const io = getIo();
  const userSocketIds = connectedUsers.get(userId);

  console.log(
    `🔍 Looking for sockets to emit '${eventName}' to user ${userId}`
  );

  if (userSocketIds && userSocketIds.size > 0) {
    console.log(
      `📣 Emitting [${eventName}] to user ${userId} sockets: ${Array.from(
        userSocketIds
      ).join(", ")}`
    );
    console.log(`📦 Event data:`, JSON.stringify(data));

    // Emit to each specific socket ID associated with the user
    let emitCount = 0;
    userSocketIds.forEach((socketId) => {
      io.to(socketId).emit(eventName, data);
      emitCount++;
    });

    console.log(`✅ Emitted to ${emitCount} sockets for user ${userId}`);
    return true; // Indicate event was emitted to at least one socket
  } else {
    console.log(
      `⚠️ No active WebSocket connection found for user ${userId} to emit [${eventName}].`
    );
    return false; // Indicate no sockets found for the user
  }
}

module.exports = {
  setupWebSocket,
  getIo,
  emitToStreamer,
};
