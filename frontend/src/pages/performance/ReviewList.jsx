import React, { useState, useEffect } from 'react';
import { reviewApi, employeeApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiAward, FiPlus, FiStar, FiCheck } from 'react-icons/fi';

export const ReviewList = () => {
  const { user, isManager, isHR } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    period: 'Q3 2024',
    criteria: [
      { name: 'Productivity & Throughput', score: 8, weight: 25 },
      { name: 'Technical & Domain Skills', score: 8, weight: 25 },
      { name: 'Communication & Teamwork', score: 9, weight: 25 },
      { name: 'Leadership & Initiative', score: 7, weight: 25 },
    ],
    comments: '',
    strengths: 'Fast learner, reliable on production deployments',
    improvements: 'Can participate more in architecture reviews'
  });

  const fetchReviews = async () => {
    try {
      const [revRes, empRes] = await Promise.all([
        reviewApi.getAll(),
        employeeApi.getAll()
      ]);
      setReviews(revRes.data?.data || []);
      setEmployees(empRes.data?.data || []);
    } catch {
      toast.error('Failed to load performance reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleCreateReview = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        strengths: typeof formData.strengths === 'string' ? formData.strengths.split(',') : formData.strengths,
        improvements: typeof formData.improvements === 'string' ? formData.improvements.split(',') : formData.improvements,
      };
      await reviewApi.create(payload);
      toast.success('Performance evaluation submitted!');
      setIsModalOpen(false);
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await reviewApi.acknowledge(id);
      toast.success('Review acknowledged!');
      fetchReviews();
    } catch {
      toast.error('Failed to acknowledge review');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Performance Reviews & Evaluations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quarterly appraisal scoring, 360 feedback, and talent development
          </p>
        </div>
        {(isManager() || isHR()) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <FiPlus className="w-4 h-4" /> Conduct Review
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner text="Compiling evaluation metrics..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reviews.length === 0 ? (
            <div className="card p-8 text-center text-slate-400 text-xs col-span-2">
              No performance reviews on record for this cycle.
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r._id} className="card p-6 space-y-4 hover:shadow-glow transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm">
                      {r.employeeId?.name?.[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {r.employeeId?.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {r.period} Review • By {r.reviewerId?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="badge bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 font-extrabold text-sm">
                      ★ {r.overallScore} / 10
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">{r.rating}</p>
                  </div>
                </div>

                {/* Criteria breakdown */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {r.criteria?.map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{c.name}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{c.score} / 10</span>
                    </div>
                  ))}
                </div>

                {r.comments && (
                  <p className="text-xs italic text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-dark-800/80 p-3 rounded-xl">
                    "{r.comments}"
                  </p>
                )}

                <div className="flex justify-between items-center pt-2 text-xs">
                  <span className="badge bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300 text-[10px]">
                    Status: {r.status}
                  </span>
                  {r.status !== 'Acknowledged' && user?._id === r.employeeId?.userId && (
                    <button
                      onClick={() => handleAcknowledge(r._id)}
                      className="btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1"
                    >
                      <FiCheck /> Acknowledge Review
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Performance Evaluation"
      >
        <form onSubmit={handleCreateReview} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Employee</label>
              <select
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="input text-xs"
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>{e.name} ({e.designation})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Review Cycle</label>
              <input
                type="text"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="label">Score Matrix (1 - 10)</label>
            {formData.criteria.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-600 dark:text-slate-300 flex-1">{c.name}</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={c.score}
                  onChange={(e) => {
                    const next = [...formData.criteria];
                    next[i].score = Number(e.target.value);
                    setFormData({ ...formData, criteria: next });
                  }}
                  className="input text-xs w-20 text-center py-1"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="label">Evaluator Comments & Career Feedback</label>
            <textarea
              rows={3}
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Submit Review
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReviewList;
