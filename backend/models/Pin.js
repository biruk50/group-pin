import mongoose from "mongoose";
const { Schema } = mongoose;

const PinSchema = new Schema(
  {
    username: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String },
    lat: { type: Number, required: true },
    long: { type: Number, required: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Pin", PinSchema);
