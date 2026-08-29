const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["campaign_approved", "campaign_rejected", "campaign_published", "new_donation", "goal_reached", "withdrawal_completed", "payment_failed", "security_alert"],
      required: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    channel: { type: String, enum: ["in_app", "email", "sms"], default: "in_app" },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
