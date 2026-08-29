const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} = require("../utils/tokenUtils");

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();

    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const existingPhone = await User.findOne({
      phone: normalizedPhone,
    });

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: "Phone number is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Password is select:false, so explicitly include it
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate access token
    const accessToken = generateAccessToken(user);

    // Generate refresh token
    const refreshToken = generateRefreshToken();

    // Hash refresh token before storing it
    const refreshTokenHash = hashRefreshToken(refreshToken);

    // Store refresh token in database
    await RefreshToken.create({
      userId: user._id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// GET CURRENT USER
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      isEmailVerified: req.user.isEmailVerified,
      isPhoneVerified: req.user.isPhoneVerified,
      isActive: req.user.isActive,
      profileImage: req.user.profileImage,
      address: req.user.address,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    },
  });
};

// UPDATE PROFILE
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, profileImage } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) {
      user.name = name.trim();
    }

    if (phone !== undefined) {
      const normalizedPhone = phone.trim();

      const existingPhone = await User.findOne({
        phone: normalizedPhone,
        _id: { $ne: user._id },
      });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "Phone number is already registered",
        });
      }

      user.phone = normalizedPhone;
    }

    if (address !== undefined) {
      user.address = address;
    }

    if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isActive: user.isActive,
        profileImage: user.profileImage,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const assignModeratorRole = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.isActive) {
      return res.status(400).json({ success: false, message: "Cannot assign a role to an inactive user" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ success: false, message: "Administrator roles cannot be changed through this endpoint" });
    }

    user.role = "moderator";
    user.roleAssignedBy = req.user._id;
    user.roleAssignedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Moderator role assigned successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleAssignedBy: user.roleAssignedBy,
        roleAssignedAt: user.roleAssignedAt,
      },
    });
  } catch (error) {
    console.error("Role assignment error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// LOGOUT: revoke only the submitted refresh token belonging to this user.
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (typeof refreshToken !== "string" || !refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token is required" });
    }

    await RefreshToken.updateOne(
      {
        userId: req.user._id,
        tokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      { $set: { revokedAt: new Date() } }
    );

    // The response is intentionally generic so token state is not exposed.
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Preserve fundraising/audit records by deactivating rather than hard-deleting.
const deleteProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isActive = false;
    await user.save();
    await RefreshToken.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Delete profile error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  assignModeratorRole,
  logout,
  deleteProfile,
};
