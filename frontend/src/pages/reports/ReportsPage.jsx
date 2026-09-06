import React, { useState } from 'react';
import { reportApi } from '../../api';
import toast from 'react-hot-toast';
import { FiDownload, FiFileText, FiBarChart2 } from 'react-icons/fi';

export const ReportsPage = () => {
  const [loadingType, setLoadingType] = useState(null);

  const handleExportExcel = async (type) => {
    setLoadingType(`excel-${type}`);
    try {
      const res = await reportApi.exportExcel(type);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${type} Excel report exported!`);
    } catch {
      toast.error('Failed to export Excel report');
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportPDF = async (type) => {
    setLoadingType(`pdf-${type}`);
    try {
      const res = await reportApi.exportPDF(type);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${type} PDF report generated!`);
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setLoadingType(null);
    }
  };

  const reports = [
    { title: 'Employee Directory & Headcount', type: 'employees', desc: 'Full roster of active and terminated team members with IDs, titles, and dates' },
    { title: 'Payroll & Compensation Run', type: 'payroll', desc: 'Disbursement amounts, tax withholdings, allowances, and bonuses breakdown' },
    { title: 'Monthly Attendance Logs', type: 'attendance', desc: 'Punctuality records, working hours totals, and check-in timestamp audits' },
    { title: 'Leave & Absence Utilization', type: 'leaves', desc: 'Annual balance deductions, leave categories, and manager sign-off logs' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Executive Reports & Exports
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Generate audit-compliant workbooks in Excel XLSX and PDF format
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reports.map((r, i) => (
          <div key={i} className="card p-6 flex flex-col justify-between space-y-4 hover:shadow-glow transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xl mb-3">
                <FiBarChart2 />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {r.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {r.desc}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleExportExcel(r.type)}
                disabled={loadingType === `excel-${r.type}`}
                className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5 py-2"
              >
                <FiDownload /> {loadingType === `excel-${r.type}` ? 'Exporting...' : 'Excel (.xlsx)'}
              </button>
              <button
                onClick={() => handleExportPDF(r.type)}
                disabled={loadingType === `pdf-${r.type}`}
                className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5 py-2"
              >
                <FiFileText /> {loadingType === `pdf-${r.type}` ? 'Generating...' : 'PDF Document'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
