/* Safe development migration: it is read-only unless --apply is supplied. */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);

  const legacyUsers = await User.collection.find({ role: "organizer" }).toArray();
  console.log(`Found ${legacyUsers.length} legacy organizer user(s).`);
  if (!apply) {
    console.log("Dry run only. Review the count, then rerun with --apply to update organizer to organization.");
    return;
  }

  const result = await User.collection.updateMany(
    { role: "organizer" },
    { $set: { role: "organization", roleAssignedAt: new Date() } }
  );
  console.log(`Updated ${result.modifiedCount} user(s).`);
};

run()
  .catch((error) => { console.error("Migration failed:", error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
