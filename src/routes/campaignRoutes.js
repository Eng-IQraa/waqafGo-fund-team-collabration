const express = require("express");
const {
  createCampaign, getCampaigns, getCampaign, getMyCampaigns, updateCampaign,
  deactivateCampaign, submitCampaign, reviewCampaign, approveCampaign,
  rejectCampaign, publishCampaign, pauseCampaign, resumeCampaign,
} = require("../controllers/campaignController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { validateCampaignCreate, validateCampaignUpdate, validateReviewDecision, validateRejection } = require("../validators/campaignValidator");

const router = express.Router();

router.post("/", protect, authorize("beneficiary", "organization"), validateCampaignCreate, createCampaign);
router.get("/", getCampaigns);
router.get("/my", protect, getMyCampaigns);
router.get("/:id", getCampaign);
router.put("/:id", protect, validateCampaignUpdate, updateCampaign);
router.delete("/:id", protect, deactivateCampaign);
router.patch("/:id/submit", protect, submitCampaign);
router.patch("/:id/review", protect, authorize("moderator", "admin"), validateReviewDecision, reviewCampaign);
router.patch("/:id/approve", protect, authorize("admin"), validateReviewDecision, approveCampaign);
router.patch("/:id/reject", protect, authorize("admin"), validateRejection, rejectCampaign);
router.patch("/:id/publish", protect, authorize("admin"), validateReviewDecision, publishCampaign);
router.patch("/:id/pause", protect, pauseCampaign);
router.patch("/:id/resume", protect, resumeCampaign);

module.exports = router;
