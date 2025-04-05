// services/websocketService.js
const User = require("../models/User"); // Needed to map token to user ID

let ioInstance = null;
const connectedUsers = new Map(); // Map: userId -> Set<socket.id>
const virtualSockets = new Map(); // Map: userId -> boolean (for users with virtual connections)

function setupWebSocket(io) {
  console.log("🔌 WebSocket server initializing...");

  if (!io) {
    console.error(
      "❌ ERROR: Socket.IO instance is undefined or null in setupWebSocket!"
    );
    return;
  }

  console.log("🔌 Socket.IO instance type:", typeof io);
  console.log("🔌 Socket.IO instance methods:", Object.keys(io).join(", "));

  ioInstance = io;

  // Log socket namespace middleware
  io.use((socket, next) => {
    console.log(`🔄 Socket middleware processing connection: ${socket.id}`);
    console.log(
      `🔑 Token provided: ${socket.handshake.query.token ? "Yes" : "No"}`
    );
    next();
  });

  // Log that we're setting up the connection event handler
  console.log("🔌 Setting up connection event handler");

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

          // If there was a virtual socket for this user, remove it now that they have a real connection
          if (virtualSockets.has(userId)) {
            console.log(
              `🔄 Removing virtual socket for user ${userId} as real connection established`
            );
            virtualSockets.delete(userId);
          }

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
    console.log(`🔌 Registering handler for ${event} event`);
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
  console.log("🔍 getIo called, instance exists:", !!ioInstance);
  return ioInstance;
}

// Function to create a virtual socket connection for a user
async function createVirtualSocketForUser(userId) {
  console.log(`🔌 Creating virtual socket for user ${userId}`);

  // Check if user already has a real connection
  if (isUserConnected(userId)) {
    console.log(
      `ℹ️ User ${userId} already has real socket connections, no need for virtual socket`
    );
    return true;
  }

  // Check if user already has a virtual connection
  if (virtualSockets.has(userId)) {
    console.log(`ℹ️ User ${userId} already has a virtual socket connection`);
    return true;
  }

  try {
    // Verify the user exists
    const user = await User.findById(userId).select("_id");
    if (!user) {
      console.error(
        `❌ Cannot create virtual socket: User ${userId} not found`
      );
      return false;
    }

    // Create a virtual socket entry
    virtualSockets.set(userId, true);
    console.log(`✅ Virtual socket created for user ${userId}`);

    // Create a virtual room for the user
    const io = getIo();
    io.of("/").adapter.rooms.set(userId, new Set(["virtual"]));

    return true;
  } catch (error) {
    console.error(
      `❌ Error creating virtual socket for user ${userId}:`,
      error
    );
    return false;
  }
}

// Function to emit an event to a specific streamer's connected sockets
async function emitToStreamer(userId, eventName, data) {
  console.log(`🔍 Emitting to streamer: ${userId}`);

  try {
    const io = getIo();
    let userSocketIds = connectedUsers.get(userId);

    // Check if user has real connections
    const hasRealConnections = !!(userSocketIds && userSocketIds.size > 0);
    // Check if user has a virtual connection
    const hasVirtualConnection = virtualSockets.has(userId);

    console.log(
      `🔍 Looking for sockets to emit '${eventName}' to user ${userId}`
    );
    console.log(`🔍 Connected users map size: ${connectedUsers.size}`);
    console.log(`🔍 Virtual sockets map size: ${virtualSockets.size}`);
    console.log(
      `🔍 User connection status: ${
        hasRealConnections
          ? `Connected with ${userSocketIds.size} real sockets`
          : hasVirtualConnection
          ? "Connected with virtual socket"
          : "Not connected"
      }`
    );

    // If no connection exists, create a virtual one
    if (!hasRealConnections && !hasVirtualConnection) {
      console.log(
        `🔄 No connections found for user ${userId}, creating virtual socket`
      );
      const created = await createVirtualSocketForUser(userId);
      if (!created) {
        console.error(`❌ Failed to create virtual socket for user ${userId}`);
        return false;
      }
    }

    // Emit to real sockets if they exist
    if (hasRealConnections) {
      console.log(
        `📣 Emitting [${eventName}] to user ${userId} real sockets: ${Array.from(
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

      console.log(`✅ Emitted to ${emitCount} real sockets for user ${userId}`);
      return true;
    }
    // Emit to virtual socket if no real ones exist
    else if (hasVirtualConnection || virtualSockets.has(userId)) {
      console.log(
        `📣 Emitting [${eventName}] to user ${userId} virtual socket`
      );
      console.log(`📦 Event data:`, JSON.stringify(data));

      // Emit to the room with the user's ID
      io.to(userId).emit(eventName, data);

      console.log(`✅ Emitted to virtual socket for user ${userId}`);
      return true;
    }
    // This should never happen due to the creation logic above
    else {
      console.log(
        `⚠️ No socket connections (real or virtual) for user ${userId} to emit [${eventName}]`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ Error in emitToStreamer for user ${userId}:`, error);
    return false;
  }
}

// Function to check if a user is connected with a real connection
function isUserConnected(userId) {
  const userSocketIds = connectedUsers.get(userId);
  return !!(userSocketIds && userSocketIds.size > 0);
}

// Function to check if a user has any connection (real or virtual)
function hasAnyConnection(userId) {
  return isUserConnected(userId) || virtualSockets.has(userId);
}

module.exports = {
  setupWebSocket,
  getIo,
  emitToStreamer,
  isUserConnected,
  hasAnyConnection,
  createVirtualSocketForUser,
};
