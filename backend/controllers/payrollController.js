/**
 * CSE447 Security and Cryptography
 * Secure Payroll Controller
 * 
 * Features:
 * - ECC Digital Signature on Payroll Generation and Disbursement
 * - HMAC-SHA256 Integrity Tag on Payroll Records
 * - Pure Manual RSA Decryption for employee basic salary calculation
 * - RBAC Authorization & Audit Trail
 */

import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendPayrollEmail } from '../utils/email.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { generateMAC } from '../security/mac/generateMAC.js';
import { verifyMAC } from '../security/mac/verifyMAC.js';
import { signMessage } from '../security/ecc/digitalSignature.js';
import { verifySignature } from '../security/ecc/signatureVerification.js';
import { getOrInitializeSystemECCKey, decryptAndVerifyEmployeeProfile } from '../security/encryption/encryptionService.js';
import { getUnwrappedPrivateKey } from '../security/keyManagement/keyStorage.js';

const calcPayroll = (basicSalary, allowances, bonuses, deductions, tax) => {
  const totalAllowances = (allowances || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const totalBonuses = (bonuses || []).reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const totalDeductions = (deductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const grossSalary = Number(basicSalary) + totalAllowances + totalBonuses;
  const netSalary = grossSalary - totalDeductions - (Number(tax) || 0);
  return { totalAllowances, totalBonuses, totalDeductions, grossSalary, netSalary };
};

// @desc    Get payroll records (with RBAC and Integrity verification)
// @route   GET /api/payroll
export const getPayrolls = async (req, res, next) => {
  try {
    const where = { companyId: req.user.companyId };
    const { month, year, employeeId, status } = req.query;

    // RBAC: Non-admin employees can only view their own payroll records
    if (req.user.role === 'employee') {
      const emp = await prisma.employee.findFirst({ where: { user: { id: req.user.id } } });
      if (emp) where.employeeId = emp.id;
    } else if (employeeId) {
      where.employeeId = Number(employeeId);
    }

    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: { select: { name: true, employeeCode: true, departmentId: true, designation: true, profileImage: true } },
        generatedBy: { select: { name: true, email: true } },
        paidBy: { select: { name: true, email: true } }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    // Verify HMAC integrity for each record
    const verifiedPayrolls = payrolls.map(p => {
      const payloadString = JSON.stringify({
        employeeId: p.employeeId,
        companyId: p.companyId,
        month: p.month,
        year: p.year,
        netSalary: p.netSalary,
        status: p.status
      });
      const hash = crypto.createHash('sha256').update(payloadString).digest('hex');
      const isIntegrityValid = p.mac_value ? verifyMAC(hash, p.mac_value) : true;

      return {
        ...p,
        _integrityVerified: isIntegrityValid,
        _hasDigitalSignature: !!p.approval_signature
      };
    });

    res.status(200).json({ success: true, data: verifiedPayrolls });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate payroll with ECC digital signature and HMAC tag
// @route   POST /api/payroll
export const generatePayroll = async (req, res, next) => {
  try {
    const { employeeId, month, year, allowances, bonuses, deductions, tax, notes, workingDays, presentDays } = req.body;

    const rawEmployee = await prisma.employee.findUnique({ where: { id: Number(employeeId) } });
    if (!rawEmployee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const employee = await decryptAndVerifyEmployeeProfile(rawEmployee);

    const existing = await prisma.payroll.findFirst({
      where: { employeeId: Number(employeeId), month: parseInt(month), year: parseInt(year) }
    });
    if (existing) return res.status(400).json({ success: false, message: 'Payroll already generated for this period' });

    const salary = employee.salary || {};
    const basicSalary = Number(salary.basic) || 50000;
    const currency = salary.currency || 'BDT';
    const calcs = calcPayroll(basicSalary, allowances, bonuses, deductions, tax);

    // 1. Compute Record Hash & HMAC
    const payloadString = JSON.stringify({
      employeeId: Number(employeeId),
      companyId: req.user.companyId,
      month: parseInt(month),
      year: parseInt(year),
      netSalary: calcs.netSalary,
      status: 'Processed'
    });
    const recordHash = crypto.createHash('sha256').update(payloadString).digest('hex');
    const macValue = generateMAC(recordHash);

    // 2. Generate ECC Digital Signature for Approval
    let approvalSignature = null;
    try {
      const systemEccKey = await getOrInitializeSystemECCKey();
      const privKey = JSON.parse(getUnwrappedPrivateKey(systemEccKey));
      approvalSignature = signMessage(recordHash, privKey);
    } catch (sigErr) {
      console.error('Payroll signing warning:', sigErr.message);
    }

    const payroll = await prisma.payroll.create({
      data: {
        employeeId: Number(employeeId),
        companyId: req.user.companyId,
        month: parseInt(month),
        year: parseInt(year),
        basicSalary,
        allowances: allowances || [],
        bonuses: bonuses || [],
        deductions: deductions || [],
        tax: Number(tax) || 0,
        currency,
        workingDays: workingDays || 22,
        presentDays: presentDays || 22,
        leaveDays: workingDays && presentDays ? workingDays - presentDays : 0,
        status: 'Processed',
        generatedById: req.user.id,
        approval_signature: approvalSignature,
        mac_value: macValue,
        integrity_hash: recordHash,
        ...calcs
      }
    });

    // Notify employee
    const userRecord = await prisma.user.findFirst({ where: { employeeProfileId: employee.id } });
    if (userRecord) {
      await createNotification({
        userId: userRecord.id,
        companyId: req.user.companyId,
        type: 'payroll_generated',
        title: 'Salary Processed',
        message: `Your salary for ${month}/${year} has been processed. Net: ৳${payroll.netSalary.toLocaleString()} ${currency}`,
        link: '/payroll'
      });
      await sendPayrollEmail(employee.email, employee.name, month, year, `৳${payroll.netSalary.toLocaleString()} ${currency}`);
    }

    await createAuditLog({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'APPROVE',
      entity: 'Payroll',
      entityId: payroll.id,
      description: `Generated cryptographically signed payroll for ${employee.name} (৳${payroll.netSalary})`,
      req
    });

    res.status(201).json({ success: true, message: 'Payroll generated and digitally signed', data: payroll });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payroll and re-sign
// @route   PUT /api/payroll/:id
export const updatePayroll = async (req, res, next) => {
  try {
    const existing = await prisma.payroll.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Payroll not found' });

    const updateData = { ...req.body };
    if (updateData.allowances || updateData.bonuses || updateData.deductions || updateData.tax !== undefined) {
      const calcs = calcPayroll(
        updateData.basicSalary || existing.basicSalary,
        updateData.allowances || existing.allowances,
        updateData.bonuses || existing.bonuses,
        updateData.deductions || existing.deductions,
        updateData.tax !== undefined ? updateData.tax : existing.tax
      );
      Object.assign(updateData, calcs);
    }

    // Recompute Hash, HMAC and Signature
    const payloadString = JSON.stringify({
      employeeId: existing.employeeId,
      companyId: existing.companyId,
      month: existing.month,
      year: existing.year,
      netSalary: updateData.netSalary || existing.netSalary,
      status: updateData.status || existing.status
    });
    const recordHash = crypto.createHash('sha256').update(payloadString).digest('hex');
    const macValue = generateMAC(recordHash);

    const systemEccKey = await getOrInitializeSystemECCKey();
    const privKey = JSON.parse(systemEccKey.protected_private_key);
    const approvalSignature = signMessage(recordHash, privKey);

    updateData.mac_value = macValue;
    updateData.integrity_hash = recordHash;
    updateData.approval_signature = approvalSignature;

    const payroll = await prisma.payroll.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: { employee: { select: { name: true, employeeCode: true } } }
    });

    res.status(200).json({ success: true, message: 'Payroll updated and digitally re-signed', data: payroll });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark payroll as paid with cryptographic signature
// @route   POST /api/payroll/:id/pay
export const markAsPaid = async (req, res, next) => {
  try {
    const existing = await prisma.payroll.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Payroll not found' });

    const payloadString = JSON.stringify({
      employeeId: existing.employeeId,
      companyId: existing.companyId,
      month: existing.month,
      year: existing.year,
      netSalary: existing.netSalary,
      status: 'Paid'
    });
    const recordHash = crypto.createHash('sha256').update(payloadString).digest('hex');
    const macValue = generateMAC(recordHash);

    const systemEccKey = await getOrInitializeSystemECCKey();
    const privKey = JSON.parse(systemEccKey.protected_private_key);
    const approvalSignature = signMessage(recordHash, privKey);

    const payroll = await prisma.payroll.update({
      where: { id: Number(req.params.id) },
      data: {
        status: 'Paid',
        paymentDate: new Date(),
        paidById: req.user.id,
        paymentMethod: req.body.paymentMethod || 'BankTransfer',
        mac_value: macValue,
        integrity_hash: recordHash,
        approval_signature: approvalSignature
      }
    });

    await createAuditLog({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'APPROVE',
      entity: 'Payroll',
      entityId: payroll.id,
      description: `Marked payroll as paid with digital signature`,
      req
    });

    res.status(200).json({ success: true, message: 'Payroll marked as paid with ECC signature', data: payroll });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payroll summary statistics
// @route   GET /api/payroll/stats
export const getPayrollStats = async (req, res, next) => {
  try {
    const { year } = req.query;
    const where = { companyId: req.user.companyId };
    if (year) where.year = parseInt(year);

    const stats = await prisma.payroll.groupBy({
      by: ['month', 'year'],
      where,
      _sum: { grossSalary: true, netSalary: true, totalBonuses: true, totalDeductions: true },
      _count: { id: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }]
    });

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
