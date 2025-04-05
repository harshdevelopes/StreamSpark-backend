// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  // Determine status code: use error's status code if available, otherwise default to 500
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Specific Mongoose Error Handling (Optional but recommended)
  // Example: Handle Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404; // Not Found
    message = "Resource not found";
  }

  // Example: Handle Mongoose ValidationError
  if (err.name === "ValidationError") {
    statusCode = 400; // Bad Request
    // Combine multiple validation errors into one message
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Example: Handle Mongoose Duplicate Key Error (code 11000)
  if (err.code === 11000) {
    statusCode = 400; // Bad Request
    const field = Object.keys(err.keyValue)[0];
    message = `${
      field.charAt(0).toUpperCase() + field.slice(1)
    } already exists.`;
  }

  // Send the response
  res.status(statusCode).json({
    message: message,
    // Include stack trace only in development mode for debugging
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = errorHandler;
