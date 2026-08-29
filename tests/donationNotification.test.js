const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../server");
const User = require("../src/models/User");
const Campaign = require("../src/models/Campaign");
const Donation = require("../src/models/Donation");
const PaymentTransaction = require("../src/models/PaymentTransaction");
const Notification = require("../src/models/Notification");
const { notify } = require("../src/services/notificationService");

process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.MANUAL_PROVIDER_WEBHOOK_SECRET = "test-webhook-secret";

const authHeader = (user) => ({ Authorization: `Bearer ${jwt.sign({ userId: String(user._id), role: user.role }, process.env.JWT_ACCESS_SECRET)}` });
const createUser = (suffix, role = "donor") => User.create({ name: `User ${suffix}`, email: `${suffix}@example.test`, phone: `+25261${String(suffix).replace(/\D/g, "").padStart(7, "0").slice(-7)}`, password: "password123", role });
const createCampaign = (ownerId) => Campaign.create({ title: "Campaign for donation tests", description: "A sufficiently detailed campaign description for integration tests.", ownerId, targetAmount: 100, currency: "USD", category: "community", status: "published" });
const signWebhook = (payload) => crypto.createHmac("sha256", process.env.MANUAL_PROVIDER_WEBHOOK_SECRET).update(JSON.stringify(payload)).digest("hex");

describe("Donation module", () => {
  test("creates a valid donation and ignores no client-supplied donor identity", async () => {
    const [owner, donor, suppliedDonor] = await Promise.all([createUser("1001", "organization"), createUser("1002"), createUser("1003")]);
    const campaign = await createCampaign(owner._id);
    const rejected = await request(app).post(`/api/campaigns/${campaign._id}/donate`).set(authHeader(donor)).send({ amount: 10, currency: "USD", donorId: suppliedDonor._id });
    expect(rejected.status).toBe(400);

    const response = await request(app).post(`/api/campaigns/${campaign._id}/donate`).set(authHeader(donor)).send({ amount: 10, currency: "USD", isAnonymous: false });
    expect(response.status).toBe(201);
    const donation = await Donation.findById(response.body.donation._id);
    expect(String(donation.donorId)).toBe(String(donor._id));
    expect(String(donation.donorId)).not.toBe(String(suppliedDonor._id));
  });

  test("rejects missing or invalid campaign IDs and non-positive amounts", async () => {
    const owner = await createUser("2001", "organization");
    const donor = await createUser("2002");
    const campaign = await createCampaign(owner._id);
    await expect(request(app).post("/api/campaigns/not-an-id/donate").send({ amount: 10, currency: "USD" })).resolves.toMatchObject({ status: 400 });
    for (const amount of [0, -1]) {
      const response = await request(app).post(`/api/campaigns/${campaign._id}/donate`).set(authHeader(donor)).send({ amount, currency: "USD" });
      expect(response.status).toBe(400);
    }
  });

  test("confirms a webhook once and handles duplicate provider transaction IDs idempotently", async () => {
    const owner = await createUser("3001", "organization");
    const donor = await createUser("3002");
    const campaign = await createCampaign(owner._id);
    const createResponse = await request(app).post(`/api/campaigns/${campaign._id}/donate`).set(authHeader(donor)).send({ amount: 25, currency: "USD" });
    const payload = { donationId: createResponse.body.donation._id, providerTransactionId: createResponse.body.paymentIntent.providerTransactionId, amount: 25, currency: "USD", status: "confirmed" };

    const first = await request(app).post("/api/payments/webhook/manualProvider").set("x-payment-signature", signWebhook(payload)).send(payload);
    expect(first.status).toBe(200);
    expect((await Donation.findById(payload.donationId)).status).toBe("confirmed");
    expect((await Campaign.findById(campaign._id)).currentAmount).toBe(25);

    const second = await request(app).post("/api/payments/webhook/manualProvider").set("x-payment-signature", signWebhook(payload)).send(payload);
    expect(second.status).toBe(200);
    expect(second.body.idempotent).toBe(true);
    expect((await Campaign.findById(campaign._id)).currentAmount).toBe(25);
    expect(await PaymentTransaction.countDocuments({ providerTransactionId: payload.providerTransactionId })).toBe(1);
  });

  test("prevents a different user from reading a donation receipt", async () => {
    const [owner, donor, otherUser] = await Promise.all([createUser("4001", "organization"), createUser("4002"), createUser("4003")]);
    const campaign = await createCampaign(owner._id);
    const donation = await Donation.create({ campaignId: campaign._id, donorId: donor._id, amount: 5, currency: "USD" });
    const response = await request(app).get(`/api/donations/${donation._id}`).set(authHeader(otherUser));
    expect(response.status).toBe(403);
  });
});

describe("Notification module", () => {
  test("notify creates an in-app notification", async () => {
    const user = await createUser("5001");
    const notification = await notify(user._id, "security_alert", { source: "test" });
    expect(notification.channel).toBe("in_app");
    expect(await Notification.countDocuments({ userId: user._id })).toBe(1);
  });

  test("lists only the authenticated user's notifications and marks only one as read", async () => {
    const [firstUser, secondUser] = await Promise.all([createUser("6001"), createUser("6002")]);
    const first = await notify(firstUser._id, "security_alert", { index: 1 });
    const second = await notify(firstUser._id, "payment_failed", { index: 2 });
    await notify(secondUser._id, "security_alert", { index: 3 });

    const list = await request(app).get("/api/notifications").set(authHeader(firstUser));
    expect(list.status).toBe(200);
    expect(list.body.notifications).toHaveLength(2);
    expect(list.body.notifications.every((notification) => String(notification.userId) === String(firstUser._id))).toBe(true);

    const mark = await request(app).patch(`/api/notifications/${first._id}/read`).set(authHeader(firstUser));
    expect(mark.status).toBe(200);
    expect((await Notification.findById(first._id)).read).toBe(true);
    expect((await Notification.findById(second._id)).read).toBe(false);
  });
});
