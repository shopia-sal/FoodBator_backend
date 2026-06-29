import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import userRouter from "./routes/userRoute.js";
import itemRouter from "./routes/itemRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";

const app = express();
const port = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware CORS Dinamis + Anti-Cache Vercel ll
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://foodbator.shopiahost.com",
    "https://adminfoodbator.shopiahost.com"
  ];
  
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  
  // INI BARIS SAKTINYA: Memaksa Vercel memisahkan cache untuk setiap domain
  res.setHeader("Vary", "Origin");
  
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ Failed to connect DB:", err.message);
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

// Penyesuaian khusus Vercel Serverless
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
  });
}

export default app;
