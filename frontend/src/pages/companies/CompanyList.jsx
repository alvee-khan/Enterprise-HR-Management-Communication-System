import React, { useState, useEffect } from 'react';
import { companyApi } from '../../api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiBriefcase, FiPlus, FiGlobe, FiUsers, FiMail } from 'react-icons/fi';

export const CompanyList = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    industry: 'Software & Cloud',
    size: '51-200',
    website: 'https://'
  });

  const fetchCompanies = async () => {
    try {
      const res = await companyApi.getAll();
      setCompanies(res.data?.data || []);
    } catch {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await companyApi.create(formData);
      toast.success('New company tenant provisioned!');
      setIsModalOpen(false);
      fetchCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create company');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            SaaS Multi-Company Fleet
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage client tenant organizations, plan limits, and global system accounts
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 text-xs"
        >
          <FiPlus className="w-4 h-4" /> Provision New Company
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Scanning company tenants..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((c) => (
            <div key={c._id} className="card p-6 space-y-4 hover:shadow-glow transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge status-active text-[10px]">
                    {c.subscription?.plan || 'Enterprise'}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                    {c.name}
                  </h3>
                  <p className="text-xs text-slate-400">{c.industry || 'Technology'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {c.name?.[0]}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FiMail className="w-3.5 h-3.5" /> <span>{c.email}</span>
                </div>
                {c.website && (
                  <div className="flex items-center gap-2">
                    <FiGlobe className="w-3.5 h-3.5" /> <span>{c.website}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FiUsers className="w-3.5 h-3.5" /> <span>Size: {c.size} employees</span>
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
        title="Provision Company Tenant"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Company Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Official Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Provision
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CompanyList;
