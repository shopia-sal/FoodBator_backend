import express from "express";
import cors from "cors";
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

// Middleware CORS yang aman untuk Vercel & cPanel
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://foodbator.shopiahost.com",
  "https://adminfoodbator.shopiahost.com"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

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

// Penyesuaian khusus Vercel Serverless (Jangan pakai app.listen murni di luar environment lokal)
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
  });
}

// Ekspor aplikasi agar dibaca dengan benar oleh @vercel/node di vercel.json
export default app;
