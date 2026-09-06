// Role-based access control middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user belongs to the same company as the resource
export const sameCompany = (req, res, next) => {
  const resourceCompanyId = req.params.companyId || req.body.companyId;
  if (req.user.role === 'superAdmin') return next();
  if (resourceCompanyId && resourceCompanyId !== req.user.companyId?.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied: different company' });
  }
  next();
};

// Attach companyId from user if not superAdmin
export const attachCompany = (req, res, next) => {
  if (req.user.role !== 'superAdmin') {
    req.companyId = req.user.companyId;
  } else {
    req.companyId = req.query.companyId || req.body.companyId;
  }
  next();
};
