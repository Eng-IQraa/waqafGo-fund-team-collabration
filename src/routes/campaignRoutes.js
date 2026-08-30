const express = require("express");
const {
  getCampaigns,
  getCampaignById,
  getMyCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  updateCampaignStatus,
} = require("../controllers/campaignController");
const {
  validateCreateCampaign,
  validateUpdateCampaign,
} = require("../validators/campaignValidator");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getCampaigns);
router.get("/me", protect, getMyCampaigns);
router.get("/:campaignId", getCampaignById);

router.post("/", protect, validateCreateCampaign, createCampaign);
router.put("/:campaignId", protect, validateUpdateCampaign, updateCampaign);
router.delete("/:campaignId", protect, deleteCampaign);
router.patch(
  "/:campaignId/status",
  protect,
  authorize("admin", "moderator"),
  updateCampaignStatus
);

module.exports = router;
