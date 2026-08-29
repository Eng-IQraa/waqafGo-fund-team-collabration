const express = require("express");

const {
  register,
  login,
  getMe,
  updateProfile,
  assignModeratorRole,
  logout,
  deleteProfile,
} = require("../controllers/authController");

const {
  validateRegister,
  validateRoleAssignment,
  validateProfileUpdate,
} = require("../validators/authValidator");


const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/register",
  validateRegister,
  register
);

router.get(
  "/me",
  protect,
  getMe
);

router.post(
  "/login",
  login
);

router.put(
  "/profile",
  protect,
  validateProfileUpdate,
  updateProfile
);

router.delete("/profile", protect, deleteProfile);

router.post("/logout", protect, logout);

router.patch(
  "/users/:userId/role",
  protect,
  authorize("admin"),
  validateRoleAssignment,
  assignModeratorRole
);

router.get(
  "/admin-test",
  protect,
  authorize("admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Admin access granted",
      user: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
      },
    });
  }
);
 
module.exports = router;
