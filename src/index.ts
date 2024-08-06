import app from "./app";
import mongoose from "mongoose";

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    "Error: MongoDB connection string is missing. Please check your environment variables."
  );
  process.exit(1);
}

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`Server is running`);
    });
  } catch (error) {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  }
};

startServer();
