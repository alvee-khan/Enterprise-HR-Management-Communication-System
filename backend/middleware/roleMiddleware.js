/**
 * CSE447 Security and Cryptography
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Hierarchy:
 * superAdmin > companyAdmin > hrManager > manager > employee
 */

const ROLE_HIERARCHY = {
  superAdmin: 5,
  companyAdmin: 4,
  hrManager: 3,
  manager: 2,
  employee: 1
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Normalize roles
    const userRole = req.user.role;
    const normalizedAllowed = allowedRoles.map(r => {
      if (r === 'SUPER_ADMIN') return 'superAdmin';
      if (r === 'COMPANY_ADMIN') return 'companyAdmin';
      if (r === 'HR_MANAGER') return 'hrManager';
      if (r === 'TEAM_MANAGER') return 'manager';
      if (r === 'EMPLOYEE') return 'employee';
      return r;
    });

    if (userRole === 'superAdmin' || normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Role '${userRole}' does not have sufficient privileges.`
    });
  };
};

export const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel >= requiredLevel) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Minimum role required: ${minRole}`
    });
  };
};
