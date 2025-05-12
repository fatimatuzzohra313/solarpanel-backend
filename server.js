import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connect from "./config.js";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";

dotenv.config();
const app = express();

// ✅ Set CLIENT_URL in your .env file like this:
// CLIENT_URL=https://solarlane.netlify.app
const CLIENT_URL = process.env.CLIENT_URL || "https://solarlane.netlify.app";

// ✅ Apply CORS middleware ONCE — before routes
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// ✅ Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Load all route files dynamically
const routeFiles = fs.readdirSync("./routes");
routeFiles.forEach((file) => {
  import(`./routes/${file}`)
    .then((route) => {
      app.use("/api/v1", route.default);
    })
    .catch((err) => {
      console.error("❌ Failed to load route file", file, err);
    });
});

// ✅ Connect to database
connect()
  .then(() => {
    console.log("✅ Database connected");
  })
  .catch((err) => {
    console.error("❌ Failed to connect to database:", err.message);
  });

// ✅ Export app for Vercel
export default app;
