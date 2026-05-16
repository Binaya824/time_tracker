import mongoose, { Schema, Document, Model } from "mongoose";

export type TaskStatus = "todo" | "in_progress" | "review" | "completed" | "on_hold";
export type TaskPriority = "low" | "medium" | "high";
export type TaskType = "Feature" | "Bug" | "Research" | "Improvement" | "Deployment" | "Testing" | "Others";

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  project: mongoose.Types.ObjectId;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  assignedTo: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  allowEmployeeStatusUpdate: boolean;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed", "on_hold"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    type: {
      type: String,
      enum: ["Feature", "Bug", "Research", "Improvement", "Deployment", "Testing", "Others"],
      default: "Others",
    },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    allowEmployeeStatusUpdate: { type: Boolean, default: true },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

const Task: Model<ITask> =
  mongoose.models.Task ?? mongoose.model<ITask>("Task", TaskSchema);

export default Task;
