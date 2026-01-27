import express from "express";
import Pin from "../models/Pin.js";

const router = express.Router();
//create a pin
router.post("/", async (req, res) => {
  const newPin = new Pin(req.body);
  try {
    const savedPin = await newPin.save();
    res.status(200).json(savedPin);
  } catch (err) {
    res.status(500).json(err);
  }
});

//get pins, optional group filter
router.get("/", async (req, res) => {
  try {
    const { group } = req.query;
    const query = {};
    if (group) query.group = group;
    const pins = await Pin.find(query);
    res.status(200).json(pins);
  } catch (err) {
    res.status(500).json(err);
  }
});

// delete a pin (only the creator can delete)
router.delete("/:id", async (req, res) => {
  try {
    const { username } = req.body;
    const pin = await Pin.findById(req.params.id);
    if (!pin) return res.status(404).json("Pin not found");
    if (pin.username !== username)
      return res.status(403).json("Not authorized");
    await pin.deleteOne();
    res.status(200).json("Pin deleted");
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
