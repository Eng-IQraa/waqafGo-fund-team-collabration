const express = require("express");
const { protect, optionalProtect } = require("../middleware/authMiddleware");
const { createDonation, processWebhook, getCampaignDonations, getMyDonations, getDonation } = require("../controllers/donationController");
const { validateCampaignId, validateDonationCreate, validateDonationId } = require("../validators/donationValidator");

const router = express.Router();

router.post("/campaigns/:id/donate", optionalProtect, validateCampaignId, validateDonationCreate, createDonation);
router.get("/campaigns/:id/donations", validateCampaignId, getCampaignDonations);
router.get("/donations/my", protect, getMyDonations);
router.get("/donations/:id", protect, validateDonationId, getDonation);
router.post("/payments/webhook/:provider", processWebhook);

module.exports = router;
