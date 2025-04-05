# SuperTip WebSocket Integration Guide for Frontend

This document provides comprehensive instructions for integrating with the SuperTip WebSocket system. The backend has been updated with extensive console logging for easier debugging.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install socket.io-client
```

### 2. Connection Setup

```javascript
import { io } from "socket.io-client";

// For alert widgets (like OBS browser source)
const socket = io("http://your-backend-url", {
  query: { token: "STREAMER_UNIQUE_ALERT_TOKEN" },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
```

### 3. Get Alert Token

Each streamer has a unique token that must be used to authenticate WebSocket connections.

```javascript
// Example token fetch - use in dashboard
async function getAlertToken() {
  try {
    const response = await fetch(
      "http://your-backend-url/api/dashboard/widgets",
      {
        headers: {
          Authorization: "Bearer " + userJwtToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch alert token");
    }

    const data = await response.json();
    return data.alertToken; // This is the token to use for WebSocket connection
  } catch (error) {
    console.error("Error fetching alert token:", error);
    return null;
  }
}
```

## Events to Listen For

### Connection Events

```javascript
// Connection successful
socket.on("connect", () => {
  console.log("Connected to SuperTip alert service");
  updateUIConnectionStatus(true);
});

// Authenticated successfully
socket.on("authenticated", (data) => {
  console.log("Authentication successful", data);
  // You can update UI to show authenticated status
});

// Connection closed
socket.on("disconnect", (reason) => {
  console.log("Disconnected from SuperTip alert service", reason);
  updateUIConnectionStatus(false);
});

// Connection/auth errors
socket.on("error", (error) => {
  console.error("Socket error:", error);
  showErrorMessage(error.message || "Connection error");
});

// Test connection with ping
function pingServer() {
  socket.emit("ping", { timestamp: Date.now() });
}

// Receive pong response
socket.on("pong", (data) => {
  console.log("Received pong from server:", data);
  const latency = Date.now() - data.timestamp;
  console.log(`Latency: ${latency}ms`);
});
```

### Alert Events

```javascript
// Listen for new tips
socket.on("new_tip", (data) => {
  console.log("New tip received:", data);

  /* 
  data object structure:
  {
    name: "TipperName",        // Name of person who tipped
    amount: "₹100",            // Formatted amount with currency symbol
    currency: "INR",           // Currency code
    message: "Great stream!",  // Optional message from tipper
    tipId: "507f1f77bcf86cd799439011", // Database ID of the tip
    timestamp: "2023-06-15T21:43:55.832Z" // ISO timestamp when tip was processed
  }
  */

  // Display alert based on received data
  displayTipAlert(data);
});
```

## Implementation Examples

### Alert Widget (OBS Browser Source)

```javascript
// HTML structure (simplified)
// <div id="status">Disconnected</div>
// <div id="alerts"></div>

// Get alert token from URL query params
const urlParams = new URLSearchParams(window.location.search);
const alertToken = urlParams.get("token");

if (!alertToken) {
  document.getElementById("status").innerText =
    "Error: No alert token provided";
  document.getElementById("status").className = "error";
  throw new Error("No alert token provided in URL");
}

// Connect with token
const socket = io("http://your-backend-url", {
  query: { token: alertToken },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

// Status indicators
socket.on("connect", () => {
  console.log("Connected to alert service");
  document.getElementById("status").innerText = "Connected";
  document.getElementById("status").className = "connected";
});

socket.on("authenticated", () => {
  console.log("Authenticated with token");
  document.getElementById("status").innerText = "Authenticated";
});

socket.on("disconnect", () => {
  console.log("Disconnected from alert service");
  document.getElementById("status").innerText = "Disconnected";
  document.getElementById("status").className = "disconnected";
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
  document.getElementById("status").innerText =
    "Error: " + (error.message || "Unknown error");
  document.getElementById("status").className = "error";
});

// Handle new tips with animation
socket.on("new_tip", (data) => {
  console.log("New tip received:", data);

  // Create alert elements
  const alertContainer = document.createElement("div");
  alertContainer.className = "alert-container";
  alertContainer.dataset.tipId = data.tipId;

  const nameEl = document.createElement("div");
  nameEl.className = "tipper-name";
  nameEl.innerText = data.name;

  const amountEl = document.createElement("div");
  amountEl.className = "tip-amount";
  amountEl.innerText = data.amount;

  const messageEl = document.createElement("div");
  messageEl.className = "tip-message";
  messageEl.innerText = data.message || ""; // Message might be empty

  // Add to DOM
  alertContainer.appendChild(nameEl);
  alertContainer.appendChild(amountEl);
  alertContainer.appendChild(messageEl);
  document.getElementById("alerts").appendChild(alertContainer);

  // Animation sequence
  alertContainer.classList.add("animate-in");

  // Play sound
  const sound = new Audio("./alert-sound.mp3");
  sound.play();

  // Remove after animation
  setTimeout(() => {
    alertContainer.classList.remove("animate-in");
    alertContainer.classList.add("animate-out");

    setTimeout(() => {
      alertContainer.remove();
    }, 1000); // Duration of fade-out animation
  }, 8000); // Display duration
});
```

### Dashboard Integration

```javascript
// In dashboard component
async function setupAlertWidget() {
  try {
    // Get alert token
    const response = await fetch("/api/dashboard/widgets", {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch widget data");
    }

    const data = await response.json();

    // Generate the alert URL for OBS/streamers
    const alertUrl = `https://your-frontend-url/alert?token=${data.alertToken}`;

    // Update UI with the URL
    document.getElementById("alertUrl").value = alertUrl;

    // Add copy button functionality
    document.getElementById("copyBtn").addEventListener("click", () => {
      navigator.clipboard.writeText(alertUrl);
      showToast("Alert URL copied to clipboard");
    });

    // Optional: Test connection
    document
      .getElementById("testAlertBtn")
      .addEventListener("click", async () => {
        try {
          const testResponse = await fetch("/api/dashboard/test-alert", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "Test User",
              amount: 100,
              message: "This is a test alert!",
            }),
          });

          if (testResponse.ok) {
            showToast("Test alert sent successfully!");
          } else {
            showToast("Failed to send test alert", "error");
          }
        } catch (error) {
          console.error("Error sending test alert:", error);
          showToast("Error sending test alert", "error");
        }
      });
  } catch (error) {
    console.error("Error setting up alert widget:", error);
    showErrorMessage("Failed to load widget data");
  }
}
```

## Connection URL for OBS Browser Source

The OBS browser source URL should be structured as follows:

```
https://your-frontend-url/alert?token=STREAMER_UNIQUE_ALERT_TOKEN
```

Where:

- `your-frontend-url` is your frontend application URL
- `STREAMER_UNIQUE_ALERT_TOKEN` is the token obtained from the `/api/dashboard/widgets` endpoint

## Debug Tips

1. **Enable detailed logging in the frontend:**

```javascript
const socket = io("http://your-backend-url", {
  query: { token: alertToken },
  debug: true, // Enable Socket.IO debugging
});
```

2. **Check connection status in browser console:**

   - Look for "Connected to SuperTip alert service" message
   - Verify "Authentication successful" appears after connection

3. **Verify your token is correct:**

   - Token should match what's stored in the database
   - Token is passed as a query parameter, not header

4. **Test connection with ping/pong:**

   - Use the ping function to test connectivity
   - Measure latency to ensure good connection quality

5. **Ask backend developers to check logs:**
   - The backend now has detailed logging for all WebSocket events
   - Events are marked with emojis for better visibility in logs

## WebSocket Event Flow Diagram

```
┌─────────────┐                 ┌─────────────┐                 ┌─────────────┐
│             │                 │             │                 │             │
│   Frontend  │                 │   Backend   │                 │  Database   │
│             │                 │             │                 │             │
└──────┬──────┘                 └──────┬──────┘                 └──────┬──────┘
       │                               │                               │
       │ Connect with token            │                               │
       ├───────────────────────────────►                               │
       │                               │                               │
       │                               │ Verify token                  │
       │                               ├───────────────────────────────►
       │                               │                               │
       │                               │ Token valid                   │
       │                               ◄───────────────────────────────┤
       │                               │                               │
       │ Authentication successful     │                               │
       ◄───────────────────────────────┤                               │
       │                               │                               │
       │                               │                               │
       │                         ┌─────┴─────┐                         │
       │                         │ User tips │                         │
       │                         └─────┬─────┘                         │
       │                               │                               │
       │                               │ Verify payment                │
       │                               ├───────────────────────────────►
       │                               │                               │
       │                               │ Payment verified              │
       │                               ◄───────────────────────────────┤
       │                               │                               │
       │ new_tip event                 │                               │
       ◄───────────────────────────────┤                               │
       │                               │                               │
┌──────┴──────┐                 ┌──────┴──────┐                 ┌──────┴──────┐
│             │                 │             │                 │             │
│   Frontend  │                 │   Backend   │                 │  Database   │
│             │                 │             │                 │             │
└─────────────┘                 └─────────────┘                 └─────────────┘
```
