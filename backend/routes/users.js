import express from "express";
import User from "../models/User.js";
import bcrypt from "bcrypt";

const router = express.Router();

//REGISTER
router.post("/register", async (req, res) => {
  try {
    //generate new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    //create new user
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
    });

    //save user and respond
    const user = await newUser.save();
    res.status(200).json(user._id);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//LOGIN
router.post("/login", async (req, res) => {
  try {
    //find user
    const user = await User.findOne({ username: req.body.username });
    !user && res.status(400).json("Wrong username or password");

    //validate password
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password,
    );
    !validPassword && res.status(400).json("Wrong username or password");

    //send response
    res.status(200).json({ _id: user._id, username: user.username });
  } catch (err) {
    res.status(500).json(err);
  }
});

// update location
router.patch("/:username/location", async (req, res) => {
  try {
    const { username } = req.params;
    const { lat, long, active } = req.body;
    const user = await User.findOneAndUpdate(
      { username },
      { location: { lat, long, active, updatedAt: new Date() } },
      { new: true },
    );
    if (!user) return res.status(404).json("User not found");
    res.status(200).json(user.location);
  } catch (err) {
    res.status(500).json(err);
  }
});

// get active users' locations
router.get("/locations/active", async (req, res) => {
  try {
    const { group } = req.query;
    const filter = { "location.active": true };
    if (group) {
      // only users who are members of the given group
      filter.groups = group;
    }
    const users = await User.find(filter).select("username location groups");
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
