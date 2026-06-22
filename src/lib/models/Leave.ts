import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeave extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  leaveType: "sick" | "planned" | "other";
  subject: string;
  detail: string;
  fromDate: string;
  toDate: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    leaveType: { type: String, enum: ["sick", "planned", "other"], required: true },
    subject: { type: String, required: true, trim: true },
    detail: { type: String, required: true, trim: true },
    fromDate: { type: String, required: true },
    toDate: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectionReason: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

delete mongoose.models.Leave;
const Leave: Model<ILeave> = mongoose.model<ILeave>("Leave", LeaveSchema);
export default Leave;