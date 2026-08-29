const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const { isOwnedBy } = require("../middleware/ownershipMiddleware");
const { notify } = require("../services/notificationService");

const ADMIN_ROLES = ["admin"];
const REVIEWER_ROLES = ["moderator", "admin"];
const OWNER_UPDATE_STATUSES = ["draft", "rejected"];

const sendError = (res, status, message) => res.status(status).json({ success: false, message });
const validId = (id) => mongoose.isValidObjectId(id);
const canReview = (user) => REVIEWER_ROLES.includes(user.role);
const isAdmin = (user) => ADMIN_ROLES.includes(user.role);

const campaignView = (campaign, privileged = false) => {
  const value = campaign.toObject ? campaign.toObject() : campaign;
  delete value.__v;
  if (!privileged) {
    delete value.ownerId;
    delete value.beneficiaryId;
    delete value.verificationStatus;
    delete value.rejectionReason;
  }
  return value;
};

const findCampaign = async (id, res) => {
  if (!validId(id)) {
    sendError(res, 400, "Invalid campaign ID");
    return null;
  }
  const campaign = await Campaign.findById(id);
  if (!campaign) sendError(res, 404, "Campaign not found");
  return campaign;
};

const createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create({ ...req.body, ownerId: req.user._id });
    return res.status(201).json({ success: true, message: "Campaign created successfully", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Create campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const getCampaigns = async (req, res) => {
  try {
    const query = { status: "published" };
    if (req.query.category) query.category = req.query.category;
    if (req.query.location) query.location = new RegExp(`^${String(req.query.location).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (req.query.search) query.$text = { $search: String(req.query.search).slice(0, 200) };
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const [campaigns, total] = await Promise.all([
      Campaign.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Campaign.countDocuments(query),
    ]);
    return res.status(200).json({ success: true, campaigns: campaigns.map((campaign) => campaignView(campaign)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Get campaigns error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const getCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    const privileged = req.user && (isOwnedBy(campaign, req.user._id) || canReview(req.user));
    if (campaign.status !== "published" && !privileged) return sendError(res, 404, "Campaign not found");
    return res.status(200).json({ success: true, campaign: campaignView(campaign, privileged) });
  } catch (error) {
    console.error("Get campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const getMyCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, campaigns: campaigns.map((campaign) => campaignView(campaign, true)) });
  } catch (error) {
    console.error("Get my campaigns error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const updateCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    if (!isOwnedBy(campaign, req.user._id)) return sendError(res, 403, "You do not have permission to modify this campaign");
    if (!OWNER_UPDATE_STATUSES.includes(campaign.status)) return sendError(res, 409, "Only draft or rejected campaigns can be edited");
    if (req.body.targetAmount !== undefined && req.body.targetAmount < campaign.currentAmount) {
      return sendError(res, 400, "Target amount cannot be less than the current amount");
    }
    Object.assign(campaign, req.body);
    await campaign.save();
    return res.status(200).json({ success: true, message: "Campaign updated successfully", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Update campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const deactivateCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    if (!isOwnedBy(campaign, req.user._id)) return sendError(res, 403, "You do not have permission to deactivate this campaign");
    if (["closed", "completed"].includes(campaign.status)) return sendError(res, 409, "This campaign cannot be deactivated");
    campaign.status = "closed";
    await campaign.save();
    return res.status(200).json({ success: true, message: "Campaign deactivated successfully", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Deactivate campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const submitCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    if (!isOwnedBy(campaign, req.user._id)) return sendError(res, 403, "You do not have permission to submit this campaign");
    if (!["draft", "rejected"].includes(campaign.status)) return sendError(res, 409, "Only draft or rejected campaigns can be submitted");
    campaign.status = "submitted";
    campaign.verificationStatus = "pending";
    campaign.rejectionReason = null;
    await campaign.save();
    return res.status(200).json({ success: true, message: "Campaign submitted for review", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Submit campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const reviewCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    if (campaign.status !== "submitted") return sendError(res, 409, "Only submitted campaigns can enter review");
    campaign.status = "under_review";
    campaign.verificationStatus = "under_review";
    await campaign.save();
    return res.status(200).json({ success: true, message: "Campaign is under review", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Review campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const approveCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    if (campaign.status !== "under_review") return sendError(res, 409, "Only campaigns under review can be approved");
    campaign.status = "approved";
    campaign.verificationStatus = "verified";
    campaign.rejectionReason = null;
    await campaign.save();
    await notify(campaign.ownerId, "campaign_approved", { campaignId: campaign._id, title: campaign.title }).catch((error) => console.error("Campaign notification error:", error));
    return res.status(200).json({ success: true, message: "Campaign approved successfully", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Approve campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const rejectCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    if (campaign.status !== "under_review") return sendError(res, 409, "Only campaigns under review can be rejected");
    campaign.status = "rejected";
    campaign.verificationStatus = "rejected";
    campaign.rejectionReason = req.body.rejectionReason.trim();
    await campaign.save();
    await notify(campaign.ownerId, "campaign_rejected", { campaignId: campaign._id, title: campaign.title, reason: campaign.rejectionReason }).catch((error) => console.error("Campaign notification error:", error));
    return res.status(200).json({ success: true, message: "Campaign rejected", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Reject campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const publishCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    if (campaign.status !== "approved") return sendError(res, 409, "Only approved campaigns can be published");
    campaign.status = "published";
    await campaign.save();
    await notify(campaign.ownerId, "campaign_published", { campaignId: campaign._id, title: campaign.title }).catch((error) => console.error("Campaign notification error:", error));
    return res.status(200).json({ success: true, message: "Campaign published successfully", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Publish campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const pauseCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    if (!isOwnedBy(campaign, req.user._id) && !isAdmin(req.user)) return sendError(res, 403, "You do not have permission to pause this campaign");
    if (campaign.status !== "published") return sendError(res, 409, "Only published campaigns can be paused");
    campaign.status = "paused";
    await campaign.save();
    return res.status(200).json({ success: true, message: "Campaign paused successfully", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Pause campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const resumeCampaign = async (req, res) => {
  try {
    const campaign = await findCampaign(req.params.id, res);
    if (!campaign) return;
    if (!isOwnedBy(campaign, req.user._id) && !isAdmin(req.user)) return sendError(res, 403, "You do not have permission to resume this campaign");
    if (campaign.status !== "paused") return sendError(res, 409, "Only paused campaigns can be resumed");
    campaign.status = "published";
    await campaign.save();
    return res.status(200).json({ success: true, message: "Campaign resumed successfully", campaign: campaignView(campaign, true) });
  } catch (error) {
    console.error("Resume campaign error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

module.exports = { createCampaign, getCampaigns, getCampaign, getMyCampaigns, updateCampaign, deactivateCampaign, submitCampaign, reviewCampaign, approveCampaign, rejectCampaign, publishCampaign, pauseCampaign, resumeCampaign };
