const validateRegister = (req, res, next) => {
  const { name, email, phone, password, role } = req.body;
  const publicRoles = ["donor", "beneficiary", "organization"];

  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "Name, email, phone, password and role are required",
    });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Name must be at least 2 characters",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
    });
  }

  if (!publicRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be donor, beneficiary, or organization",
    });
  }

  next();
};

const validateRoleAssignment = (req, res, next) => {
  if (req.body.role !== "moderator") {
    return res.status(400).json({
      success: false,
      message: "Only the moderator role can be assigned through this endpoint",
    });
  }

  next();
};

const validateProfileUpdate = (req, res, next) => {
  const allowedFields = ["name", "phone", "address", "profileImage"];
  const providedFields = Object.keys(req.body);
  const invalidField = providedFields.find((field) => !allowedFields.includes(field));

  if (invalidField) {
    return res.status(400).json({
      success: false,
      message: `Profile field '${invalidField}' cannot be updated`,
    });
  }

  if (providedFields.length === 0) {
    return res.status(400).json({ success: false, message: "Provide at least one profile field to update" });
  }

  if (req.body.name !== undefined && (typeof req.body.name !== "string" || req.body.name.trim().length < 2 || req.body.name.trim().length > 100)) {
    return res.status(400).json({ success: false, message: "Name must be between 2 and 100 characters" });
  }

  if (req.body.phone !== undefined && (typeof req.body.phone !== "string" || !req.body.phone.trim() || req.body.phone.trim().length > 20)) {
    return res.status(400).json({ success: false, message: "Phone number must be between 1 and 20 characters" });
  }

  if (req.body.address !== undefined && req.body.address !== null && (typeof req.body.address !== "string" || req.body.address.length > 200)) {
    return res.status(400).json({ success: false, message: "Address must be at most 200 characters" });
  }

  if (req.body.profileImage !== undefined && req.body.profileImage !== null && (typeof req.body.profileImage !== "string" || req.body.profileImage.length > 2048)) {
    return res.status(400).json({ success: false, message: "Profile image URL must be at most 2048 characters" });
  }

  next();
};

module.exports = { validateRegister, validateRoleAssignment, validateProfileUpdate };
