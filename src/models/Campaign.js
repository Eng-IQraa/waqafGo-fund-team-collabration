const mongoose = require("mongoose");

const campaignImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    alt: { type: String, trim: true, maxlength: 200, default: null },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 140,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 10000,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD", "SOS"],
      default: "USD",
      required: true,
    },
    category: {
      type: String,
      enum: ["health", "education", "emergency", "livelihood", "community", "other"],
      required: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    images: {
      type: [campaignImageSchema],
      default: [],
    },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "published",
        "rejected",
        "paused",
        "completed",
        "closed",
      ],
      default: "draft",
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "rejected"],
      default: "pending",
      required: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  { timestamps: true }
);

campaignSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
campaignSchema.index({ status: 1, category: 1, createdAt: -1 });
campaignSchema.index({ status: 1, location: 1, createdAt: -1 });
campaignSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Campaign", campaignSchema);
