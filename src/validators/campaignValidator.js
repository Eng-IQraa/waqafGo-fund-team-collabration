const mongoose = require("mongoose");

const VALID_CATEGORIES = [
  "health",
  "education",
  "emergency",
  "livelihood",
  "community",
  "other",
];

const VALID_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "published",
  "rejected",
  "paused",
  "completed",
  "closed",
];

const VALID_VERIFICATION_STATUSES = [
  "pending",
  "under_review",
  "verified",
  "rejected",
];

const validateImageList = (images) => {
  if (!Array.isArray(images)) {
    return "Images must be an array";
  }

  for (const image of images) {
    if (!image || typeof image !== "object") {
      return "Each image must be an object";
    }

    if (typeof image.url !== "string" || !image.url.trim()) {
      return "Each image must include a valid url";
    }

    if (image.url.length > 2048) {
      return "Image URL must be at most 2048 characters";
    }

    if (image.alt !== undefined && image.alt !== null) {
      if (typeof image.alt !== "string" || image.alt.length > 200) {
        return "Image alt text must be a string with at most 200 characters";
      }
    }
  }

  return null;
};

const validateCreateCampaign = (req, res, next) => {
  const payload = req.body || {};
  const allowedFields = [
    "title",
    "description",
    "targetAmount",
    "currency",
    "category",
    "location",
    "images",
    "beneficiaryId",
    "status",
    "verificationStatus",
    "rejectionReason",
  ];

  const invalidField = Object.keys(payload).find((field) => !allowedFields.includes(field));

  if (invalidField) {
    return res.status(400).json({
      success: false,
      message: `Campaign field '${invalidField}' cannot be set during creation`,
    });
  }

  if (!payload.title || typeof payload.title !== "string" || payload.title.trim().length < 5 || payload.title.trim().length > 140) {
    return res.status(400).json({
      success: false,
      message: "Title must be between 5 and 140 characters",
    });
  }

  if (!payload.description || typeof payload.description !== "string" || payload.description.trim().length < 20 || payload.description.trim().length > 10000) {
    return res.status(400).json({
      success: false,
      message: "Description must be between 20 and 10000 characters",
    });
  }

  if (payload.targetAmount === undefined || Number(payload.targetAmount) <= 0 || !Number.isFinite(Number(payload.targetAmount))) {
    return res.status(400).json({
      success: false,
      message: "Target amount must be a positive number",
    });
  }

  if (payload.currency && !["USD", "SOS"].includes(payload.currency)) {
    return res.status(400).json({
      success: false,
      message: "Currency must be USD or SOS",
    });
  }

  if (!payload.category || !VALID_CATEGORIES.includes(payload.category)) {
    return res.status(400).json({
      success: false,
      message: "Category is required and must be valid",
    });
  }

  if (payload.location !== undefined && payload.location !== null) {
    if (typeof payload.location !== "string" || payload.location.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: "Location must be a string of at most 120 characters",
      });
    }
  }

  if (payload.images !== undefined) {
    const imageError = validateImageList(payload.images);
    if (imageError) {
      return res.status(400).json({
        success: false,
        message: imageError,
      });
    }
  }

  if (payload.beneficiaryId !== undefined && payload.beneficiaryId !== null && !mongoose.isValidObjectId(payload.beneficiaryId)) {
    return res.status(400).json({
      success: false,
      message: "Beneficiary ID must be a valid Mongo ObjectId",
    });
  }

  if (payload.status !== undefined && !VALID_STATUSES.includes(payload.status)) {
    return res.status(400).json({
      success: false,
      message: "Status is invalid",
    });
  }

  if (payload.verificationStatus !== undefined && !VALID_VERIFICATION_STATUSES.includes(payload.verificationStatus)) {
    return res.status(400).json({
      success: false,
      message: "Verification status is invalid",
    });
  }

  if (payload.rejectionReason !== undefined && payload.rejectionReason !== null) {
    if (typeof payload.rejectionReason !== "string" || payload.rejectionReason.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason must be a string of at most 1000 characters",
      });
    }
  }

  next();
};

const validateUpdateCampaign = (req, res, next) => {
  const payload = req.body || {};
  const allowedFields = [
    "title",
    "description",
    "targetAmount",
    "currency",
    "category",
    "location",
    "images",
    "beneficiaryId",
    "status",
    "verificationStatus",
    "rejectionReason",
  ];

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one campaign field to update",
    });
  }

  const invalidField = Object.keys(payload).find((field) => !allowedFields.includes(field));

  if (invalidField) {
    return res.status(400).json({
      success: false,
      message: `Campaign field '${invalidField}' cannot be updated`,
    });
  }

  if (payload.title !== undefined && (typeof payload.title !== "string" || payload.title.trim().length < 5 || payload.title.trim().length > 140)) {
    return res.status(400).json({
      success: false,
      message: "Title must be between 5 and 140 characters",
    });
  }

  if (payload.description !== undefined && (typeof payload.description !== "string" || payload.description.trim().length < 20 || payload.description.trim().length > 10000)) {
    return res.status(400).json({
      success: false,
      message: "Description must be between 20 and 10000 characters",
    });
  }

  if (payload.targetAmount !== undefined && (Number(payload.targetAmount) <= 0 || !Number.isFinite(Number(payload.targetAmount)))) {
    return res.status(400).json({
      success: false,
      message: "Target amount must be a positive number",
    });
  }

  if (payload.currency !== undefined && !["USD", "SOS"].includes(payload.currency)) {
    return res.status(400).json({
      success: false,
      message: "Currency must be USD or SOS",
    });
  }

  if (payload.category !== undefined && !VALID_CATEGORIES.includes(payload.category)) {
    return res.status(400).json({
      success: false,
      message: "Category is invalid",
    });
  }

  if (payload.location !== undefined && payload.location !== null && (typeof payload.location !== "string" || payload.location.trim().length > 120)) {
    return res.status(400).json({
      success: false,
      message: "Location must be a string of at most 120 characters",
    });
  }

  if (payload.images !== undefined) {
    const imageError = validateImageList(payload.images);
    if (imageError) {
      return res.status(400).json({
        success: false,
        message: imageError,
      });
    }
  }

  if (payload.beneficiaryId !== undefined && payload.beneficiaryId !== null && !mongoose.isValidObjectId(payload.beneficiaryId)) {
    return res.status(400).json({
      success: false,
      message: "Beneficiary ID must be a valid Mongo ObjectId",
    });
  }

  if (payload.status !== undefined && !VALID_STATUSES.includes(payload.status)) {
    return res.status(400).json({
      success: false,
      message: "Status is invalid",
    });
  }

  if (payload.verificationStatus !== undefined && !VALID_VERIFICATION_STATUSES.includes(payload.verificationStatus)) {
    return res.status(400).json({
      success: false,
      message: "Verification status is invalid",
    });
  }

  if (payload.rejectionReason !== undefined && payload.rejectionReason !== null && (typeof payload.rejectionReason !== "string" || payload.rejectionReason.trim().length > 1000)) {
    return res.status(400).json({
      success: false,
      message: "Rejection reason must be a string of at most 1000 characters",
    });
  }

  next();
};

module.exports = {
  validateCreateCampaign,
  validateUpdateCampaign,
  VALID_CATEGORIES,
  VALID_STATUSES,
  VALID_VERIFICATION_STATUSES,
};
