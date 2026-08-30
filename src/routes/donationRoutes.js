const express = require("express");
const {
  getDonationHistory,
  getCampaignDonations,
  donateToCampaign,
} = require("../controllers/donationController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", protect, authorize("donor"), getDonationHistory);
router.get("/campaign/:campaignId", protect, authorize("admin", "moderator", "organization"), getCampaignDonations);
router.post("/campaign/:campaignId", protect, authorize("donor"), donateToCampaign);

module.exports = router;
