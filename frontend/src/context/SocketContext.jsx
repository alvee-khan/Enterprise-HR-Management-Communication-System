import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Socket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socket.on('new_announcement', (announcement) => {
      setNotifications(prev => [{
        type: 'announcement', title: announcement.title,
        message: `New ${announcement.type} announcement`, _id: announcement._id
      }, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, token]);

  const joinRoom = (roomId) => socketRef.current?.emit('join_room', roomId);
  const leaveRoom = (roomId) => socketRef.current?.emit('leave_room', roomId);
  const sendMessage = (data) => socketRef.current?.emit('send_message', data);
  const emitTyping = (roomId) => socketRef.current?.emit('typing', { roomId });
  const emitStopTyping = (roomId) => socketRef.current?.emit('stop_typing', { roomId });

  const clearUnreadCount = () => setUnreadCount(0);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      notifications,
      unreadCount,
      clearUnreadCount,
      setUnreadCount,
      joinRoom,
      leaveRoom,
      sendMessage,
      emitTyping,
      emitStopTyping,
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};

export default SocketContext;
