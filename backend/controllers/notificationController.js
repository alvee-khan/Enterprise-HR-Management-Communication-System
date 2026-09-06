import prisma from '../config/prisma.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { isRead, limit: lim } = req.query;
    const where = { userId: req.user.id };
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(lim) || 50
      }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } })
    ]);

    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (error) { next(error); }
};

export const markAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data: { isRead: true, readAt: new Date() }
    });
    res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error) { next(error); }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

export const deleteNotification = async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: Number(req.params.id), userId: req.user.id }
    });
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) { next(error); }
};
