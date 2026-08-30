const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      enum: ["USD", "SOS"],
      default: "USD",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank", "wallet", "cash", "other"],
      default: "card",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 400,
      default: null,
    },
    transactionId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
  },
  { timestamps: true }
);

donationSchema.index({ donorId: 1, createdAt: -1 });
donationSchema.index({ campaignId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Donation", donationSchema);
