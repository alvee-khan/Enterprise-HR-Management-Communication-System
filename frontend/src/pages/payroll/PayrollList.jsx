import React, { useState, useEffect } from 'react';
import { payrollApi, employeeApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiDollarSign, FiPlus, FiCheckCircle, FiFileText, FiDownload } from 'react-icons/fi';
import moment from 'moment';

export const PayrollList = () => {
  const { user, isHR } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    month: moment().month() + 1,
    year: moment().year(),
    allowances: [{ name: 'Transport & Internet', amount: 200 }],
    bonuses: [{ name: 'Sprint Bonus', amount: 300, reason: 'Q2 Performance' }],
    deductions: [{ name: 'Tax / Insurance', amount: 150, reason: 'Health & Tax' }],
    tax: 250,
    workingDays: 22,
    presentDays: 22
  });

  const fetchPayrolls = async () => {
    try {
      const [payRes, empRes] = await Promise.all([
        payrollApi.getAll(),
        employeeApi.getAll()
      ]);
      setPayrolls(payRes.data?.data || []);
      setEmployees(empRes.data?.data || []);
    } catch {
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    try {
      await payrollApi.generate(formData);
      toast.success('Salary generated and slip created!');
      setIsModalOpen(false);
      fetchPayrolls();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate payroll');
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await payrollApi.markPaid(id, { paymentMethod: 'Bank Transfer' });
      toast.success('Salary marked as Paid!');
      fetchPayrolls();
    } catch {
      toast.error('Failed to update payment status');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Payroll & Compensation Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Salary disbursement, bonus allowances, deductions, and downloadable pay slips
          </p>
        </div>
        {isHR() && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <FiPlus className="w-4 h-4" /> Process Salary Run
          </button>
        )}
      </div>

      {/* Payroll Table */}
      <div className="table-container card">
        {loading ? (
          <LoadingSpinner text="Computing compensation records..." />
        ) : payrolls.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No salary records logged yet.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th>Basic Salary</th>
                <th>Bonuses</th>
                <th>Deductions</th>
                <th>Net Payout</th>
                <th>Status</th>
                <th className="text-right">Pay Slip</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p) => (
                <tr key={p._id}>
                  <td className="font-semibold text-xs text-slate-900 dark:text-white">
                    {p.employeeId?.name || user?.name}
                  </td>
                  <td className="text-xs font-mono">
                    {p.month}/{p.year}
                  </td>
                  <td className="text-xs font-mono">৳{p.basicSalary?.toLocaleString()}</td>
                  <td className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    +৳{p.totalBonuses?.toLocaleString() || 0}
                  </td>
                  <td className="text-xs font-mono text-rose-500">
                    -৳{p.totalDeductions?.toLocaleString() || 0}
                  </td>
                  <td className="text-xs font-bold font-mono text-primary-600 dark:text-primary-400">
                    ৳{p.netSalary?.toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${p.status === 'Paid' ? 'status-active' : 'status-pending'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedSlip(p)}
                        className="btn-secondary text-[11px] py-1 px-2 flex items-center gap-1"
                      >
                        <FiFileText /> View Slip
                      </button>
                      {isHR() && p.status !== 'Paid' && (
                        <button
                          onClick={() => handleMarkPaid(p._id)}
                          className="btn-success text-[11px] py-1 px-2 flex items-center gap-1"
                        >
                          <FiCheckCircle /> Mark Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Salary Slip Modal */}
      <Modal
        isOpen={!!selectedSlip}
        onClose={() => setSelectedSlip(null)}
        title="Official Salary Statement"
      >
        {selectedSlip && (
          <div className="space-y-6 p-2 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">DigiBangla Solutions Ltd.</h4>
                <p className="text-slate-400">Monthly Compensation Voucher (BEFTN Disbursed)</p>
              </div>
              <div className="text-right">
                <span className="badge status-active">{selectedSlip.status}</span>
                <p className="text-slate-400 mt-1">Period: {selectedSlip.month}/{selectedSlip.year}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 font-medium">Employee Name</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedSlip.employeeId?.name || user?.name}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Payment Mode</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedSlip.paymentMethod || 'BEFTN Direct Bank Transfer'}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-dark-900 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Basic Salary</span>
                <span className="font-semibold">৳{selectedSlip.basicSalary?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Bonuses & Allowances</span>
                <span className="font-semibold">+৳{(selectedSlip.totalBonuses + (selectedSlip.totalAllowances || 0))?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span>Deductions & Tax (PF / Withholding)</span>
                <span className="font-semibold">-৳{selectedSlip.totalDeductions?.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-extrabold text-sm text-slate-900 dark:text-white">
                <span>Net Credited Salary</span>
                <span className="text-primary-600 dark:text-primary-400">৳{selectedSlip.netSalary?.toLocaleString()} BDT</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => window.print()} className="btn-secondary flex items-center gap-1 text-xs">
                <FiDownload /> Print / Download Voucher
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Generate Salary Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Run Employee Payroll"
      >
        <form onSubmit={handleGeneratePayroll} className="space-y-4">
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
                <option key={e._id} value={e._id}>{e.name} (Basic: ৳{e.salary?.basic?.toLocaleString() || '50,000'})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Month</label>
              <input
                type="number"
                min={1}
                max={12}
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Generate & Disburse
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PayrollList;
