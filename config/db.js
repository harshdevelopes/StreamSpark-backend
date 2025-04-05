// config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // const conn = await mongoose.connect(process.env.DATABASE_URL, {
    const conn = await mongoose.connect(
      "mongodb+srv://harshdevelopes:iT1mYPiyKlx8Wgi3@cluster0mumbai.h7mtb0n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0Mumbai",
      {
        // Options to avoid deprecation warnings (adjust as needed for your Mongoose version)
        useNewUrlParser: true,
        useUnifiedTopology: true,
        // useCreateIndex: true, // May not be needed in newer Mongoose versions
        // useFindAndModify: false // May not be needed in newer Mongoose versions
      }
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
