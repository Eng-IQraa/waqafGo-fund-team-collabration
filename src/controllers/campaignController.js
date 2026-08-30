const Campaign = require("../models/Campaign");
const mongoose = require("mongoose");

const getCampaigns = async (req, res) => {
  try {
    const { status, category, location, q } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    if (q) {
      filter.$text = { $search: q };
    }

    const campaigns = await Campaign.find(filter)
      .populate("ownerId", "name email role")
      .populate("beneficiaryId", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      campaigns,
    });
  } catch (error) {
    console.error("Get campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const { campaignId } = req.params;

    if (!mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID",
      });
    }

    const campaign = await Campaign.findById(campaignId)
      .populate("ownerId", "name email role")
      .populate("beneficiaryId", "name email role");

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    return res.status(200).json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Get campaign by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ ownerId: req.user._id })
      .populate("beneficiaryId", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: campaigns.length,
      campaigns,
    });
  } catch (error) {
    console.error("Get my campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const createCampaign = async (req, res) => {
  try {
    if (!req.user || !["organization", "beneficiary"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only organizations and beneficiaries can create campaigns",
      });
    }

    const payload = { ...req.body };

    if (payload.beneficiaryId && String(payload.beneficiaryId) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Campaign owner cannot also be the beneficiary",
      });
    }

    const campaign = await Campaign.create({
      ...payload,
      ownerId: req.user._id,
      currentAmount: payload.currentAmount ?? 0,
      status: payload.status ?? "draft",
      verificationStatus: payload.verificationStatus ?? "pending",
      rejectionReason: payload.rejectionReason ?? null,
    });

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
    });
  } catch (error) {
    console.error("Create campaign error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A campaign with the same information already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateCampaign = async (req, res) => {
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

    if (String(campaign.ownerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this campaign",
      });
    }

    const payload = { ...req.body };

    if (payload.beneficiaryId && String(payload.beneficiaryId) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Campaign owner cannot also be the beneficiary",
      });
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] !== undefined) {
        campaign[key] = payload[key];
      }
    });

    await campaign.save();

    return res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (error) {
    console.error("Update campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteCampaign = async (req, res) => {
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

    if (String(campaign.ownerId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this campaign",
      });
    }

    await Campaign.findByIdAndDelete(campaignId);

    return res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
      campaignId,
    });
  } catch (error) {
    console.error("Delete campaign error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateCampaignStatus = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status, verificationStatus, rejectionReason } = req.body;

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

    if (status !== undefined) {
      campaign.status = status;
    }

    if (verificationStatus !== undefined) {
      campaign.verificationStatus = verificationStatus;
    }

    if (rejectionReason !== undefined) {
      campaign.rejectionReason = rejectionReason;
    }

    await campaign.save();

    return res.status(200).json({
      success: true,
      message: "Campaign status updated successfully",
      campaign,
    });
  } catch (error) {
    console.error("Update campaign status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getCampaigns,
  getCampaignById,
  getMyCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  updateCampaignStatus,
};
