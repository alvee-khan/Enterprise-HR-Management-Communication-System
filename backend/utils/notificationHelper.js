import prisma from '../config/prisma.js';
import { emitToUser } from '../config/socket.js';

export const createNotification = async ({ userId, companyId, type, title, message, link, metadata, priority = 'medium' }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: Number(userId),
        companyId: companyId ? Number(companyId) : null,
        type,
        title,
        message,
        link,
        metadata: metadata || undefined,
        priority
      }
    });
    // Real-time push via Socket.io
    emitToUser(userId, 'new_notification', {
      id: notification.id,
      type, title, message, link, priority,
      createdAt: notification.createdAt
    });
    return notification;
  } catch (error) {
    console.error('Notification creation error:', error.message);
  }
};

export const createBulkNotifications = async (notifications) => {
  try {
    const created = await prisma.notification.createMany({
      data: notifications.map(n => ({
        userId: Number(n.userId),
        companyId: n.companyId ? Number(n.companyId) : null,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        priority: n.priority || 'medium',
        metadata: n.metadata || undefined
      }))
    });

    // Emit individually (createMany doesn't return records in SQLite/Postgres by default)
    for (const n of notifications) {
      emitToUser(n.userId, 'new_notification', {
        type: n.type, title: n.title,
        message: n.message, link: n.link, priority: n.priority || 'medium',
        createdAt: new Date()
      });
    }
    return created;
  } catch (error) {
    console.error('Bulk notification error:', error.message);
  }
};
