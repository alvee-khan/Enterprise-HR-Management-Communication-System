import React, { useState, useEffect } from 'react';
import { employeeApi, departmentApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  FiUsers, FiPlus, FiSearch, FiFilter, FiEdit2,
  FiTrash2, FiEye, FiMail, FiPhone, FiCheck, FiX
} from 'react-icons/fi';

export const EmployeeList = () => {
  const { isHR } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewEmployee, setViewEmployee] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    department: '',
    designation: '',
    employmentType: 'Full-time',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: { basic: 5000, currency: 'USD' }
  });

  const fetchEmployees = async () => {
    try {
      const res = await employeeApi.getAll({
        search,
        department: selectedDept,
        status: selectedStatus,
      });
      setEmployees(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentApi.getAll();
      const list = res.data?.data || [];
      setDepartments(list);
      return list;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDept, selectedStatus]);

  const handleOpenAddModal = async () => {
    let currentDepts = departments;
    if (currentDepts.length === 0) {
      currentDepts = await fetchDepartments();
    }
    const defaultDept = currentDepts[0]?.id || currentDepts[0]?._id || '';

    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      gender: 'Male',
      department: defaultDept,
      departmentId: defaultDept,
      designation: '',
      employmentType: 'Full-time',
      joiningDate: new Date().toISOString().split('T')[0],
      salary: { basic: 5000, currency: 'USD' }
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    const deptId = emp.departmentId || emp.department?.id || emp.department?._id || emp.department || '';
    setFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      gender: emp.gender || 'Male',
      department: deptId,
      departmentId: deptId,
      designation: emp.designation || '',
      employmentType: emp.employmentType === 'FullTime' ? 'Full-time' : emp.employmentType === 'PartTime' ? 'Part-time' : (emp.employmentType || 'Full-time'),
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
      salary: { basic: emp.salary?.basic || 5000, currency: emp.salary?.currency || 'USD' }
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        departmentId: formData.departmentId || formData.department || null,
      };
      if (editingEmployee) {
        const empId = editingEmployee.id || editingEmployee._id;
        await employeeApi.update(empId, payload);
        toast.success('Employee profile updated');
      } else {
        await employeeApi.create(payload);
        toast.success('New employee onboarded!');
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to terminate/deactivate this employee?')) return;
    try {
      await employeeApi.delete(id);
      toast.success('Employee status changed to Terminated');
      fetchEmployees();
    } catch (err) {
      toast.error('Failed to terminate employee');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Employee Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage headcount, roles, compensation, and team members
          </p>
        </div>
        {isHR() && (
          <button
            onClick={handleOpenAddModal}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or title..."
            className="input pl-10 py-2 text-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="input py-2 text-xs w-full md:w-44"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input py-2 text-xs w-full md:w-36"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <div className="table-container card">
        {loading ? (
          <LoadingSpinner text="Fetching directory..." />
        ) : employees.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No employees found matching your criteria.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                        {emp.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-slate-900 dark:text-white">
                          {emp.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {emp.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{emp.employeeId}</td>
                  <td>
                    <span className="badge bg-slate-100 text-slate-700 dark:bg-dark-700 dark:text-slate-300">
                      {emp.department?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="text-xs">{emp.designation || 'N/A'}</td>
                  <td className="text-xs">{emp.employmentType === 'FullTime' ? 'Full-time' : emp.employmentType === 'PartTime' ? 'Part-time' : emp.employmentType}</td>
                  <td>
                    <span className={`badge ${emp.status === 'Active' ? 'status-active' : emp.status === 'On Leave' ? 'status-pending' : 'status-inactive'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewEmployee(emp)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700"
                        title="View Profile"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      {isHR() && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700"
                            title="Edit"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Terminate"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee ? 'Edit Employee Profile' : 'Onboard New Employee'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Work Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="input text-xs"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select
                value={formData.departmentId || formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value, departmentId: e.target.value })}
                className="input text-xs"
                required
              >
                <option value="">Select Department</option>
                {departments.map((d) => {
                  const val = d.id || d._id;
                  return (
                    <option key={val} value={val}>
                      {d.name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="label">Designation / Title</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="input text-xs"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="label">Basic Monthly Salary ($)</label>
              <input
                type="number"
                value={formData.salary?.basic}
                onChange={(e) => setFormData({ ...formData, salary: { ...formData.salary, basic: Number(e.target.value) } })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
            >
              {editingEmployee ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Profile Modal */}
      <Modal
        isOpen={!!viewEmployee}
        onClose={() => setViewEmployee(null)}
        title="Employee Dossier"
      >
        {viewEmployee && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold">
                {viewEmployee.name?.[0]}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {viewEmployee.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {viewEmployee.designation} • {viewEmployee.department?.name || 'Department'}
                </p>
                <span className="badge status-active text-[10px] mt-1">
                  ID: {viewEmployee.employeeId}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Work Email</p>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">{viewEmployee.email}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Phone</p>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">{viewEmployee.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Employment Type</p>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">{viewEmployee.employmentType}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Monthly Compensation</p>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">${viewEmployee.salary?.basic || 0} / month</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeList;
