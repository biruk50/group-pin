import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: { type: String, required: true, min: 2, unique: true },
    email: { type: String, required: true, max: 100, unique: true },
    password: { type: String, required: true, min: 6 },
    groups: [{ type: Schema.Types.ObjectId, ref: "Group" }],
    location: {
      lat: { type: Number },
      long: { type: Number },
      active: { type: Boolean, default: false },
      updatedAt: { type: Date },
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
