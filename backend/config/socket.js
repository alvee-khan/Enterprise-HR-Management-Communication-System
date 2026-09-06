import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from './prisma.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, name: true, email: true, role: true, companyId: true, isActive: true }
      });
      if (!user || !user.isActive) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.user?.name} (${socket.id})`);

    // Join personal and company rooms
    socket.join(`user_${socket.user.id}`);
    if (socket.user.companyId) {
      socket.join(`company_${socket.user.companyId}`);
    }

    // Chat events
    socket.on('join_room', (roomId) => {
      socket.join(`room_${roomId}`);
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(`room_${roomId}`);
    });

    socket.on('send_message', (data) => {
      io.to(`room_${data.roomId}`).emit('receive_message', data);
    });

    socket.on('typing', (data) => {
      socket.to(`room_${data.roomId}`).emit('user_typing', { userId: socket.user.id, name: socket.user.name });
    });

    socket.on('stop_typing', (data) => {
      socket.to(`room_${data.roomId}`).emit('user_stop_typing', { userId: socket.user.id });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.user?.name}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

// Helper to emit notification to a specific user
export const emitToUser = (userId, event, data) => {
  if (io) io.to(`user_${userId}`).emit(event, data);
};

// Helper to emit to all users in a company
export const emitToCompany = (companyId, event, data) => {
  if (io) io.to(`company_${companyId}`).emit(event, data);
};
