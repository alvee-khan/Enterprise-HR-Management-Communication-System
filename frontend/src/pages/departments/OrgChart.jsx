import React, { useState, useEffect } from 'react';
import { departmentApi } from '../../api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { FiUsers, FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export const OrgChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const res = await departmentApi.getOrgChart();
        setData(res.data?.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchChart();
  }, []);

  if (loading) return <LoadingSpinner text="Rendering Organization Chart..." />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/departments" className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 mb-2">
            <FiArrowLeft /> Back to departments
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Organization Hierarchy
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visual structural breakdown across departments and team members
          </p>
        </div>
      </div>

      {/* Org Tree */}
      <div className="space-y-8">
        {data.map((dept) => (
          <div key={dept._id} className="card p-6 border-l-4" style={{ borderLeftColor: dept.color || '#6366f1' }}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {dept.name} Department
                </h3>
                <p className="text-xs text-slate-400">
                  Manager: <span className="text-slate-700 dark:text-slate-300 font-semibold">{dept.managerId?.name || 'Unassigned'}</span>
                </p>
              </div>
              <span className="badge bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400">
                {dept.employees?.length || 0} Members
              </span>
            </div>

            {/* Employee Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {dept.employees?.map((emp) => (
                <div
                  key={emp._id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-800/60 border border-slate-100 dark:border-slate-700/50 flex items-center gap-3 hover:scale-102 transition-transform"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {emp.name?.[0]}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {emp.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {emp.designation || 'Team Member'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrgChart;
