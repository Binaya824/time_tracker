import mongoose, { Schema, Document, Model } from "mongoose";

export type TimeEntryStatus = "running" | "paused" | "stopped";

export interface ITimeEntry extends Document {
  _id: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  status: TimeEntryStatus;
  createdAt: Date;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number }, // seconds
    status: {
      type: String,
      enum: ["running", "paused", "stopped"],
      default: "running",
    },
  },
  { timestamps: true }
);

const TimeEntry: Model<ITimeEntry> =
  mongoose.models.TimeEntry ??
  mongoose.model<ITimeEntry>("TimeEntry", TimeEntrySchema);

export default TimeEntry;
