# Setting Up OAuth Authentication

This guide will help you set up OAuth authentication for the Supertip application.

## Google OAuth Setup

1. **Create a Google Cloud Project**:

   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"

2. **Configure OAuth Consent Screen**:

   - Click on "OAuth consent screen" in the left sidebar
   - Select "External" user type (unless you have a Google Workspace)
   - Fill out the required app information (app name, user support email, developer contact information)
   - Add the required scopes (at minimum: `email`, `profile`)
   - Add your test users if in testing mode
   - Save and continue

3. **Create OAuth Client ID**:

   - Click on "Credentials" in the left sidebar
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add a name for your client ID
   - Add Authorized JavaScript origins:
     - For development: `http://localhost:3000`
     - For production: Your production frontend URL
   - Add Authorized redirect URIs:
     - For development: `http://localhost:3000/auth/google/callback`
     - For production: `https://yourdomain.com/auth/google/callback`
   - Click "Create"

4. **Copy Client ID and Secret**:
   - After creation, you'll get your Client ID and Client Secret
   - Copy these values to your `.env` file:
     ```
     GOOGLE_CLIENT_ID=your_client_id_here
     GOOGLE_CLIENT_SECRET=your_client_secret_here
     ```

## Frontend Integration

In your frontend application, you'll need to:

1. **Install the Google Sign-In SDK**:

   ```
   npm install @react-oauth/google
   ```

2. **Initialize the Google SDK**:

   ```jsx
   import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

   function App() {
     return (
       <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
         {/* Your app content */}
       </GoogleOAuthProvider>
     );
   }
   ```

3. **Add the Google Sign-In Button**:

   ```jsx
   import { GoogleLogin } from "@react-oauth/google";

   function LoginPage() {
     const handleGoogleSuccess = async (credentialResponse) => {
       try {
         const response = await fetch("http://localhost:8000/api/auth/google", {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
           },
           body: JSON.stringify({
             idToken: credentialResponse.credential,
           }),
         });

         const data = await response.json();

         if (response.ok) {
           // Store the token and redirect or update state
           localStorage.setItem("userToken", data.token);
           // Redirect to dashboard or update logged-in state
         } else {
           console.error("Google login failed:", data.message);
         }
       } catch (error) {
         console.error("Error during Google login:", error);
       }
     };

     return (
       <div>
         <h2>Login with Google</h2>
         <GoogleLogin
           onSuccess={handleGoogleSuccess}
           onError={() => console.log("Login Failed")}
         />
         {/* Your regular login form */}
       </div>
     );
   }
   ```

## Adding More OAuth Providers

The codebase is structured to easily add more OAuth providers in the future:

1. Create a new utility file for the provider (e.g., `facebookAuth.js`)
2. Add the provider's authentication logic to `authController.js`
3. Add a new route in `authRoutes.js`
4. Update the frontend to include the new sign-in option

## Security Considerations

- Always validate tokens on the server side
- Store OAuth client secrets securely in environment variables
- Never expose client secrets to the frontend
- Consider implementing CSRF protection
- Use HTTPS in production
- Regularly audit and rotate credentials
