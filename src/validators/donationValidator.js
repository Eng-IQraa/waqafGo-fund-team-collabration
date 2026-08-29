const mongoose = require("mongoose");
const fail = (res, message) => res.status(400).json({ success: false, message });

const validateCampaignId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid campaign ID");
  next();
};
const validateDonationCreate = (req, res, next) => {
  const allowed = ["amount", "currency", "message", "isAnonymous"];
  const invalid = Object.keys(req.body || {}).find((field) => !allowed.includes(field));
  if (invalid) return fail(res, `Donation field '${invalid}' cannot be set through this endpoint`);
  const { amount, currency, message, isAnonymous } = req.body;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0.01) return fail(res, "Amount must be a positive number of at least 0.01");
  if (!["USD", "SOS"].includes(currency)) return fail(res, "Currency must be USD or SOS");
  if (message !== undefined && message !== null && (typeof message !== "string" || message.trim().length > 500)) return fail(res, "Message must be at most 500 characters");
  if (isAnonymous !== undefined && typeof isAnonymous !== "boolean") return fail(res, "isAnonymous must be a boolean");
  next();
};
const validateDonationId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, "Invalid donation ID");
  next();
};
module.exports = { validateCampaignId, validateDonationCreate, validateDonationId };
