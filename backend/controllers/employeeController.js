/**
 * CSE447 Security and Cryptography
 * Secure Employee Controller
 * 
 * Features:
 * - Pure RSA Encryption for sensitive profile data (Salary, Bank Details, Emergency Contacts)
 * - HMAC-SHA256 Integrity Verification (Tamper detection)
 * - RBAC Authorization
 * - Secure Audit Logging with cryptographic hash-chaining
 */

import prisma from '../config/prisma.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { generateSecureToken } from '../utils/qrGenerator.js';
import { sendWelcomeEmail } from '../utils/email.js';
import { generateSalt, hashPasswordWithSalt } from '../security/authentication/passwordHashing.js';
import { encryptEmployeeProfile, decryptAndVerifyEmployeeProfile, encryptSensitiveField, decryptSensitiveField } from '../security/encryption/encryptionService.js';
import { generateECCKeyPair } from '../security/ecc/eccKeyGeneration.js';
import { signMessage } from '../security/ecc/digitalSignature.js';
import { generateMAC } from '../security/mac/generateMAC.js';

// Normalize enums for Prisma
export const normalizeEmploymentType = (val) => {
  if (!val) return 'FullTime';
  const clean = String(val).replace(/[-_\s]/g, '').toLowerCase();
  if (clean === 'fulltime') return 'FullTime';
  if (clean === 'parttime') return 'PartTime';
  if (clean === 'contract') return 'Contract';
  if (clean === 'intern') return 'Intern';
  if (clean === 'freelance') return 'Freelance';
  if (clean === 'remote') return 'Remote';
  return 'FullTime';
};

export const normalizeGender = (val) => {
  if (!val) return null;
  const clean = String(val).replace(/[-_\s]/g, '').toLowerCase();
  if (clean === 'male') return 'Male';
  if (clean === 'female') return 'Female';
  if (clean === 'other') return 'Other';
  if (clean.includes('prefer')) return 'PreferNotToSay';
  return null;
};

export const normalizeEmployeeStatus = (val) => {
  if (!val) return 'Active';
  const clean = String(val).replace(/[-_\s]/g, '').toLowerCase();
  if (clean === 'active') return 'Active';
  if (clean === 'inactive') return 'Inactive';
  if (clean === 'onleave') return 'OnLeave';
  if (clean === 'terminated') return 'Terminated';
  if (clean === 'resigned') return 'Resigned';
  return 'Active';
};

// Build where clause for filtering
const buildWhere = (req) => {
  const where = { companyId: req.companyId || req.user.companyId };
  const { search, departmentId, status, employmentType, gender } = req.query;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { employeeCode: { contains: search, mode: 'insensitive' } },
      { designation: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (departmentId) where.departmentId = Number(departmentId);
  if (status) where.status = normalizeEmployeeStatus(status);
  if (employmentType) where.employmentType = normalizeEmploymentType(employmentType);
  if (gender) where.gender = normalizeGender(gender);

  return where;
};

// @desc    Get all employees with decrypted & verified records
// @route   GET /api/employees
export const getEmployees = async (req, res, next) => {
  try {
    const where = buildWhere(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: { select: { name: true, color: true } },
          manager: { select: { name: true, email: true, profileImage: true } },
          user: { select: { id: true, name: true, email: true, role: true, profileImage: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      prisma.employee.count({ where })
    ]);

    // Decrypt and verify each employee record for authorized staff
    const processedEmployees = await Promise.all(
      employees.map(async (emp) => {
        const dec = await decryptAndVerifyEmployeeProfile(emp);
        if (dec) {
          dec.userId = emp.user?.id || null;
        }
        return dec;
      })
    );

    res.status(200).json({
      success: true,
      data: processedEmployees,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
export const getEmployee = async (req, res, next) => {
  try {
    const where = { id: Number(req.params.id) };
    if (req.user.role !== 'superAdmin') where.companyId = req.user.companyId;

    const employee = await prisma.employee.findFirst({
      where,
      include: {
        department: { select: { name: true, color: true } },
        manager: { select: { name: true, email: true, profileImage: true, designation: true } },
        documents: true
      }
    });

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // RBAC Check: Employees can only view their own full sensitive details unless Admin/HR
    const isSelf = req.user.employeeProfileId === employee.id;
    const isPrivileged = ['superAdmin', 'companyAdmin', 'hrManager'].includes(req.user.role);

    const decrypted = await decryptAndVerifyEmployeeProfile(employee);

    if (!isSelf && !isPrivileged) {
      // Redact sensitive financial data for unauthorized peers
      decrypted.salary = { basic: '*** REDACTED ***', currency: 'BDT' };
      decrypted.bankDetails = null;
    }

    res.status(200).json({ success: true, data: decrypted });
  } catch (error) {
    next(error);
  }
};

// @desc    Create employee with RSA encryption and Salted Account
// @route   POST /api/employees
export const createEmployee = async (req, res, next) => {
  try {
    let companyId = req.user.companyId || (req.body.companyId ? Number(req.body.companyId) : null);

    // If companyId is null (e.g. superAdmin), resolve from selected department
    if (!companyId && (req.body.departmentId || req.body.department)) {
      const dept = await prisma.department.findUnique({
        where: { id: Number(req.body.departmentId || req.body.department) }
      });
      if (dept?.companyId) companyId = dept.companyId;
    }

    // Fallback to company administered by user or first active company
    if (!companyId) {
      const adminComp = await prisma.company.findFirst({ where: { adminId: req.user.id } });
      if (adminComp) companyId = adminComp.id;
    }

    if (!companyId) {
      const firstComp = await prisma.company.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
      companyId = firstComp?.id;
    }

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'No company found to associate employee with' });
    }

    // Persist companyId to user profile if previously unset
    if (!req.user.companyId && req.user.id) {
      try {
        await prisma.user.update({ where: { id: req.user.id }, data: { companyId } });
        req.user.companyId = companyId;
      } catch {}
    }

    const count = await prisma.employee.count({ where: { companyId } });
    const employeeCode = `EMP-${String(count + 1).padStart(4, '0')}`;

    // 1. Create secure user account
    const tempPassword = generateSecureToken(8);
    const passwordSalt = generateSalt(16);
    const { hash: hashedPassword } = hashPasswordWithSalt(tempPassword, passwordSalt);
    const userEccKeys = generateECCKeyPair();

    const encryptedName = await encryptSensitiveField(req.body.name);
    const encryptedEmail = await encryptSensitiveField(req.body.email);
    const encryptedPhone = req.body.phone ? await encryptSensitiveField(req.body.phone) : null;

    const user = await prisma.user.create({
      data: {
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        password_salt: passwordSalt,
        role: req.body.role || 'employee',
        companyId,
        profileImage: req.body.profileImage || '',
        encrypted_name: encryptedName,
        encrypted_email: encryptedEmail,
        encrypted_phone: encryptedPhone,
        ecc_public_key: JSON.stringify(userEccKeys.publicKey),
        security_version: 2
      }
    });

    // 2. Encrypt sensitive employee data via manual RSA
    const rawEmployeePayload = {
      companyId,
      employeeCode,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      profileImage: req.body.profileImage || '',
      gender: normalizeGender(req.body.gender),
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
      address: req.body.address,
      departmentId: req.body.departmentId ? Number(req.body.departmentId) : (req.body.department ? Number(req.body.department) : null),
      designation: req.body.designation,
      managerId: req.body.managerId ? Number(req.body.managerId) : null,
      joiningDate: new Date(req.body.joiningDate || Date.now()),
      employmentType: normalizeEmploymentType(req.body.employmentType),
      status: normalizeEmployeeStatus(req.body.status),
      salary: req.body.salary || { basic: 50000, currency: 'BDT' },
      bankDetails: req.body.bankDetails || null,
      emergencyContact: req.body.emergencyContact || null,
      skills: req.body.skills || [],
      education: req.body.education || [],
      experience: req.body.experience || [],
      leaveBalance: { sick: 12, casual: 12, annual: 18, emergency: 3 },
      notes: req.body.notes
    };

    const securedPayload = await encryptEmployeeProfile(rawEmployeePayload);

    const employee = await prisma.employee.create({
      data: securedPayload
    });

    // Link user to employee
    await prisma.user.update({
      where: { id: user.id },
      data: { employeeProfileId: employee.id }
    });

    await sendWelcomeEmail(req.body.email, req.body.name, tempPassword);
    await createAuditLog({
      userId: req.user.id,
      companyId,
      action: 'CREATE',
      entity: 'Employee',
      entityId: employee.id,
      description: `Created encrypted employee record for ${req.body.name} (${employeeCode})`,
      req
    });

    const populated = await prisma.employee.findUnique({
      where: { id: employee.id },
      include: { department: { select: { name: true, color: true } } }
    });

    const decrypted = await decryptAndVerifyEmployeeProfile(populated);
    res.status(201).json({ success: true, message: 'Employee created successfully with RSA encryption', data: decrypted });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee with RSA re-encryption & MAC recalculation
// @route   PUT /api/employees/:id
export const updateEmployee = async (req, res, next) => {
  try {
    const before = await prisma.employee.findUnique({ where: { id: Number(req.params.id) } });
    if (!before) return res.status(404).json({ success: false, message: 'Employee not found' });

    const updateData = { ...req.body };
    if (updateData.department && !updateData.departmentId) {
      updateData.departmentId = Number(updateData.department);
    }
    delete updateData.department;
    if (updateData.departmentId) updateData.departmentId = Number(updateData.departmentId);
    if (updateData.managerId) updateData.managerId = Number(updateData.managerId);
    if (updateData.joiningDate) updateData.joiningDate = new Date(updateData.joiningDate);
    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.employmentType) updateData.employmentType = normalizeEmploymentType(updateData.employmentType);
    if (updateData.gender) updateData.gender = normalizeGender(updateData.gender);
    if (updateData.status) updateData.status = normalizeEmployeeStatus(updateData.status);
    delete updateData.userId;
    delete updateData.companyId;

    // Encrypt sensitive fields if updated
    const securedUpdate = await encryptEmployeeProfile({ ...before, ...updateData });

    const employee = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: securedUpdate,
      include: {
        department: { select: { name: true, color: true } },
        manager: { select: { name: true, email: true } }
      }
    });

    if (req.body.profileImage) {
      const userRecord = await prisma.user.findFirst({ where: { employeeProfileId: employee.id } });
      if (userRecord) {
        await prisma.user.update({ where: { id: userRecord.id }, data: { profileImage: req.body.profileImage } });
      }
    }

    await createAuditLog({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'UPDATE',
      entity: 'Employee',
      entityId: employee.id,
      description: `Updated employee ${employee.name} with updated MAC integrity`,
      changes: { before, after: employee },
      req
    });

    const decrypted = await decryptAndVerifyEmployeeProfile(employee);
    res.status(200).json({ success: true, message: 'Employee updated successfully', data: decrypted });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
export const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: Number(req.params.id) } });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const userRecord = await prisma.user.findFirst({ where: { employeeProfileId: employee.id } });
    if (userRecord) {
      await prisma.user.update({ where: { id: userRecord.id }, data: { isActive: false } });
    }
    await prisma.employee.update({ where: { id: Number(req.params.id) }, data: { status: 'Terminated' } });

    await createAuditLog({
      userId: req.user.id,
      companyId: req.user.companyId,
      action: 'DELETE',
      entity: 'Employee',
      entityId: employee.id,
      description: `Terminated employee ${employee.name}`,
      req
    });

    res.status(200).json({ success: true, message: 'Employee terminated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile image
// @route   POST /api/employees/:id/avatar
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const fileUrl = `/uploads/profiles/${req.file.filename}`;
    const employee = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: { profileImage: fileUrl }
    });
    const userRecord = await prisma.user.findFirst({ where: { employeeProfileId: employee.id } });
    if (userRecord) {
      await prisma.user.update({ where: { id: userRecord.id }, data: { profileImage: fileUrl } });
    }
    res.status(200).json({ success: true, data: { profileImage: fileUrl } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get employee statistics
// @route   GET /api/employees/stats
export const getEmployeeStats = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const [total, active, onLeave] = await Promise.all([
      prisma.employee.count({ where: { companyId } }),
      prisma.employee.count({ where: { companyId, status: 'Active' } }),
      prisma.employee.count({ where: { companyId, status: 'OnLeave' } })
    ]);

    const byDept = await prisma.employee.groupBy({
      by: ['departmentId'],
      where: { companyId },
      _count: { id: true }
    });

    const byType = await prisma.employee.groupBy({
      by: ['employmentType'],
      where: { companyId },
      _count: { id: true }
    });

    res.status(200).json({ success: true, data: { total, active, onLeave, byDepartment: byDept, byType } });
  } catch (error) {
    next(error);
  }
};
