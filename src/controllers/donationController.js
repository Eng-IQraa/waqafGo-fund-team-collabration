const mongoose = require("mongoose");
const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");

const getDonationHistory = async (req, res) => {
  try {
    const donations = await Donation.find({ donorId: req.user._id })
      .populate("campaignId", "title status ownerId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: donations.length,
      donations,
    });
  } catch (error) {
    console.error("Get donation history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getCampaignDonations = async (req, res) => {
  try {
    const { campaignId } = req.params;

    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID",
      });
    }

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const donations = await Donation.find({ campaignId })
      .populate("donorId", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: donations.length,
      donations,
    });
  } catch (error) {
    console.error("Get campaign donations error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const donateToCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { amount, currency, paymentMethod, message, transactionId } = req.body;

    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID",
      });
    }

    if (!req.user || req.user.role !== "donor") {
      return res.status(403).json({
        success: false,
        message: "Only donors can make donations",
      });
    }

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    if (campaign.status !== "published" && campaign.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "This campaign is not accepting donations right now",
      });
    }

    if (!amount || Number(amount) <= 0 || !Number.isFinite(Number(amount))) {
      return res.status(400).json({
        success: false,
        message: "Donation amount must be a positive number",
      });
    }

    if (currency && !["USD", "SOS"].includes(currency)) {
      return res.status(400).json({
        success: false,
        message: "Currency must be USD or SOS",
      });
    }

    if (paymentMethod && !["card", "bank", "wallet", "cash", "other"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Payment method is invalid",
      });
    }

    if (message !== undefined && message !== null && typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Message must be a string when provided",
      });
    }

    const donation = await Donation.create({
      donorId: req.user._id,
      campaignId,
      amount: Number(amount),
      currency: currency || campaign.currency,
      paymentMethod: paymentMethod || "card",
      message: message || null,
      transactionId: transactionId || null,
      status: "completed",
    });

    campaign.currentAmount = (Number(campaign.currentAmount) || 0) + Number(amount);
    await campaign.save();

    return res.status(201).json({
      success: true,
      message: "Donation recorded successfully",
      donation,
    });
  } catch (error) {
    console.error("Donate to campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getDonationHistory,
  getCampaignDonations,
  donateToCampaign,
};
