import mongoose from "mongoose";
const { Schema } = mongoose;

const GroupSchema = new Schema(
  {
    name: { type: String, required: true },
    owner: { type: String, required: true }, // username of owner
    members: [{ type: String }], // list of usernames
    invites: [{ type: String }], // pending invite usernames
    // invites could be added here if you want invite tokens
  },
  { timestamps: true },
);

export default mongoose.model("Group", GroupSchema);
