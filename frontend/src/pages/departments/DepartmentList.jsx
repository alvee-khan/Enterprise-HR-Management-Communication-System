import React, { useState, useEffect } from 'react';
import { departmentApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiLayers, FiPlus, FiEdit2, FiTrash2, FiUsers, FiDollarSign } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export const DepartmentList = () => {
  const { isHR } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    budget: 0,
    color: '#6366f1'
  });

  const fetchDepartments = async () => {
    try {
      const res = await departmentApi.getAll();
      setDepartments(res.data?.data || []);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAddModal = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '', description: '', budget: 0, color: '#6366f1' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (d) => {
    setEditingDept(d);
    setFormData({
      name: d.name,
      code: d.code || '',
      description: d.description || '',
      budget: d.budget || 0,
      color: d.color || '#6366f1'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await departmentApi.update(editingDept._id, formData);
        toast.success('Department updated');
      } else {
        await departmentApi.create(formData);
        toast.success('Department created');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await departmentApi.delete(id);
      toast.success('Department deleted');
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete department');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Departments & Teams
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize functional units, budgets, and operational hierarchy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/departments/org-chart"
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            🌳 Visual Org Chart
          </Link>
          {isHR() && (
            <button
              onClick={handleOpenAddModal}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              <FiPlus className="w-4 h-4" /> New Department
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading departmental structure..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => (
            <div
              key={dept._id}
              className="card p-6 border-t-4 hover:shadow-glow transition-all"
              style={{ borderTopColor: dept.color || '#6366f1' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge bg-slate-100 text-slate-600 dark:bg-dark-700 dark:text-slate-300 font-mono text-[10px]">
                    {dept.code || 'DEPT'}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                    {dept.name}
                  </h3>
                </div>
                {isHR() && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(dept)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                {dept.description || 'No departmental summary specified.'}
              </p>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <FiUsers className="text-slate-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {dept.employeeCount || 0} Members
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <FiDollarSign className="text-slate-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    ${dept.budget?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Update Department' : 'Create Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Department Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Engineering, Sales"
              className="input text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dept Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="ENG"
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Annual Budget ($)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                className="input text-xs"
              />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="input text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Save Department
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentList;
