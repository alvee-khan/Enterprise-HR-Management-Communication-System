import prisma from '../config/prisma.js';
import { createNotification } from '../utils/notificationHelper.js';

export const getReviews = async (req, res, next) => {
  try {
    const where = { companyId: req.user.companyId };
    const { employeeId, period, status } = req.query;

    if (req.user.role === 'employee') {
      const emp = await prisma.employee.findFirst({ where: { user: { id: req.user.id } } });
      if (emp) where.employeeId = emp.id;
    } else if (employeeId) {
      where.employeeId = Number(employeeId);
    }

    if (period) where.period = period;
    if (status) where.status = status;

    const reviews = await prisma.review.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, profileImage: true, departmentId: true, designation: true } },
        reviewer: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: reviews });
  } catch (error) { next(error); }
};

export const createReview = async (req, res, next) => {
  try {
    const criteria = req.body.criteria || [];
    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    const weightedScore = criteria.reduce((sum, c) => sum + ((c.score || 0) * (c.weight || 0)), 0);
    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    const ratingMap = [
      [8, 'Excellent'], [6, 'Good'], [4, 'Average'], [2, 'BelowAverage'], [0, 'Poor']
    ];
    const rating = ratingMap.find(([min]) => overallScore >= min)?.[1] || 'Poor';

    const { employeeId, ...rest } = req.body;

    const review = await prisma.review.create({
      data: {
        ...rest,
        employeeId: Number(employeeId),
        companyId: req.user.companyId,
        reviewerId: req.user.id,
        overallScore: parseFloat(overallScore.toFixed(2)),
        rating,
        criteria,
        strengths: req.body.strengths || [],
        improvements: req.body.improvements || [],
        goals: req.body.goals || []
      }
    });

    // Notify employee
    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId) },
      include: { user: { select: { id: true } } }
    });
    if (employee?.user?.id) {
      await createNotification({
        userId: employee.user.id,
        companyId: req.user.companyId,
        type: 'review_submitted',
        title: 'Performance Review Submitted',
        message: `Your performance review for ${req.body.period} has been submitted`,
        link: `/performance/${review.id}`
      });
    }

    res.status(201).json({ success: true, data: review });
  } catch (error) { next(error); }
};

export const updateReview = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    delete updateData.companyId;
    if (updateData.employeeId) updateData.employeeId = Number(updateData.employeeId);

    const review = await prisma.review.update({
      where: { id: Number(req.params.id) },
      data: updateData
    });
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Review not found' });
    next(error);
  }
};

export const acknowledgeReview = async (req, res, next) => {
  try {
    const emp = await prisma.employee.findFirst({ where: { user: { id: req.user.id } } });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

    const review = await prisma.review.update({
      where: { id: Number(req.params.id), employeeId: emp.id },
      data: { employeeAcknowledged: true, acknowledgedAt: new Date(), status: 'Acknowledged' }
    });

    res.status(200).json({ success: true, message: 'Review acknowledged', data: review });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Review not found' });
    next(error);
  }
};
