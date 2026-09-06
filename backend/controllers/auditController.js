import prisma from '../config/prisma.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role !== 'superAdmin') where.companyId = req.user.companyId;

    const { entity, action, userId, startDate, endDate } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = Number(userId);
    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) { next(error); }
};
