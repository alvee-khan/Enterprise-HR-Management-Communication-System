/**
 * CSE447 – User Controller
 * Encrypts user info on update; decrypts on all retrieval (Req 2, 6, 7).
 */
import prisma from '../config/prisma.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { encryptSensitiveField, decryptSensitiveField } from '../security/encryption/encryptionService.js';

// ─── Helper: decrypt user fields for response ─────────────────────────────────
async function decryptUserResponse(user) {
  if (!user) return null;
  const out = { ...user };
  if (user.encrypted_name)  { try { out.name  = await decryptSensitiveField(user.encrypted_name);  } catch {} }
  if (user.encrypted_email) { try { out.email = await decryptSensitiveField(user.encrypted_email); } catch {} }
  if (user.encrypted_phone) { try { out.phone = await decryptSensitiveField(user.encrypted_phone); } catch {} }
  delete out.encrypted_name;
  delete out.encrypted_email;
  delete out.encrypted_phone;
  return out;
}

// ─── Select helper (always include encrypted fields for decryption) ────────────
const USER_SELECT = {
  id: true, name: true, email: true, role: true,
  companyId: true, profileImage: true, phone: true,
  isActive: true, isEmailVerified: true, preferences: true,
  lastLogin: true, createdAt: true, updatedAt: true,
  encrypted_name: true, encrypted_email: true, encrypted_phone: true
};

export const getUsers = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role !== 'superAdmin') where.companyId = req.user.companyId;
    const { role, isActive } = req.query;
    if (role)      where.role     = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rawUsers = await prisma.user.findMany({
      where,
      select:  USER_SELECT,
      orderBy: { createdAt: 'desc' }
    });

    // Decrypt each user's sensitive fields (Req 2)
    const users = await Promise.all(rawUsers.map(u => decryptUserResponse(u)));
    res.status(200).json({ success: true, data: users });
  } catch (error) { next(error); }
};

export const getUser = async (req, res, next) => {
  try {
    const raw = await prisma.user.findUnique({
      where:  { id: Number(req.params.id) },
      select: USER_SELECT
    });
    if (!raw) return res.status(404).json({ success: false, message: 'User not found' });
    const user = await decryptUserResponse(raw);
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const updateUser = async (req, res, next) => {
  try {
    const { name, phone, profileImage, preferences } = req.body;

    // Re-encrypt updated fields (Req 2 – encrypted before storage)
    const updateData = { profileImage, preferences };
    if (name) {
      updateData.name           = name;
      updateData.encrypted_name = await encryptSensitiveField(name);
    }
    if (phone !== undefined) {
      updateData.phone           = phone;
      updateData.encrypted_phone = phone ? await encryptSensitiveField(phone) : null;
    }

    const raw  = await prisma.user.update({
      where:  { id: Number(req.params.id) },
      data:   updateData,
      select: USER_SELECT
    });
    const user = await decryptUserResponse(raw);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'User not found' });
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, preferences } = req.body;

    // Re-encrypt updated fields (Req 6 – profiles encrypted on every update)
    const data = {};
    if (preferences) data.preferences = preferences;
    if (req.file)    data.profileImage = `/uploads/profiles/${req.file.filename}`;
    if (name) {
      data.name           = name;
      data.encrypted_name = await encryptSensitiveField(name);
    }
    if (phone !== undefined) {
      data.phone           = phone;
      data.encrypted_phone = phone ? await encryptSensitiveField(phone) : null;
    }

    const raw  = await prisma.user.update({
      where:  { id: req.user.id },
      data,
      select: USER_SELECT
    });
    const user = await decryptUserResponse(raw);
    res.status(200).json({ success: true, message: 'Profile updated (re-encrypted)', data: user });
  } catch (error) { next(error); }
};

export const deactivateUser = async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { isActive: false } });
    await createAuditLog({
      userId: req.user.id, companyId: req.user.companyId,
      action: 'DEACTIVATE', entity: 'User', entityId: req.params.id,
      description: 'User deactivated', req
    });
    res.status(200).json({ success: true, message: 'User deactivated' });
  } catch (error) { next(error); }
};
