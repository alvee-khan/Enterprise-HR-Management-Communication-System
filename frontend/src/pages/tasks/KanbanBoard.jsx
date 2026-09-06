import React, { useState, useEffect } from 'react';
import { taskApi, employeeApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  FiCheckSquare, FiPlus, FiList, FiGrid,
  FiClock, FiAlertCircle, FiTrash2, FiUser
} from 'react-icons/fi';
import moment from 'moment';

export const KanbanBoard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState({
    'Todo': [],
    'In Progress': [],
    'Review': [],
    'Completed': []
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'Medium',
    status: 'Todo',
    deadline: moment().add(3, 'days').format('YYYY-MM-DD')
  });

  const fetchTasks = async () => {
    try {
      const [kanbanRes, empRes] = await Promise.all([
        taskApi.getKanban(),
        employeeApi.getAll()
      ]);
      setTasks(kanbanRes.data?.data || { 'Todo': [], 'In Progress': [], 'Review': [], 'Completed': [] });
      setEmployees(empRes.data?.data || []);
    } catch {
      toast.error('Failed to load Kanban tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await taskApi.create(newTask);
      toast.success('Task added to board!');
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskApi.updateStatus(taskId, { status: newStatus });
      toast.success(`Task moved to ${newStatus}`);
      fetchTasks();
    } catch {
      toast.error('Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await taskApi.delete(taskId);
      toast.success('Task removed');
      fetchTasks();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const COLUMNS = ['Todo', 'In Progress', 'Review', 'Completed'];
  const COLUMN_COLORS = {
    'Todo': 'border-t-slate-400',
    'In Progress': 'border-t-primary-500',
    'Review': 'border-t-amber-500',
    'Completed': 'border-t-emerald-500'
  };

  if (loading) return <LoadingSpinner text="Rendering Kanban workflow..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sprint & Kanban Workflow
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Drag, assign, and track deliverable milestones across all teams
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 text-xs"
        >
          <FiPlus className="w-4 h-4" /> Create Task
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {COLUMNS.map((col) => {
          const items = tasks[col] || [];
          return (
            <div
              key={col}
              className={`card p-4 border-t-4 ${COLUMN_COLORS[col]} bg-slate-50/50 dark:bg-dark-900/50 min-h-[500px] flex flex-col`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {col}
                </h3>
                <span className="badge bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                  {items.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="space-y-3 flex-1">
                {items.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    Empty Column
                  </div>
                ) : (
                  items.map((t) => (
                    <div
                      key={t._id}
                      className="card p-4 bg-white dark:bg-dark-800 shadow-sm border border-slate-100 dark:border-slate-700/60 hover:shadow-md transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`badge ${
                          t.priority === 'Urgent' ? 'priority-urgent' : t.priority === 'High' ? 'priority-high' : 'priority-medium'
                        } text-[10px]`}>
                          {t.priority}
                        </span>
                        <button
                          onClick={() => handleDeleteTask(t._id)}
                          className="text-slate-300 hover:text-rose-500 p-1"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                        {t.title}
                      </h4>

                      {t.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <FiUser className="w-3 h-3" />
                          <span className="truncate max-w-[80px] font-medium text-slate-600 dark:text-slate-300">
                            {t.assigneeId?.name || 'Unassigned'}
                          </span>
                        </div>
                        {t.deadline && (
                          <div className="flex items-center gap-1 text-[10px]">
                            <FiClock className="w-3 h-3" />
                            <span>{moment(t.deadline).format('DD MMM')}</span>
                          </div>
                        )}
                      </div>

                      {/* Quick move dropdown */}
                      <div className="pt-1">
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t._id, e.target.value)}
                          className="w-full text-[10px] py-1 px-2 bg-slate-50 dark:bg-dark-700 border border-slate-200 dark:border-slate-600 rounded-lg"
                        >
                          <option value="Todo">Move to: Todo</option>
                          <option value="In Progress">Move to: In Progress</option>
                          <option value="Review">Move to: Review</option>
                          <option value="Completed">Move to: Completed</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Sprint Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="label">Task Title</label>
            <input
              type="text"
              required
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g. Implement OAuth Flow"
              className="input text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assignee</label>
              <select
                value={newTask.assigneeId}
                onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                className="input text-xs"
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>{e.name} ({e.designation || 'Staff'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="input text-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Due Deadline</label>
            <input
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              className="input text-xs"
            />
          </div>
          <div>
            <label className="label">Description / Acceptance Criteria</label>
            <textarea
              rows={3}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="input text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Add Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default KanbanBoard;
