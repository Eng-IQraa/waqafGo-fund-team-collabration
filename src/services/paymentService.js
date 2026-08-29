const crypto = require("crypto");

const manualProvider = {
  name: "manualProvider",
  async createPaymentIntent({ donationId, amount, currency }) {
    return { provider: this.name, providerTransactionId: `manual_${crypto.randomUUID()}`, donationId: String(donationId), amount, currency, status: "pending" };
  },
  async confirmPayment(payload) { return { ...payload, status: "confirmed" }; },
  async handleWebhook(payload, signature) {
    const secret = process.env.MANUAL_PROVIDER_WEBHOOK_SECRET;
    if (!secret) throw new Error("Manual provider webhook secret is not configured");
    if (typeof signature !== "string" || !signature) return { verified: false };
    const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    const supplied = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    const expectedBuffer = Buffer.from(expected, "utf8");
    const suppliedBuffer = Buffer.from(supplied, "utf8");
    return { verified: expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer), event: payload };
  },
  async refund({ providerTransactionId, amount, currency }) { return { provider: this.name, providerTransactionId, amount, currency, status: "refunded" }; },
};

const providers = { manualProvider };
const getProvider = (name) => providers[name];
const call = (provider, method, data, signature) => {
  const adapter = getProvider(provider || "manualProvider");
  return adapter ? adapter[method](data, signature) : undefined;
};

module.exports = {
  createPaymentIntent: (provider, data) => call(provider, "createPaymentIntent", data),
  confirmPayment: (provider, data) => call(provider, "confirmPayment", data),
  handleWebhook: (provider, payload, signature) => call(provider, "handleWebhook", payload, signature),
  refund: (provider, data) => call(provider, "refund", data),
  getProvider,
};
