# SuperTip Backend API Documentation

## 1. Overview

This document provides details on the API endpoints and WebSocket events for the SuperTip backend application.

- **Base URL:** `/api` (e.g., `http://yourdomain.com/api`)
- **Authentication:** Most protected routes require a JSON Web Token (JWT) passed in the `Authorization` header as a Bearer token (`Authorization: Bearer <YOUR_JWT_TOKEN>`). Tokens are obtained via the `/api/auth/login` or `/api/auth/register` endpoints.

## 2. Data Models

_(Refer to the initial requirements document for detailed database schema definitions for `User`, `Tip`, and `WaitlistEntry`.)_

## 3. API Endpoints

---

### 3.1. Authentication (`/api/auth`)

- **`POST /api/auth/register`**

  - **Description:** Registers a new streamer/user.
  - **Access:** Public
  - **Request Body:**
    ```json
    {
      "username": "streamer_cool",
      "displayName": "Cool Streamer",
      "email": "streamer@example.com",
      "password": "your_strong_password"
    }
    ```
    - `username` (String, required, unique, URL-friendly)
    - `displayName` (String, required)
    - `email` (String, required, unique)
    - `password` (String, required)
  - **Success Response (201 Created):**
    ```json
    {
      "_id": "60b...",
      "username": "streamer_cool",
      "displayName": "Cool Streamer",
      "email": "streamer@example.com",
      "avatarUrl": "",
      "coverImageUrl": "",
      "bio": "",
      "socialLinks": {},
      "alertTheme": "default",
      "alertSoundUrl": "",
      "uniqueAlertToken": "uuid...",
      "createdAt": "2023-10-27T...",
      "token": "jwt_token_string..."
    }
    ```
  - **Error Responses:**
    - `400 Bad Request`: Missing fields, invalid data, user already exists.
    - `500 Internal Server Error`.

- **`POST /api/auth/login`**

  - **Description:** Authenticates a user and returns a JWT.
  - **Access:** Public
  - **Request Body:**
    ```json
    {
      "email": "streamer@example.com",
      "password": "your_password"
    }
    ```
    - `email` (String, required)
    - `password` (String, required)
  - **Success Response (200 OK):** (Same structure as `/register` response, includes token)
  - **Error Responses:**
    - `400 Bad Request`: Missing fields.
    - `401 Unauthorized`: Invalid email or password.
    - `500 Internal Server Error`.

- **`POST /api/auth/logout`**

  - **Description:** Placeholder for logout. For JWT, logout is client-side (token removal).
  - **Access:** Public
  - **Success Response (200 OK):**
    ```json
    { "message": "Logout successful" }
    ```

- **`GET /api/auth/me`**
  - **Description:** Returns the profile of the currently authenticated user.
  - **Access:** Private (Requires Bearer Token)
  - **Success Response (200 OK):** (Same structure as `/register` response, _without_ the token field)
  - **Error Responses:**
    - `401 Unauthorized`: No token, invalid token, user not found for token.
    - `404 Not Found`: User associated with token doesn't exist.
    - `500 Internal Server Error`.

---

### 3.2. Waitlist (`/api/waitlist`)

- **`POST /api/waitlist`**
  - **Description:** Adds an email address to the waitlist.
  - **Access:** Public
  - **Request Body:**
    ```json
    { "email": "interested@example.com" }
    ```
    - `email` (String, required)
  - **Success Response (201 Created):**
    ```json
    {
      "_id": "60c...",
      "email": "interested@example.com",
      "createdAt": "2023-10-27T...",
      "message": "Successfully added to waitlist!"
    }
    ```
  - **Success Response (200 OK):** (If email already exists)
    ```json
    { "message": "Email is already on the waitlist." }
    ```
  - **Error Responses:**
    - `400 Bad Request`: Missing email, invalid email format.
    - `500 Internal Server Error`.

---

### 3.3. Streamer Profiles (`/api/streamers`)

- **`GET /api/streamers/{username}`**
  - **Description:** Fetches public profile data for a specific streamer.
  - **Access:** Public
  - **URL Parameters:**
    - `username` (String, required): The streamer's unique username.
  - **Success Response (200 OK):**
    ```json
    {
      "username": "streamer_cool",
      "displayName": "Cool Streamer",
      "avatarUrl": "url/to/avatar.jpg",
      "coverImageUrl": "url/to/cover.jpg",
      "bio": "Just streaming games!",
      "socialLinks": { "twitch": "url", "youtube": "url" },
      "createdAt": "2023-10-27T..."
    }
    ```
  - **Error Responses:**
    - `404 Not Found`: Streamer with that username not found.
    - `500 Internal Server Error`.

---

### 3.4. Tipping / Payments (`/api/tips`)

- **`POST /api/tips/order`**

  - **Description:** Creates a payment order (e.g., with Razorpay) before initiating payment on the frontend. Creates a `PENDING` Tip record.
  - **Access:** Public
  - **Request Body:**
    ```json
    {
      "amount": 10.5,
      "currency": "INR", // Optional, defaults to INR
      "targetUsername": "streamer_cool",
      "tipperName": "GenerousTipper", // Optional, defaults to 'Anonymous'
      "message": "Great stream!" // Optional
    }
    ```
    - `amount` (Number, required): Amount in the specified currency.
    - `currency` (String, optional): 3-letter currency code (e.g., 'INR', 'USD').
    - `targetUsername` (String, required): Username of the streamer receiving the tip.
    - `tipperName` (String, optional): Name provided by the tipper.
    - `message` (String, optional): Message from the tipper.
  - **Success Response (201 Created):**
    ```json
    {
      "orderId": "order_ABC123...", // Payment provider's order ID
      "tipId": "60d...", // Internal database Tip ID
      "providerKeyId": "rzp_test_...", // Your public Razorpay Key ID
      "amount": 1050, // Amount in smallest currency unit (e.g., paise)
      "currency": "INR"
    }
    ```
  - **Error Responses:**
    - `400 Bad Request`: Missing amount/username, invalid amount.
    - `404 Not Found`: Target streamer not found.
    - `500 Internal Server Error`: Razorpay order creation failed.
    - `503 Service Unavailable`: Razorpay keys not configured on backend.

- **`POST /api/tips/verify`**
  - **Description:** Verifies the payment signature received from the payment provider (e.g., Razorpay) after a successful payment attempt on the frontend. Updates Tip status to `SUCCESSFUL` or `FAILED`. **This verification MUST happen on the backend.** Triggers WebSocket alert on success.
  - **Access:** Public
  - **Request Body (Example for Razorpay):**
    ```json
    {
      "razorpay_payment_id": "pay_ABC123...",
      "razorpay_order_id": "order_ABC123...",
      "razorpay_signature": "razorpay_generated_signature",
      "tipId": "60d..." // Internal Tip ID created during /order
    }
    ```
  - **Success Response (200 OK - Payment Verified):**
    ```json
    {
      "success": true,
      "message": "Payment verified successfully.",
      "tipId": "60d...",
      "paymentId": "pay_ABC123..."
    }
    ```
  - **Error Response (400 Bad Request - Verification Failed):**
    ```json
    {
      "success": false,
      "message": "Payment verification failed. Signature mismatch." // Or other reasons
    }
    ```
  - **Other Error Responses:**
    - `400 Bad Request`: Missing verification details.
    - `404 Not Found`: Tip record not found.
    - `500 Internal Server Error`.
    - `503 Service Unavailable`: Razorpay keys not configured on backend.

---

### 3.5. Dashboard (`/api/dashboard`)

_(All routes in this section require authentication: `Authorization: Bearer <YOUR_JWT_TOKEN>`)_

- **`GET /api/dashboard/stats`**

  - **Description:** Fetches key statistics for the logged-in streamer.
  - **Access:** Private
  - **Success Response (200 OK):**
    ```json
    {
      "totalTips": 1550.75, // Sum of successful tip amounts
      "tipsToday": 55.0, // Sum of successful tip amounts today
      "uniqueSupporters": 12 // Count of distinct tipper names from successful tips
    }
    ```
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.

- **`GET /api/dashboard/tips`**

  - **Description:** Fetches a paginated list of tips received by the logged-in streamer.
  - **Access:** Private
  - **Query Parameters:**
    - `page` (Number, optional, default: 1): Page number.
    - `limit` (Number, optional, default: 10): Results per page.
  - **Success Response (200 OK):**
    ```json
    {
      "tips": [
        /* Array of Tip objects (see Tip model) */
      ],
      "currentPage": 1,
      "totalPages": 3,
      "totalTips": 25
    }
    ```
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.

- **`GET /api/dashboard/profile`**

  - **Description:** Fetches the editable profile data for the logged-in streamer.
  - **Access:** Private
  - **Success Response (200 OK):**
    ```json
    {
      "displayName": "Cool Streamer",
      "bio": "Just streaming games!",
      "socialLinks": { "twitch": "url", "youtube": "url" },
      "avatarUrl": "url/to/avatar.jpg",
      "coverImageUrl": "url/to/cover.jpg"
    }
    ```
  - **Error Responses:** `401 Unauthorized`, `404 Not Found` (if user deleted mid-session), `500 Internal Server Error`.

- **`PUT /api/dashboard/profile`**

  - **Description:** Updates the editable profile data for the logged-in streamer. Include only fields to be updated. **Image uploads require separate handling logic not detailed here.**
  - **Access:** Private
  - **Request Body:**
    ```json
    {
      "displayName": "Updated Name", // Optional
      "bio": "Updated bio here.", // Optional
      "socialLinks": { "twitch": "new_url", "twitter": "handle" }, // Optional
      "avatarUrl": "new_avatar_url", // Optional (Requires upload handling)
      "coverImageUrl": "new_cover_url" // Optional (Requires upload handling)
    }
    ```
  - **Success Response (200 OK):** (Returns updated profile data)
    ```json
    {
      "displayName": "Updated Name",
      "bio": "Updated bio here.",
      "socialLinks": { "twitch": "new_url", "twitter": "handle" },
      "avatarUrl": "new_avatar_url",
      "coverImageUrl": "new_cover_url"
    }
    ```
  - **Error Responses:** `400 Bad Request` (Validation errors), `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.

- **`GET /api/dashboard/settings`**

  - **Description:** Fetches the alert/widget settings for the logged-in streamer.
  - **Access:** Private
  - **Success Response (200 OK):**
    ```json
    {
      "alertTheme": "cyberpunk",
      "alertSoundUrl": "/sounds/alert.mp3"
    }
    ```
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.

- **`PUT /api/dashboard/settings`**

  - **Description:** Updates the alert/widget settings for the logged-in streamer.
  - **Access:** Private
  - **Request Body:**
    ```json
    {
      "alertTheme": "neon", // Optional
      "alertSoundUrl": "/sounds/new_alert.ogg" // Optional
    }
    ```
  - **Success Response (200 OK):** (Returns updated settings)
    ```json
    {
      "alertTheme": "neon",
      "alertSoundUrl": "/sounds/new_alert.ogg"
    }
    ```
  - **Error Responses:** `400 Bad Request` (Validation errors), `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.

- **`GET /api/dashboard/widgets`**
  - **Description:** Fetches information needed to construct widget URLs, primarily the alert token.
  - **Access:** Private
  - **Success Response (200 OK):**
    ```json
    {
      "alertToken": "uuid...", // Secure token for WebSocket connection
      "alertTheme": "neon",
      "alertSoundUrl": "/sounds/new_alert.ogg"
    }
    ```
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.

---

## 4. Real-time Communication (WebSockets)

- **Connection:**

  - Clients (like the OBS browser source alert page) connect to the WebSocket server.
  - Authentication is done via a query parameter containing the streamer's unique alert token (obtained from `GET /api/dashboard/widgets`).
  - Example connection URL: `ws://yourdomain.com?token=UNIQUE_ALERT_TOKEN` (or `wss://` for secure connections).
  - The server validates the token and associates the connection with the streamer ID. Invalid tokens or missing tokens will result in disconnection.

- **Server-Sent Events:**
  - **Event:** `new_tip`
    - **Trigger:** Sent automatically after a successful payment verification via `POST /api/tips/verify`.
    - **Recipient:** Only sent to the specific streamer whose tip was verified.
    - **Payload:**
      ```json
      {
        "name": "TipperName",
        "amount": "₹500.00", // Formatted amount string (currency based on tip)
        "currency": "INR", // Original currency code
        "message": "Great stream!" // Optional tipper message
        // Note: Theme/sound details are currently expected to be handled
        // by the alert page itself using settings, potentially fetched
        // initially or passed via the alert URL query params.
      }
      ```

---
