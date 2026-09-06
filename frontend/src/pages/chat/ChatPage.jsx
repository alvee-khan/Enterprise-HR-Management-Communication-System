import React, { useState, useEffect, useRef } from 'react';
import { chatApi, employeeApi, userApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiSend, FiUser, FiSearch, FiMessageSquare } from 'react-icons/fi';
import moment from 'moment';

export const ChatPage = () => {
  const { user } = useAuth();
  const { sendMessage: socketSend, socket } = useSocket();
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // 1. Fetch team members across company users & employees
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const myId = Number(user?.id || user?._id);

        // Fetch all users in company
        const usersRes = await userApi.getAll();
        const rawUsers = usersRes.data?.data || [];

        // Fetch employees to enrich with designation/department
        const empsRes = await employeeApi.getAll();
        const rawEmps = empsRes.data?.data || [];

        const contacts = rawUsers
          .filter(u => {
            const uId = Number(u.id || u._id);
            return uId && uId !== myId;
          })
          .map(u => {
            const uId = Number(u.id || u._id);
            const matchedEmp = rawEmps.find(e => 
              Number(e.userId) === uId || 
              (e.email && u.email && e.email.toLowerCase() === u.email.toLowerCase())
            );

            return {
              id: uId,
              name: u.name || matchedEmp?.name || 'Colleague',
              email: u.email || matchedEmp?.email || '',
              role: u.role,
              designation: matchedEmp?.designation || (u.role === 'companyAdmin' ? 'Company Administrator' : u.role === 'hrManager' ? 'HR Manager' : 'Team Member'),
              department: matchedEmp?.department?.name || 'General',
              profileImage: u.profileImage || matchedEmp?.profileImage || ''
            };
          });

        setEmployees(contacts);
        if (contacts.length > 0) {
          setSelectedUser(contacts[0]);
        }
      } catch (err) {
        console.error('Failed to load team contacts:', err);
        toast.error('Failed to load team directory');
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [user]);

  // 2. Fetch messages strictly for the selected user
  useEffect(() => {
    if (!selectedUser?.id) return;
    let isCancelled = false;

    const loadConversation = async () => {
      setMessagesLoading(true);
      setMessages([]); // Clear previous chat immediately so it never leaks
      try {
        const res = await chatApi.getMessages({ receiverId: selectedUser.id });
        if (!isCancelled) {
          setMessages(res.data?.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch conversation:', err);
        if (!isCancelled) setMessages([]);
      } finally {
        if (!isCancelled) setMessagesLoading(false);
      }
    };

    loadConversation();

    return () => {
      isCancelled = true;
    };
  }, [selectedUser?.id]);

  // 3. Real-time socket message handler strictly scoped to active conversation
  useEffect(() => {
    if (!socket) return;

    const handler = (msg) => {
      if (!msg) return;
      const myId = Number(user?.id || user?._id);
      const activeRecipientId = Number(selectedUser?.id);

      const senderId = Number(msg.senderId?.id || msg.senderId?._id || msg.senderId);
      const receiverId = Number(msg.receiverId?.id || msg.receiverId?._id || msg.receiverId);

      // Only append if message belongs to THIS specific conversation
      const isFromCurrentToMe = senderId === activeRecipientId && receiverId === myId;
      const isFromMeToCurrent = senderId === myId && receiverId === activeRecipientId;

      if (isFromCurrentToMe || isFromMeToCurrent) {
        setMessages((prev) => {
          const msgId = msg.id || msg._id;
          if (msgId && prev.some(m => (m.id || m._id) === msgId)) {
            return prev;
          }
          return [...prev, msg];
        });
      }
    };

    socket.on('receive_message', handler);
    return () => socket.off('receive_message', handler);
  }, [socket, selectedUser?.id, user]);

  // 4. Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesLoading]);

  // 5. Send message handler
  const handleSend = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedUser?.id) return;

    const targetUserId = Number(selectedUser.id);
    const payload = {
      receiverId: targetUserId,
      content: text,
      type: 'direct'
    };

    try {
      const res = await chatApi.sendMessage(payload);
      const newMsg = res.data?.data;
      if (newMsg) {
        setMessages((prev) => {
          const msgId = newMsg.id || newMsg._id;
          if (msgId && prev.some(m => (m.id || m._id) === msgId)) {
            return prev;
          }
          return [...prev, newMsg];
        });
        socketSend(newMsg);
      }
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner text="Connecting to team channels..." />;

  return (
    <div className="card h-[calc(100vh-140px)] flex overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800">
      {/* Team Sidebar */}
      <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-900/50 flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FiMessageSquare className="text-primary-500" /> Direct Messages
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              {employees.length} Online
            </span>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-2.5 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search colleagues..."
              className="input pl-8 py-1.5 text-xs w-full bg-white dark:bg-dark-800"
            />
          </div>
        </div>

        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No colleagues found
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isSelected = selectedUser?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedUser(emp)}
                  className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-left transition-all ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-semibold shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {emp.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="truncate flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium truncate">{emp.name}</p>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{emp.designation}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-dark-800">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {selectedUser.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedUser.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {selectedUser.designation} • <span className="text-emerald-500 font-medium">● Active in workspace</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-dark-900/20">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner text="Loading conversation..." />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-dark-700 text-primary-500 flex items-center justify-center text-xl">
                    <FiMessageSquare />
                  </div>
                  <p className="text-xs font-medium">No previous messages with {selectedUser.name}.</p>
                  <p className="text-[11px] text-slate-400">Send a message below to start collaborating!</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const senderId = Number(m.senderId?.id || m.senderId?._id || m.senderId);
                  const myId = Number(user?.id || user?._id);
                  const isMe = senderId === myId;

                  return (
                    <div key={m.id || m._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm ${
                          isMe
                            ? 'bg-primary-600 text-white rounded-br-none shadow-sm'
                            : 'bg-white dark:bg-dark-700 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700 shadow-sm'
                        }`}
                      >
                        <p className="break-words leading-relaxed">{m.content}</p>
                        <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                          {moment(m.createdAt).format('hh:mm A')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message ${selectedUser.name}...`}
                className="input text-xs py-2.5 px-3 flex-1"
                autoFocus
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="btn-primary px-5 py-2.5 flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend /> Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
            <FiUser className="text-3xl text-slate-300" />
            <p>Select a team member to start communicating.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
