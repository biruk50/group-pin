import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoute from "./routes/users.js";
import pinRoute from "./routes/pins.js";
import groupRoute from "./routes/groups.js";

const app = express();
dotenv.config();
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

const port = process.env.PORT || 3000;

app.use("/api/users", userRoute);
app.use("/api/pins", pinRoute);
app.use("/api/groups", groupRoute);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.listen(port, () => {
  console.log("Server is running on port 3000");
});
