import React, { useState, useEffect } from 'react';
import { announcementApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiVolume2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { BsPinAngle } from 'react-icons/bs';
import moment from 'moment';

export const AnnouncementList = () => {
  const { isHR } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'General',
    priority: 'Medium',
    isPinned: false
  });

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementApi.getAll();
      setAnnouncements(res.data?.data || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await announcementApi.create(formData);
      toast.success('Announcement broadcasted!');
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch {
      toast.error('Failed to post announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await announcementApi.delete(id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Company Bulletins & Announcements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Broadcast official notices, town hall events, and holiday policies
          </p>
        </div>
        {isHR() && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <FiPlus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Retrieving notices..." />
      ) : (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="card p-8 text-center text-slate-400 text-xs">
              No active broadcasts published.
            </div>
          ) : (
            announcements.map((a) => (
              <div
                key={a._id}
                className={`card p-6 relative overflow-hidden transition-all ${
                  a.isPinned ? 'border-l-4 border-l-primary-500 bg-primary-50/10 dark:bg-primary-950/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {a.isPinned && (
                      <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400 text-[10px] flex items-center gap-1">
                        <BsPinAngle /> Pinned
                      </span>
                    )}
                    <span className="badge bg-slate-100 text-slate-600 dark:bg-dark-700 dark:text-slate-300 text-[10px]">
                      {a.type}
                    </span>
                    <span className={`badge ${a.priority === 'High' ? 'priority-high' : 'priority-medium'} text-[10px]`}>
                      {a.priority} Priority
                    </span>
                  </div>
                  {isHR() && (
                    <button
                      onClick={() => handleDelete(a._id)}
                      className="text-slate-300 hover:text-rose-500 p-1"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2.5">
                  {a.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
                  {a.content}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex justify-between">
                  <span>Published by {a.createdBy?.name || 'HR Management'}</span>
                  <span>{moment(a.createdAt).format('DD MMM YYYY, hh:mm A')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Broadcast Announcement"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Annual Company Retreat Announcement"
              className="input text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input text-xs"
              >
                <option value="General">General</option>
                <option value="Event">Event</option>
                <option value="Policy">Policy</option>
                <option value="Holiday">Holiday</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input text-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinNotice"
              checked={formData.isPinned}
              onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
              className="w-4 h-4 rounded text-primary-600"
            />
            <label htmlFor="pinNotice" className="text-xs text-slate-700 dark:text-slate-300">
              Pin to top of bulletin feed
            </label>
          </div>
          <div>
            <label className="label">Content / Body</label>
            <textarea
              required
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Publish Notice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AnnouncementList;
