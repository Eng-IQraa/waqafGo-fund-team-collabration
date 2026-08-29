const mongoose = require("mongoose");

const CURRENCIES = ["USD", "SOS"];
const CATEGORIES = ["health", "education", "emergency", "livelihood", "community", "other"];
const OWNER_MANAGED_FIELDS = ["title", "description", "targetAmount", "currency", "category", "location", "beneficiaryId", "images"];

const fail = (res, message) => res.status(400).json({ success: false, message });

const validateImages = (images, res) => {
  if (!Array.isArray(images)) return fail(res, "Images must be an array");
  if (images.length > 10) return fail(res, "A campaign can have at most 10 images");

  for (const image of images) {
    if (!image || typeof image !== "object" || Array.isArray(image) || typeof image.url !== "string" || !image.url.trim() || image.url.length > 2048) {
      return fail(res, "Each image must include a valid URL");
    }
    try {
      const url = new URL(image.url);
      if (!["http:", "https:"].includes(url.protocol)) return fail(res, "Image URLs must use HTTP or HTTPS");
    } catch (_) {
      return fail(res, "Each image must include a valid URL");
    }
    if (image.alt !== undefined && image.alt !== null && (typeof image.alt !== "string" || image.alt.length > 200)) {
      return fail(res, "Image alt text must be at most 200 characters");
    }
  }
  return null;
};

const validateCampaignFields = (req, res, next, isCreate) => {
  const fields = Object.keys(req.body || {});
  const invalidField = fields.find((field) => !OWNER_MANAGED_FIELDS.includes(field));
  if (invalidField) return fail(res, `Campaign field '${invalidField}' cannot be set through this endpoint`);
  if (!isCreate && fields.length === 0) return fail(res, "Provide at least one campaign field to update");

  const required = ["title", "description", "targetAmount", "currency", "category"];
  if (isCreate && required.some((field) => req.body[field] === undefined)) {
    return fail(res, "Title, description, targetAmount, currency and category are required");
  }
  if (req.body.title !== undefined && (typeof req.body.title !== "string" || req.body.title.trim().length < 5 || req.body.title.trim().length > 140)) return fail(res, "Title must be between 5 and 140 characters");
  if (req.body.description !== undefined && (typeof req.body.description !== "string" || req.body.description.trim().length < 20 || req.body.description.trim().length > 10000)) return fail(res, "Description must be between 20 and 10000 characters");
  if (req.body.targetAmount !== undefined && (typeof req.body.targetAmount !== "number" || !Number.isFinite(req.body.targetAmount) || req.body.targetAmount < 0.01)) return fail(res, "Target amount must be a number greater than zero");
  if (req.body.currency !== undefined && !CURRENCIES.includes(req.body.currency)) return fail(res, "Currency must be USD or SOS");
  if (req.body.category !== undefined && !CATEGORIES.includes(req.body.category)) return fail(res, "Invalid campaign category");
  if (req.body.location !== undefined && req.body.location !== null && (typeof req.body.location !== "string" || req.body.location.trim().length > 120)) return fail(res, "Location must be at most 120 characters");
  if (req.body.beneficiaryId !== undefined && req.body.beneficiaryId !== null && !mongoose.isValidObjectId(req.body.beneficiaryId)) return fail(res, "Invalid beneficiary ID");
  if (req.body.images !== undefined) {
    const imageError = validateImages(req.body.images, res);
    if (imageError) return imageError;
  }
  next();
};

const validateCampaignCreate = (req, res, next) => validateCampaignFields(req, res, next, true);
const validateCampaignUpdate = (req, res, next) => validateCampaignFields(req, res, next, false);

const validateReviewDecision = (req, res, next) => {
  if (Object.keys(req.body || {}).length !== 0) return fail(res, "Review does not accept request fields");
  next();
};

const validateRejection = (req, res, next) => {
  const fields = Object.keys(req.body || {});
  if (fields.some((field) => field !== "rejectionReason")) return fail(res, "Only rejectionReason may be provided");
  if (typeof req.body.rejectionReason !== "string" || !req.body.rejectionReason.trim() || req.body.rejectionReason.trim().length > 1000) return fail(res, "A rejection reason between 1 and 1000 characters is required");
  next();
};

module.exports = { validateCampaignCreate, validateCampaignUpdate, validateReviewDecision, validateRejection };
