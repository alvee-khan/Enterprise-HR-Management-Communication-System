/**
 * CSE447 Security and Cryptography
 * Secure Leave Controller
 * 
 * Features:
 * - ECC Digital Signatures on Leave Approvals
 * - HMAC-SHA256 Integrity Verification
 * - Role-Based Access Control
 * - Immutable Cryptographic Audit Logging
 */

import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendLeaveApprovalEmail } from '../utils/email.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { generateMAC } from '../security/mac/generateMAC.js';
import { verifyMAC } from '../security/mac/verifyMAC.js';
import { signMessage } from '../security/ecc/digitalSignature.js';
import { getOrInitializeSystemECCKey } from '../security/encryption/encryptionService.js';
import { getUnwrappedPrivateKey } from '../security/keyManagement/keyStorage.js';
import moment from 'moment';

export const applyLeave = async (req, res, next) => {
  try {
    let employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { user: { id: req.user.id } },
          { email: req.user.email }
        ]
      },
      include: { department: true }
    });

    if (!employee) {
      let compId = req.user.companyId;
      if (!compId) {
        const adminComp = await prisma.company.findFirst({ where: { adminId: req.user.id } });
        compId = adminComp?.id;
      }
      if (compId) {
        const count = await prisma.employee.count({ where: { companyId: compId } });
        const employeeCode = `EMP-${String(count + 1).padStart(4, '0')}`;
        employee = await prisma.employee.create({
          data: {
            companyId: compId,
            employeeCode,
            name: req.user.name,
            email: req.user.email,
            joiningDate: new Date(),
            employmentType: 'FullTime',
            status: 'Active',
            leaveBalance: { sick: 12, casual: 12, annual: 18, emergency: 3 }
          }
        });
        try {
          await prisma.user.update({ where: { id: req.user.id }, data: { employeeProfileId: employee.id } });
        } catch {}
      }
    }

    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const { type, startDate, endDate, reason, isHalfDay, halfDayPeriod } = req.body;

    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');
    let totalDays = end.diff(start, 'days') + 1;
    if (isHalfDay) totalDays = 0.5;

    // Check leave balance
    const leaveBalance = employee.leaveBalance || {};
    const leaveTypeKey = type.toLowerCase().replace(' ', '');
    const balance = leaveBalance[leaveTypeKey] || 0;
    if (balance < totalDays) {
      return res.status(400).json({ success: false, message: `Insufficient ${type} leave balance (${balance} days remaining)` });
    }

    // Check for overlapping leaves
    const overlap = await prisma.leave.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['Pending', 'Approved'] },
        AND: [
          { startDate: { lte: new Date(endDate) } },
          { endDate: { gte: new Date(startDate) } }
        ]
      }
    });
    if (overlap) {
      return res.status(400).json({ success: false, message: 'Leave request overlaps with an existing request' });
    }

    // Compute HMAC integrity tag
    const payload = JSON.stringify({
      employeeId: employee.id,
      userId: req.user.id,
      companyId: req.user.companyId,
      type,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      totalDays
    });
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    const mac_value = generateMAC(hash);

    const leave = await prisma.leave.create({
      data: {
        employeeId: employee.id,
        userId: req.user.id,
        companyId: req.user.companyId,
        type, reason, totalDays, isHalfDay: isHalfDay || false,
        halfDayPeriod: halfDayPeriod || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        mac_value
      }
    });

    // Notify manager
    if (employee.managerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: employee.managerId },
        include: { user: { select: { id: true } } }
      });
      if (manager?.user?.id) {
        await createNotification({
          userId: manager.user.id,
          companyId: req.user.companyId,
          type: 'leave_applied',
          title: 'New Leave Request',
          message: `${employee.name} applied for ${type} leave (${totalDays} days)`,
          link: `/leaves`
        });
      }
    }

    res.status(201).json({ success: true, message: 'Leave applied successfully with MAC integrity tag', data: leave });
  } catch (error) {
    next(error);
  }
};

export const getLeaves = async (req, res, next) => {
  try {
    let companyId = req.user.companyId;
    if (!companyId) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      companyId = user?.companyId;
    }
    if (!companyId) {
      const adminComp = await prisma.company.findFirst({ where: { adminId: req.user.id } });
      companyId = adminComp?.id;
    }

    const { status, type, employeeId, startDate, endDate } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const where = {};
    if (companyId) where.companyId = companyId;

    if (req.user.role === 'employee') {
      where.userId = req.user.id;
    } else if (employeeId) {
      where.employeeId = Number(employeeId);
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (startDate && endDate) {
      where.startDate = { gte: new Date(startDate) };
      where.endDate = { lte: new Date(endDate) };
    }

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: {
          employee: { select: { name: true, employeeCode: true, profileImage: true, departmentId: true, designation: true } },
          approvedBy: { select: { name: true } },
          rejectedBy: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.leave.count({ where })
    ]);

    // Verify MAC and signatures
    const verifiedLeaves = leaves.map(l => {
      const payload = JSON.stringify({
        employeeId: l.employeeId,
        userId: l.userId,
        companyId: l.companyId,
        type: l.type,
        startDate: new Date(l.startDate).toISOString(),
        endDate: new Date(l.endDate).toISOString(),
        totalDays: l.totalDays
      });
      const hash = crypto.createHash('sha256').update(payload).digest('hex');
      const isIntegrityValid = l.mac_value ? verifyMAC(hash, l.mac_value) : true;

      return {
        ...l,
        _integrityVerified: isIntegrityValid,
        _isDigitallySigned: !!l.approval_signature
      };
    });

    res.status(200).json({
      success: true,
      data: verifiedLeaves,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

export const approveLeave = async (req, res, next) => {
  try {
    const leave = await prisma.leave.findUnique({
      where: { id: Number(req.params.id) },
      include: { employee: true }
    });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'Pending') return res.status(400).json({ success: false, message: 'Leave already processed' });

    const { action, comments } = req.body;
    const isApproved = action === 'approve';

    const updatedComments = comments
      ? [...(leave.comments || []), { userId: req.user.id, text: comments, createdAt: new Date() }]
      : leave.comments;

    // Generate ECC Digital Signature of Approval Action
    const approvalPayload = JSON.stringify({
      leaveId: leave.id,
      action: isApproved ? 'APPROVED' : 'REJECTED',
      decisionById: req.user.id,
      timestamp: new Date().toISOString()
    });
    const approvalHash = crypto.createHash('sha256').update(approvalPayload).digest('hex');

    const systemEccKey = await getOrInitializeSystemECCKey();
    const privKey = JSON.parse(getUnwrappedPrivateKey(systemEccKey));
    const approval_signature = signMessage(approvalHash, privKey);
    const mac_value = generateMAC(approvalHash);

    const updatedLeave = await prisma.leave.update({
      where: { id: leave.id },
      data: {
        status: isApproved ? 'Approved' : 'Rejected',
        approvedById: isApproved ? req.user.id : undefined,
        approvedAt: isApproved ? new Date() : undefined,
        rejectedById: !isApproved ? req.user.id : undefined,
        rejectedAt: !isApproved ? new Date() : undefined,
        comments: updatedComments,
        approval_signature,
        mac_value
      }
    });

    if (isApproved) {
      // Deduct leave balance
      const leaveTypeKey = leave.type.toLowerCase().replace(' ', '');
      const employee = await prisma.employee.findUnique({ where: { id: leave.employeeId } });
      const balance = employee.leaveBalance || {};
      balance[leaveTypeKey] = (balance[leaveTypeKey] || 0) - leave.totalDays;
      await prisma.employee.update({ where: { id: leave.employeeId }, data: { leaveBalance: balance } });

      // Mark attendance as On Leave
      let current = moment(leave.startDate);
      while (current <= moment(leave.endDate)) {
        await prisma.attendance.upsert({
          where: {
            companyId_employeeId_date: {
              companyId: req.user.companyId,
              employeeId: leave.employeeId,
              date: current.startOf('day').toDate()
            }
          },
          create: {
            employeeId: leave.employeeId,
            userId: leave.userId,
            companyId: req.user.companyId,
            date: current.startOf('day').toDate(),
            status: 'OnLeave'
          },
          update: { status: 'OnLeave' }
        });
        current.add(1, 'day');
      }
    }

    // Notify employee
    await createNotification({
      userId: leave.userId,
      companyId: req.user.companyId,
      type: isApproved ? 'leave_approved' : 'leave_rejected',
      title: `Leave ${isApproved ? 'Approved' : 'Rejected'}`,
      message: `Your ${leave.type} leave has been ${isApproved ? 'approved' : 'rejected'} with digital signature`,
      link: `/leaves`
    });

    await sendLeaveApprovalEmail(
      leave.employee.email, leave.employee.name,
      updatedLeave.status, leave.type,
      `${moment(leave.startDate).format('DD MMM')} - ${moment(leave.endDate).format('DD MMM YYYY')}`
    );

    await createAuditLog({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: isApproved ? 'APPROVE' : 'REJECT',
      entity: 'Leave',
      entityId: leave.id,
      description: `${isApproved ? 'Approved' : 'Rejected'} leave for ${leave.employee.name} with ECC signature`,
      req
    });

    res.status(200).json({ success: true, message: `Leave ${updatedLeave.status.toLowerCase()} with ECC digital signature`, data: updatedLeave });
  } catch (error) {
    next(error);
  }
};

export const cancelLeave = async (req, res, next) => {
  try {
    const leave = await prisma.leave.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id }
    });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (!['Pending', 'Approved'].includes(leave.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this leave' });
    }

    if (leave.status === 'Approved') {
      const leaveTypeKey = leave.type.toLowerCase().replace(' ', '');
      const employee = await prisma.employee.findUnique({ where: { id: leave.employeeId } });
      const balance = employee.leaveBalance || {};
      balance[leaveTypeKey] = (balance[leaveTypeKey] || 0) + leave.totalDays;
      await prisma.employee.update({ where: { id: leave.employeeId }, data: { leaveBalance: balance } });
    }

    const updated = await prisma.leave.update({ where: { id: leave.id }, data: { status: 'Cancelled' } });
    res.status(200).json({ success: true, message: 'Leave cancelled', data: updated });
  } catch (error) {
    next(error);
  }
};

export const getLeaveBalance = async (req, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { user: { id: req.user.id } },
          { email: req.user.email }
        ]
      }
    });

    if (employee && employee.leaveBalance) {
      return res.status(200).json({ success: true, data: employee.leaveBalance });
    }

    // If user has no personal employee profile (e.g. companyAdmin / superAdmin), return company policy leave balance or standard defaults
    let companyBalance = { sick: 12, casual: 12, annual: 18, emergency: 3 };
    const companyId = req.user.companyId;
    if (companyId) {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (company?.settings?.leaveBalance) {
        companyBalance = company.settings.leaveBalance;
      }
    }

    res.status(200).json({ success: true, data: companyBalance });
  } catch (error) {
    next(error);
  }
};
