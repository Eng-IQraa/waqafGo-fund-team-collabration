const mongoose = require("mongoose");

// This is an append-only payment ledger. Application code creates records only;
// corrections must be represented by a new reversal or adjustment record.
const paymentTransactionSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, trim: true, immutable: true },
    providerTransactionId: { type: String, required: true, trim: true, unique: true, immutable: true },
    amount: { type: Number, required: true, min: 0.01, immutable: true },
    currency: { type: String, required: true, enum: ["USD", "SOS"], immutable: true },
    status: { type: String, required: true, enum: ["confirmed", "refunded", "failed", "reversed"], immutable: true },
    relatedDonationId: { type: mongoose.Schema.Types.ObjectId, ref: "Donation", default: null, immutable: true },
    relatedWithdrawalId: { type: mongoose.Schema.Types.ObjectId, default: null, immutable: true },
    reversalOfTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentTransaction", default: null, immutable: true },
    rawPayload: { type: mongoose.Schema.Types.Mixed, default: null, immutable: true },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ relatedDonationId: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
