const Notification = require("../models/Notification");

const sendEmail = async (userId, type, payload) => console.log("Email notification stub", { userId: String(userId), type, payload });
const sendSms = async (userId, type, payload) => console.log("SMS notification stub", { userId: String(userId), type, payload });

const notify = async (userId, type, payload = {}, channels = ["in_app"]) => {
  const requested = new Set(channels);
  const notification = await Notification.create({ userId, type, payload, channel: "in_app" });
  if (requested.has("email")) await sendEmail(userId, type, payload);
  if (requested.has("sms")) await sendSms(userId, type, payload);
  return notification;
};

module.exports = { notify, sendEmail, sendSms };
