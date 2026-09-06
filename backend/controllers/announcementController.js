import prisma from '../config/prisma.js';
import { emitToCompany } from '../config/socket.js';

export const getAnnouncements = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { type, priority } = req.query;
    const where = { companyId, isActive: true };
    if (type) where.type = type;
    if (priority) where.priority = priority;

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, profileImage: true } }
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]
    });

    const userId = req.user.id;
    const filteredAndMapped = announcements
      .filter(a => {
        if (['superAdmin', 'companyAdmin', 'hrManager'].includes(req.user.role)) return true;
        const targetRoles = Array.isArray(a.targetRoles) ? a.targetRoles : [];
        if (targetRoles.length === 0 || targetRoles.includes('all') || targetRoles.includes(req.user.role)) return true;
        return false;
      })
      .map(a => {
        const readBy = Array.isArray(a.readBy) ? a.readBy : [];
        const isRead = readBy.some(r => r.userId === userId || r.user === userId || r.id === userId);
        return { ...a, isRead };
      });

    res.status(200).json({ success: true, data: filteredAndMapped });
  } catch (error) { next(error); }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const { expiresAt, targetDepartments, ...rest } = req.body;
    const announcement = await prisma.announcement.create({
      data: {
        ...rest,
        companyId: req.user.companyId,
        createdById: req.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        targetRoles: req.body.targetRoles || ['all'],
        attachments: req.body.attachments || [],
        readBy: []
      },
      include: {
        createdBy: { select: { id: true, name: true, profileImage: true } }
      }
    });

    // Real-time broadcast to company
    emitToCompany(req.user.companyId, 'new_announcement', {
      id: announcement.id,
      title: announcement.title,
      type: announcement.type,
      priority: announcement.priority
    });

    res.status(201).json({ success: true, message: 'Announcement created', data: announcement });
  } catch (error) { next(error); }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    delete updateData.companyId;
    delete updateData.createdById;
    if (updateData.expiresAt) updateData.expiresAt = new Date(updateData.expiresAt);

    const announcement = await prisma.announcement.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: { createdBy: { select: { id: true, name: true, profileImage: true } } }
    });
    res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Announcement not found' });
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    await prisma.announcement.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false }
    });
    res.status(200).json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Announcement not found' });
    next(error);
  }
};

export const markAnnouncementRead = async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.findUnique({ where: { id: Number(req.params.id) } });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    const readBy = Array.isArray(announcement.readBy) ? announcement.readBy : [];
    if (!readBy.some(r => r.userId === req.user.id)) {
      readBy.push({ userId: req.user.id, readAt: new Date() });
      await prisma.announcement.update({
        where: { id: announcement.id },
        data: { readBy }
      });
    }

    res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error) { next(error); }
};
