import React, { useState, useEffect } from 'react';
import { skillApi, departmentApi } from '../../api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiCpu, FiUser } from 'react-icons/fi';

export const SkillMatrix = () => {
  const [data, setData] = useState({ employees: [], skillMap: {} });
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMatrix = async () => {
    try {
      const [matrixRes, deptRes] = await Promise.all([
        skillApi.getMatrix({ departmentId: selectedDept }),
        departmentApi.getAll()
      ]);
      setData(matrixRes.data?.data || { employees: [], skillMap: {} });
      setDepartments(deptRes.data?.data || []);
    } catch {
      toast.error('Failed to load skill matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [selectedDept]);

  if (loading) return <LoadingSpinner text="Computing talent capability matrix..." />;

  const skillEntries = Object.entries(data.skillMap || {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Workforce Skill Matrix & Radar
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Identify organizational proficiencies, technical depth, and skill gaps
          </p>
        </div>
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="input py-2 text-xs w-52"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {skillEntries.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-xs col-span-3">
            No employee skills cataloged for this selection.
          </div>
        ) : (
          skillEntries.map(([skillName, practitioners], idx) => (
            <div key={idx} className="card p-5 space-y-3 hover:shadow-glow transition-all">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FiCpu className="text-primary-500" /> {skillName}
                </span>
                <span className="badge bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400 text-[10px]">
                  {practitioners.length} member(s)
                </span>
              </div>

              <div className="space-y-2">
                {practitioners.map((p, pIdx) => (
                  <div key={pIdx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{p.employee}</span>
                      <span className="font-bold text-primary-600 dark:text-primary-400">{p.level}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-dark-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-600"
                        style={{ width: `${p.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SkillMatrix;
