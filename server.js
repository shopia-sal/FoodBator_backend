import express from "express";
import cors from "cors";
import dns from "dns";
import "dotenv/config";
import { connectDB } from "./config/db.js";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import userRouter from "./routes/userRoute.js";
import itemRouter from "./routes/itemRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
const app = express();
const port = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173", // Untuk testing frontend lokal
        "http://localhost:5174", // Untuk testing admin lokal
        "https://foodbator.shopiahost.com", // Domain utama Frontend (User)
        "https://adminfoodbator.shopiahost.com", // Tambahkan domain Admin kamu di sini!
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by Cors"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// database
const MONGO_URL = process.env.MONGO_URL;
console.log("MONGO_URL:", MONGO_URL);

mongoose
  .connect(MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ Failed to connect DB:", err.message);
    console.log("⚠️ Server still running without DB...");
  });

// Routes
app.use("/api/user", userRouter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/items", itemRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);

app.get("/", (req, res) => {
  res.send("API WORKING");
});

app.listen(port, () => {
  console.log(`Server Started on http://localhost:${port}`);
});
