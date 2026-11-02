const mongoose = require("mongoose");

const connectDB = async () => {
  // Fail after 10s instead of the default 30s (e.g. when Atlas blocks the server's IP)
  const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
};

module.exports = connectDB;
