const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC USER INFORMATION
    // =========================
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 150,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 20,
    },

    // =========================
    // PASSWORD
    // =========================
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    // =========================
    // ROLE / RBAC
    // =========================
    role: {
      type: String,
      enum: [
        "donor",
        "beneficiary",
        "organization",
        "moderator",
        "admin",
      ],
      required: true,
    },

    // =========================
    // ACCOUNT VERIFICATION
    // =========================
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // =========================
    // ACCOUNT STATUS
    // =========================
    isActive: {
      type: Boolean,
      default: true,
    },

    // =========================
    // PROFILE
    // =========================
    profileImage: {
      type: String,
      default: null,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    // =========================
    // SECURITY
    // =========================
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    // =========================
    // ROLE MANAGEMENT
    // =========================
    roleAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    roleAssignedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// INDEXES
// =========================

userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model("User", userSchema);
