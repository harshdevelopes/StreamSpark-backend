# SuperTip WebSocket Events

This document outlines the WebSocket events implemented in the SuperTip application for real-time communication between the server and clients.

## Connection Instructions

### For Alert Widgets/OBS Browser Sources

1. Connect to the WebSocket server with your unique alert token:

   ```javascript
   const socket = io("http://your-backend-url", {
     query: { token: "YOUR_UNIQUE_ALERT_TOKEN" },
     reconnection: true,
     reconnectionAttempts: Infinity,
     reconnectionDelay: 1000,
   });
   ```

2. This token can be obtained from:

   - Dashboard API: `GET /api/dashboard/widgets`
   - Response contains `alertToken` to use for connection

3. Connection is automatically authenticated via the token

### Connection Process

1. Client connects with token in query parameter
2. Server validates token against database
3. If valid, connection is established and linked to user
4. If invalid, connection is rejected with disconnect

## Available Events

### Server-to-Client Events (Events sent from server to client)

| Event Name      | Description                                        | Payload Example                                                                                                                             | Trigger                         |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `authenticated` | Sent when connection is successfully authenticated | `{ success: true }`                                                                                                                         | After token validation succeeds |
| `error`         | Sent when connection errors occur                  | `{ message: "Authentication failed: Invalid token" }`                                                                                       | When token is invalid/missing   |
| `new_tip`       | Sent when a streamer receives a new tip            | `{ name: "TipperName", amount: "₹100", currency: "INR", message: "Great stream!", tipId: "123456", timestamp: "2023-06-15T21:43:55.832Z" }` | After payment verification      |
| `pong`          | Response to ping event                             | `{ timestamp: 1686860635832 }`                                                                                                              | When server receives ping       |

### Client-to-Server Events

| Event Name | Description                        | Payload Example                | Response                          |
| ---------- | ---------------------------------- | ------------------------------ | --------------------------------- |
| `ping`     | Client can send to test connection | `{ timestamp: 1686860635832 }` | Server responds with `pong` event |

## Authentication

- All WebSocket connections require authentication via a unique alert token
- Each user receives a unique token stored in the `uniqueAlertToken` field of the User model
- Tokens are UUIDs generated when user accounts are created
- One user may have multiple connected socket clients (e.g., multiple browser sources)
- Failed authentication results in immediate disconnection with an error event

## Implementation Details

The WebSocket service is implemented in `services/websocketService.js` with enhanced logging:

1. `setupWebSocket(io)`: Initializes the Socket.IO server and handles connections

   - Logs all connection attempts with socket IDs
   - Tracks active connections per user

2. `getIo()`: Retrieves the Socket.IO instance for use elsewhere

3. `emitToStreamer(userId, eventName, data)`: Sends an event to all sockets connected for a specific user
   - Logs event emission details and recipient count
   - Returns boolean indicating if event was emitted to any sockets

## Enhanced Logging

The WebSocket service now includes comprehensive logging with emoji indicators:

- 🔌 Socket server initialization
- ✅ Successful connections
- 🔑 Token authentication
- 📊 Connection statistics
- 📣 Event emissions
- ❌ Errors and disconnections
- 🔍 Connection lookups
- 📦 Event payload details

Example log sequence for a tip event:

```
✅ Payment verification successful for tip ID: 60d5e6a91f3d7c2e80f9e8a7
💾 Tip record updated with success status
🔔 Preparing real-time alert for streamer: 60d5e6a91f3d7c2e80f9e8a9
💰 Formatted amount: ₹100
📦 Alert payload prepared: {name: "TipperName", amount: "₹100"...}
📣 Attempting to emit WebSocket event to streamer: 60d5e6a91f3d7c2e80f9e8a9
📣 Emitting [new_tip] to user 60d5e6a91f3d7c2e80f9e8a9 sockets: 8c-DkDuXhe3B0AAABCT
📦 Event data: {"name":"TipperName","amount":"₹100"...}
✅ Emitted to 1 sockets for user 60d5e6a91f3d7c2e80f9e8a9
```

## Integration with Tip System

When a tip is successfully verified in `tipController.js`, the server emits a `new_tip` event to the streamer's connected clients:

```javascript
// Format alert data
const alertPayload = {
  name: tip.tipperName,
  amount: formattedAmount,
  currency: tip.currency,
  message: tip.message,
  tipId: tip._id.toString(),
  timestamp: new Date().toISOString(),
};

// Emit to streamer's connected sockets
const emitted = emitToStreamer(
  tip.streamerId.toString(),
  "new_tip",
  alertPayload
);
```

## Client Implementation Example

Example client implementation for an alert overlay:

```javascript
// Connect to WebSocket with streamer's unique token
const socket = io("http://your-backend-url", {
  query: { token: "STREAMER_UNIQUE_ALERT_TOKEN" },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

// Connection events
socket.on("connect", () => {
  console.log("Connected to alert service");
  document.getElementById("status").className = "connected";
});

socket.on("authenticated", (data) => {
  console.log("Authentication successful", data);
  document.getElementById("status").innerText = "Authenticated";
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected from alert service", reason);
  document.getElementById("status").className = "disconnected";
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
  document.getElementById("status").className = "error";
});

// Test connection with ping
function pingServer() {
  socket.emit("ping", { timestamp: Date.now() });
}

socket.on("pong", (data) => {
  console.log(
    "Received pong from server, latency:",
    Date.now() - data.timestamp
  );
});

// Listen for new tip events
socket.on("new_tip", (data) => {
  console.log("New tip received:", data);

  // Display the alert with the received data
  displayAlert(data.name, data.amount, data.message);

  // Play sound
  const sound = new Audio("./alert-sound.mp3");
  sound.play();
});
```

## Debugging Tips

1. Check server logs for connection events (marked with emojis)
2. Use ping/pong to test connection health
3. Verify token validity and proper query parameter usage
4. Enable Socket.IO debug mode in client: `{ debug: true }`
