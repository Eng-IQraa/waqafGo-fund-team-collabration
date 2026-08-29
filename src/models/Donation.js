const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    // Sparse indexing permits guest donations while retaining efficient donor history queries.
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: { sparse: true } },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, enum: ["USD", "SOS"] },
    isAnonymous: { type: Boolean, default: false },
    message: { type: String, trim: true, maxlength: 500, default: null },
    paymentTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentTransaction", default: null },
    status: { type: String, enum: ["pending", "confirmed", "failed", "refunded"], default: "pending", index: true },
  },
  { timestamps: true }
);

donationSchema.index({ campaignId: 1, status: 1, createdAt: -1 });
donationSchema.index({ donorId: 1, createdAt: -1 }, { sparse: true });

module.exports = mongoose.model("Donation", donationSchema);
