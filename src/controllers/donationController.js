const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const Donation = require("../models/Donation");
const PaymentTransaction = require("../models/PaymentTransaction");
const paymentService = require("../services/paymentService");
const { notify } = require("../services/notificationService");

const sendError = (res, status, message) => res.status(status).json({ success: false, message });
const publicDonation = (donation) => {
  const value = donation.toObject ? donation.toObject() : { ...donation };
  delete value.paymentTransactionId;
  if (value.isAnonymous) delete value.donorId;
  return value;
};

const createDonation = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || campaign.status !== "published") return sendError(res, 404, "Campaign not found");
    if (campaign.currency !== req.body.currency) return sendError(res, 400, "Donation currency must match the campaign currency");
    const donation = await Donation.create({
      campaignId: campaign._id,
      donorId: req.user ? req.user._id : null,
      amount: req.body.amount,
      currency: req.body.currency,
      isAnonymous: req.body.isAnonymous || false,
      message: req.body.message ? req.body.message.trim() : null,
    });
    const paymentIntent = await paymentService.createPaymentIntent("manualProvider", { donationId: donation._id, amount: donation.amount, currency: donation.currency });
    return res.status(201).json({ success: true, message: "Donation created; await payment confirmation", donation: publicDonation(donation), paymentIntent });
  } catch (error) {
    console.error("Create donation error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const processWebhook = async (req, res) => {
  try {
    const provider = req.params.provider;
    if (!paymentService.getProvider(provider)) return sendError(res, 404, "Unsupported payment provider");
    const signature = req.headers["x-payment-signature"];
    let verification;
    try {
      verification = await paymentService.handleWebhook(provider, req.body, signature);
    } catch (error) {
      console.error("Webhook configuration error:", error);
      return sendError(res, 503, "Payment webhook is not configured");
    }
    if (!verification?.verified) return sendError(res, 401, "Invalid payment signature");
    const { donationId, providerTransactionId, amount, currency, status } = verification.event || {};
    if (!mongoose.isValidObjectId(donationId) || typeof providerTransactionId !== "string" || !providerTransactionId || status !== "confirmed") return sendError(res, 400, "Invalid confirmation payload");

    const existing = await PaymentTransaction.findOne({ providerTransactionId });
    if (existing) {
      if (String(existing.relatedDonationId) !== String(donationId)) return sendError(res, 409, "Payment transaction is already linked to another donation");
      return res.status(200).json({ success: true, message: "Payment confirmation already processed", idempotent: true });
    }
    const donation = await Donation.findById(donationId);
    if (!donation) return sendError(res, 404, "Donation not found");
    if (donation.status !== "pending") return sendError(res, 409, "Donation cannot be confirmed in its current state");
    if (amount !== donation.amount || currency !== donation.currency) return sendError(res, 400, "Payment confirmation does not match the donation");

    let transaction;
    try {
      transaction = await PaymentTransaction.create({ provider, providerTransactionId, amount: donation.amount, currency: donation.currency, status: "confirmed", relatedDonationId: donation._id, rawPayload: req.body });
    } catch (error) {
      if (error?.code === 11000) return res.status(200).json({ success: true, message: "Payment confirmation already processed", idempotent: true });
      throw error;
    }
    const confirmedDonation = await Donation.findOneAndUpdate({ _id: donation._id, status: "pending" }, { $set: { status: "confirmed", paymentTransactionId: transaction._id } }, { new: true });
    if (!confirmedDonation) return sendError(res, 409, "Donation confirmation was already processed");

    // This is the sole application path that increments Campaign.currentAmount.
    const campaign = await Campaign.findByIdAndUpdate(confirmedDonation.campaignId, { $inc: { currentAmount: confirmedDonation.amount } }, { new: true });
    if (campaign) {
      const payload = { campaignId: campaign._id, donationId: confirmedDonation._id, amount: confirmedDonation.amount, currency: confirmedDonation.currency };
      await notify(campaign.ownerId, "new_donation", payload).catch((error) => console.error("Donation notification error:", error));
      if (campaign.currentAmount >= campaign.targetAmount && campaign.currentAmount - confirmedDonation.amount < campaign.targetAmount) {
        await notify(campaign.ownerId, "goal_reached", { campaignId: campaign._id, targetAmount: campaign.targetAmount, currency: campaign.currency }).catch((error) => console.error("Goal notification error:", error));
      }
    }
    return res.status(200).json({ success: true, message: "Donation confirmed successfully", donation: publicDonation(confirmedDonation) });
  } catch (error) {
    console.error("Process payment webhook error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const getCampaignDonations = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).select("_id status");
    if (!campaign || campaign.status !== "published") return sendError(res, 404, "Campaign not found");
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const filter = { campaignId: campaign._id, status: "confirmed" };
    const [donations, total] = await Promise.all([Donation.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Donation.countDocuments(filter)]);
    return res.status(200).json({ success: true, donations: donations.map(publicDonation), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Get campaign donations error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const getMyDonations = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const filter = { donorId: req.user._id };
    const [donations, total] = await Promise.all([Donation.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Donation.countDocuments(filter)]);
    return res.status(200).json({ success: true, donations, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Get my donations error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const getDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return sendError(res, 404, "Donation not found");
    if (req.user.role !== "admin" && String(donation.donorId) !== String(req.user._id)) return sendError(res, 403, "You do not have permission to access this donation");
    return res.status(200).json({ success: true, donation });
  } catch (error) {
    console.error("Get donation error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

module.exports = { createDonation, processWebhook, getCampaignDonations, getMyDonations, getDonation };
