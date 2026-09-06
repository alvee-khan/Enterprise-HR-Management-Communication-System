import prisma from '../config/prisma.js';
import { emitToUser } from '../config/socket.js';

export const getMessages = async (req, res, next) => {
  try {
    const { roomId, receiverId } = req.query;
    let companyId = req.user.companyId;
    if (!companyId) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      companyId = user?.companyId;
    }

    let where;
    if (roomId) {
      where = { roomId, isDeleted: false };
      if (companyId) where.companyId = companyId;
    } else if (receiverId && !isNaN(Number(receiverId))) {
      const recId = Number(receiverId);
      where = {
        isDeleted: false,
        OR: [
          { senderId: req.user.id, receiverId: recId },
          { senderId: recId, receiverId: req.user.id }
        ]
      };
      if (companyId) where.companyId = companyId;
    } else {
      return res.status(400).json({ success: false, message: 'Valid roomId or receiverId is required' });
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, profileImage: true } },
        replyTo: { select: { id: true, content: true, senderId: true } }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    });

    // Mark messages sent to me as read
    if (receiverId && !isNaN(Number(receiverId))) {
      const recId = Number(receiverId);
      await prisma.message.updateMany({
        where: {
          senderId: recId,
          receiverId: req.user.id,
          isRead: false
        },
        data: { isRead: true }
      });
    }

    res.status(200).json({ success: true, data: messages });
  } catch (error) { next(error); }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, roomId, replyToId, content, messageType, fileUrl, fileName } = req.body;
    if (!content && !fileUrl) {
      return res.status(400).json({ success: false, message: 'Message content or attachment is required' });
    }
    if (!receiverId && !roomId) {
      return res.status(400).json({ success: false, message: 'Receiver or Room is required' });
    }

    let companyId = req.user.companyId;
    if (!companyId) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      companyId = user?.companyId;
    }
    if (!companyId && receiverId) {
      const recUser = await prisma.user.findUnique({ where: { id: Number(receiverId) } });
      companyId = recUser?.companyId;
    }
    if (!companyId) {
      const firstComp = await prisma.company.findFirst({ where: { isActive: true } });
      companyId = firstComp?.id || 1;
    }

    const message = await prisma.message.create({
      data: {
        content: content || '',
        type: roomId ? 'group' : 'direct',
        messageType: messageType || 'text',
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        companyId,
        senderId: req.user.id,
        receiverId: receiverId ? Number(receiverId) : null,
        roomId: roomId || null,
        replyToId: replyToId ? Number(replyToId) : null
      },
      include: {
        sender: { select: { id: true, name: true, profileImage: true } },
        replyTo: { select: { id: true, content: true, senderId: true } }
      }
    });

    if (message.receiverId) {
      try {
        emitToUser(message.receiverId, 'receive_message', message);
      } catch (err) {
        console.error('Socket emit error:', err.message);
      }
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) { next(error); }
};

export const deleteMessage = async (req, res, next) => {
  try {
    await prisma.message.updateMany({
      where: { id: Number(req.params.id), senderId: req.user.id },
      data: { isDeleted: true, deletedAt: new Date(), content: 'Message deleted' }
    });
    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) { next(error); }
};

export const getConversations = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    // Get all direct messages where the user was sender or receiver
    const messages = await prisma.message.findMany({
      where: {
        companyId,
        type: 'direct',
        OR: [{ senderId: req.user.id }, { receiverId: req.user.id }]
      },
      orderBy: { createdAt: 'desc' }
    });

    const userIds = new Set();
    messages.forEach(m => {
      const otherId = m.senderId === req.user.id ? m.receiverId : m.senderId;
      if (otherId) userIds.add(otherId);
    });

    const users = await prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, name: true, profileImage: true }
    });

    const conversations = await Promise.all(users.map(async (user) => {
      const lastMsg = await prisma.message.findFirst({
        where: {
          companyId,
          type: 'direct',
          OR: [
            { senderId: req.user.id, receiverId: user.id },
            { senderId: user.id, receiverId: req.user.id }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      const unreadCount = await prisma.message.count({
        where: {
          companyId,
          senderId: user.id,
          receiverId: req.user.id,
          isRead: false
        }
      });

      return { user, lastMessage: lastMsg, unreadCount };
    }));

    res.status(200).json({ success: true, data: conversations });
  } catch (error) { next(error); }
};
