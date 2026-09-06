import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiCalendar, FiPlus, FiCheck, FiX, FiClock } from 'react-icons/fi';
import moment from 'moment';

export const LeaveList = () => {
  const { user, isManager, isHR } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [formData, setFormData] = useState({
    type: 'Casual',
    startDate: moment().add(1, 'day').format('YYYY-MM-DD'),
    endDate: moment().add(1, 'day').format('YYYY-MM-DD'),
    reason: '',
    isHalfDay: false
  });

  const fetchLeaves = async () => {
    try {
      const [leavesRes, balanceRes] = await Promise.allSettled([
        leaveApi.getAll(),
        leaveApi.getBalance()
      ]);

      if (leavesRes.status === 'fulfilled') {
        setLeaves(leavesRes.value.data?.data || []);
      } else {
        console.error('Leaves load error:', leavesRes.reason);
        toast.error('Failed to load leaves list');
      }

      if (balanceRes.status === 'fulfilled') {
        setBalance(balanceRes.value.data?.data || { sick: 12, casual: 12, annual: 18, emergency: 3 });
      } else {
        setBalance({ sick: 12, casual: 12, annual: 18, emergency: 3 });
      }
    } catch {
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      await leaveApi.apply(formData);
      toast.success('Leave application submitted!');
      setIsModalOpen(false);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave');
    }
  };

  const handleAction = async (id, action) => {
    setProcessingId(id);
    try {
      await leaveApi.processAction(id, { action });
      toast.success(`Leave request ${action}d`);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Leave & Time-Off Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Apply for time off, monitor remaining allowances, and review team requests
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 text-xs"
        >
          <FiPlus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 font-medium">Sick Leave</p>
          <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {balance.sick ?? 12}
          </h4>
          <span className="text-[10px] text-slate-400">days left</span>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 font-medium">Casual Leave</p>
          <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {balance.casual ?? 10}
          </h4>
          <span className="text-[10px] text-slate-400">days left</span>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 font-medium">Annual Leave</p>
          <h4 className="text-2xl font-extrabold text-primary-600 dark:text-primary-400 mt-1">
            {balance.annual ?? 18}
          </h4>
          <span className="text-[10px] text-slate-400">days left</span>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-400 font-medium">Emergency</p>
          <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {balance.emergency ?? 3}
          </h4>
          <span className="text-[10px] text-slate-400">days left</span>
        </div>
      </div>

      {/* Leaves Table */}
      <div className="table-container card">
        {loading ? (
          <LoadingSpinner text="Fetching leaves..." />
        ) : leaves.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No leave requests logged.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Status</th>
                {(isManager() || isHR()) && <th className="text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l._id}>
                  <td className="font-semibold text-xs text-slate-900 dark:text-white">
                    {l.employeeId?.name || user?.name}
                  </td>
                  <td>
                    <span className="badge bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-slate-300 text-xs">
                      {l.type}
                    </span>
                  </td>
                  <td className="text-xs font-semibold">{l.totalDays} day(s)</td>
                  <td className="text-xs text-slate-500">
                    {moment(l.startDate).format('DD MMM')} - {moment(l.endDate).format('DD MMM YYYY')}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                    {l.reason}
                  </td>
                  <td>
                    <span className={`badge ${l.status === 'Approved' ? 'status-approved' : l.status === 'Rejected' ? 'status-rejected' : 'status-pending'}`}>
                      {l.status}
                    </span>
                  </td>
                  {(isManager() || isHR()) && (
                    <td className="text-right">
                      {l.status === 'Pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleAction(l._id, 'approve')}
                            disabled={processingId === l._id}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg"
                            title="Approve"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(l._id, 'reject')}
                            disabled={processingId === l._id}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                            title="Reject"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Decided</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply for Leave / Time-Off"
      >
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="label">Leave Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input text-xs"
            >
              <option value="Casual">Casual Leave</option>
              <option value="Sick">Sick Leave</option>
              <option value="Annual">Annual Vacation</option>
              <option value="Emergency">Emergency Leave</option>
              <option value="Unpaid">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="label">Reason for Request</label>
            <textarea
              required
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Provide context for manager approval..."
              className="input text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Submit Application
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveList;
