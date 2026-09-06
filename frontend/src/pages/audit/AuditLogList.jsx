import React, { useState, useEffect } from 'react';
import { auditApi } from '../../api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiShield, FiClock, FiActivity } from 'react-icons/fi';
import moment from 'moment';

export const AuditLogList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await auditApi.getAll();
        setLogs(res.data?.data || []);
      } catch {
        toast.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          System Security & Audit Trail
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Immutable event ledger tracking logins, permission changes, payroll runs, and data edits
        </p>
      </div>

      <div className="table-container card">
        {loading ? (
          <LoadingSpinner text="Decrypting security audit ledger..." />
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No audit records captured yet.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity Affected</th>
                <th>Description</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id}>
                  <td className="font-semibold text-xs text-slate-900 dark:text-white">
                    {l.userId?.name || 'System / Guest'}
                  </td>
                  <td>
                    <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 font-mono text-[10px]">
                      {l.action}
                    </span>
                  </td>
                  <td className="text-xs">{l.entity}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300 max-w-sm truncate">
                    {l.description}
                  </td>
                  <td className="text-xs font-mono text-slate-400">{l.ipAddress || '127.0.0.1'}</td>
                  <td className="text-xs text-slate-400">
                    {moment(l.createdAt).format('DD MMM YYYY, hh:mm:ss A')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditLogList;
