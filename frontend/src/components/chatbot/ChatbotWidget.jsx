import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiCpu, FiUser } from 'react-icons/fi';
import { chatbotApi } from '../../api';

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "👋 Hi! I'm your HR AI Assistant. Ask me anything about your leave balance, attendance, salary slip, assigned tasks, or company holidays!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      sender: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatbotApi.query(userMessage.text);
      const botResponse = res.data?.data?.response || 'Sorry, I could not process your query.';
      
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ Unable to connect to the HR Assistant right now. Please try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'My leave balance',
    'My attendance',
    'My salary',
    'My tasks',
    'Company holidays'
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-glow flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110 active:scale-95"
          title="Open HR Assistant"
        >
          <FiMessageSquare className="w-7 h-7" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] card flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700/80 animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-indigo-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FiCpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">HR Assistant</h4>
                <p className="text-[11px] text-white/80 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online &amp; ready
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="bg-slate-50 dark:bg-dark-900/60 p-2 flex gap-1.5 overflow-x-auto scrollbar-hide border-b border-slate-100 dark:border-slate-700/40">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(p);
                }}
                className="text-[11px] font-medium whitespace-nowrap bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-dark-900/30">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FiCpu className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm whitespace-pre-line leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white dark:bg-dark-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700/50 shadow-sm'
                  }`}
                >
                  {m.text}
                  <div
                    className={`text-[10px] mt-1 text-right ${
                      m.sender === 'user' ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    {m.time}
                  </div>
                </div>
                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-dark-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <FiUser className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-xs text-slate-400">
                <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600">
                  <FiCpu className="w-3.5 h-3.5" />
                </div>
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-dark-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about HR..."
              className="input text-xs sm:text-sm py-2 px-3 flex-1"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn-primary px-3 py-2 shrink-0 flex items-center justify-center"
            >
              <FiSend className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
