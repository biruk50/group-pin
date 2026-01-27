import express from "express";
import Group from "../models/Group.js";
import User from "../models/User.js";
import Pin from "../models/Pin.js";

const router = express.Router();

// create group
router.post("/", async (req, res) => {
  try {
    const { name, owner } = req.body;
    const group = new Group({ name, owner, members: [owner] });
    const saved = await group.save();
    // add group to owner's user doc
    await User.updateOne({ username: owner }, { $push: { groups: saved._id } });
    res.status(200).json(saved);
  } catch (err) {
    res.status(500).json(err);
  }
});

// invite a user (adds to pending invites; owner or member can invite)
router.post("/:id/invite", async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json("Group not found");
    if (group.members.includes(username))
      return res.status(400).json("Already a member");
    if (group.invites && group.invites.includes(username))
      return res.status(400).json("Already invited");
    group.invites = group.invites || [];
    group.invites.push(username);
    await group.save();
    console.log(`Invited user ${username} to group ${group._id}`);
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json(err);
  }
});

// accept an invite (user accepts — moves from invites to members)
router.post("/:id/accept", async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json("Group not found");
    if (!group.invites || !group.invites.includes(username))
      return res.status(400).json("No invite found");
    // remove from invites
    group.invites = group.invites.filter((u) => u !== username);
    if (!group.members.includes(username)) group.members.push(username);
    await group.save();
    await User.updateOne({ username }, { $push: { groups: group._id } });
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json(err);
  }
});

// decline an invite (remove from invites)
router.post("/:id/decline", async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json("Group not found");
    if (!group.invites || !group.invites.includes(username))
      return res.status(400).json("No invite found");
    group.invites = group.invites.filter((u) => u !== username);
    await group.save();
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json(err);
  }
});

// list invites for a username (must be before the :id route)
router.get("/invites", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json("username required");
    const groups = await Group.find({ invites: username });
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json(err);
  }
});

// leave group (member chooses to leave)
router.post("/:id/leave", async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json("Group not found");
    if (!group.members.includes(username))
      return res.status(400).json("Not a member");
    group.members = group.members.filter((u) => u !== username);
    await group.save();
    await User.updateOne({ username }, { $pull: { groups: group._id } });
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json(err);
  }
});

// join group (for now same as invite - ensures user added)
router.post("/:id/join", async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json("Group not found");
    if (!group.members.includes(username)) {
      group.members.push(username);
      await group.save();
      await User.updateOne({ username }, { $push: { groups: group._id } });
    }
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json(err);
  }
});

// get group details
router.get("/:id", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json("Group not found");
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json(err);
  }
});

// list groups for a username
router.get("/", async (req, res) => {
  try {
    const { username } = req.query;
    if (username) {
      const groups = await Group.find({ members: username });
      return res.status(200).json(groups);
    }
    const groups = await Group.find();
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json(err);
  }
});

// list invites for a username
router.get("/invites", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json("username required");
    const groups = await Group.find({ invites: username });
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json(err);
  }
});

// clear all pins in a group (only owner)
router.post("/:id/clear", async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json("Group not found");
    if (group.owner !== username) return res.status(403).json("Not authorized");
    await Pin.deleteMany({ group: group._id });
    res.status(200).json("Pins cleared");
  } catch (err) {
    res.status(500).json(err);
  }
});

// delete a group and its pins (only owner)
router.delete("/:id", async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json("Group not found");
    if (group.owner !== username) return res.status(403).json("Not authorized");
    await Pin.deleteMany({ group: group._id });
    await User.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id } },
    );
    await group.deleteOne();
    res.status(200).json("Group and pins deleted");
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
