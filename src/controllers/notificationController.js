const mongoose = require("mongoose");
const Notification = require("../models/Notification");

const sendError = (res, status, message) => res.status(status).json({ success: false, message });

const getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const filter = { userId: req.user._id };
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
    ]);
    return res.status(200).json({ success: true, notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Get notifications error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid notification ID");
    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: { read: true } }, { new: true });
    if (!notification) return sendError(res, 404, "Notification not found");
    return res.status(200).json({ success: true, message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    return res.status(200).json({ success: true, message: "Notifications marked as read", modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

module.exports = { getMyNotifications, markNotificationRead, markAllNotificationsRead };
