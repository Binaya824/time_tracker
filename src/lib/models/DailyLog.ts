import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDailyLog extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  startTime: Date;
  endTime?: Date;
  status: "active" | "paused" | "completed";
  pausedAt?: Date;
  totalPausedSeconds: number;
}

const DailyLogSchema = new Schema<IDailyLog>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { type: String, enum: ["active", "paused", "completed"], default: "active" },
  pausedAt: { type: Date },
  totalPausedSeconds: { type: Number, default: 0 },
});

DailyLogSchema.index({ user: 1, date: 1 }, { unique: true });

// Delete cached model so schema changes are always picked up on reload
delete mongoose.models.DailyLog;

const DailyLog: Model<IDailyLog> = mongoose.model<IDailyLog>("DailyLog", DailyLogSchema);

export default DailyLog;
