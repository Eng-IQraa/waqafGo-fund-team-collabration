const isOwnedBy = (resource, userId, ownerField = "ownerId") => {
  if (!resource || !resource[ownerField] || !userId) return false;
  return String(resource[ownerField]) === String(userId);
};

// Requires an upstream loader to set the resource, e.g. req.campaign.
const requireResourceOwnership = (resourceKey, ownerField = "ownerId") => (req, res, next) => {
  if (!req[resourceKey]) {
    return res.status(500).json({
      success: false,
      message: `Ownership check requires req.${resourceKey}`,
    });
  }

  if (!isOwnedBy(req[resourceKey], req.user?._id, ownerField)) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource",
    });
  }

  next();
};

module.exports = { isOwnedBy, requireResourceOwnership };
