import React, { useState, useEffect } from 'react';
import { recruitmentApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  FiBriefcase, FiPlus, FiUsers, FiAward,
  FiCheckCircle, FiFileText, FiUploadCloud, FiSearch
} from 'react-icons/fi';

export const JobList = () => {
  const { isHR } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'candidates'
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [screeningResult, setScreeningResult] = useState(null);

  // New Job Form State
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    requiredSkills: 'React, Node.js, MongoDB',
    experience: { min: 2, max: 5 },
    employmentType: 'Full-time',
    location: 'Remote',
    salary: { min: 60000, max: 90000, currency: 'USD' }
  });

  const fetchRecruitmentData = async () => {
    try {
      const [jobsRes, candidatesRes] = await Promise.all([
        recruitmentApi.getJobs(),
        recruitmentApi.getCandidates()
      ]);
      setJobs(jobsRes.data?.data || []);
      setCandidates(candidatesRes.data?.data || []);
    } catch {
      toast.error('Failed to load recruitment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...jobForm,
        requiredSkills: typeof jobForm.requiredSkills === 'string'
          ? jobForm.requiredSkills.split(',').map(s => s.trim())
          : jobForm.requiredSkills
      };
      await recruitmentApi.createJob(payload);
      toast.success('Job requisition posted!');
      setIsJobModalOpen(false);
      fetchRecruitmentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post job');
    }
  };

  const handleUploadResume = async (e) => {
    e.preventDefault();
    if (!resumeFile || !selectedCandidate) return;

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('candidateId', selectedCandidate._id);
    formData.append('jobId', selectedCandidate.jobId?._id || selectedCandidate.jobId);

    try {
      const res = await recruitmentApi.uploadResume(selectedCandidate._id, formData);
      setScreeningResult(res.data?.data?.scores);
      toast.success('Resume analyzed and scored!');
      fetchRecruitmentData();
    } catch (err) {
      toast.error('Resume screening failed');
    }
  };

  const handleUpdateStatus = async (candidateId, status) => {
    try {
      await recruitmentApi.updateStatus(candidateId, { status });
      toast.success(`Candidate pipeline moved to ${status}`);
      fetchRecruitmentData();
    } catch {
      toast.error('Failed to update pipeline');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ATS & Talent Acquisition
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Applicant tracking system with custom resume parser & matching engine
          </p>
        </div>
        {isHR() && (
          <button
            onClick={() => setIsJobModalOpen(true)}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <FiPlus className="w-4 h-4" /> Post New Job
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'jobs'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Open Requisitions ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'candidates'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Candidate Pipeline & Scores ({candidates.length})
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Analyzing candidate pipeline..." />
      ) : activeTab === 'jobs' ? (
        /* Jobs List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <div key={job._id} className="card p-6 flex flex-col justify-between hover:shadow-glow transition-all">
              <div>
                <div className="flex justify-between items-start">
                  <span className="badge status-active text-[10px]">
                    {job.status}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    ${job.salary?.min?.toLocaleString()} - ${job.salary?.max?.toLocaleString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                  {job.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {job.description}
                </p>

                {/* Skills Badges */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {job.requiredSkills?.map((s, idx) => (
                    <span key={idx} className="badge bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400 text-[10px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>{job.employmentType} • {job.location}</span>
                <span className="font-semibold text-primary-600 dark:text-primary-400">
                  {job.applicationCount || 0} applicants
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Candidates List with AI/Custom Scores */
        <div className="table-container card">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Target Requisition</th>
                <th>Experience</th>
                <th>Match Score</th>
                <th>Stage</th>
                <th className="text-right">Pipeline Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div>
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{c.email}</p>
                    </div>
                  </td>
                  <td className="text-xs">{c.jobId?.title || 'General'}</td>
                  <td className="text-xs">{c.experience || 0} yrs</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 dark:bg-dark-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            c.matchScore >= 80 ? 'bg-emerald-500' : c.matchScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${c.matchScore || 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-xs">{c.matchScore || 0}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-slate-300 text-xs">
                      {c.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedCandidate(c);
                          setIsResumeModalOpen(true);
                        }}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg text-xs flex items-center gap-1"
                        title="Upload & Screen Resume"
                      >
                        <FiUploadCloud className="w-3.5 h-3.5" /> Screen
                      </button>
                      <select
                        value={c.status}
                        onChange={(e) => handleUpdateStatus(c._id, e.target.value)}
                        className="input py-1 px-2 text-[11px] w-28"
                      >
                        <option value="Applied">Applied</option>
                        <option value="Screening">Screening</option>
                        <option value="Interview">Interview</option>
                        <option value="Selected">Selected</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Post Job Modal */}
      <Modal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        title="Create Job Requisition"
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div>
            <label className="label">Job Title</label>
            <input
              type="text"
              required
              value={jobForm.title}
              onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
              placeholder="e.g. Senior Backend Engineer"
              className="input text-xs"
            />
          </div>
          <div>
            <label className="label">Required Skills (comma separated)</label>
            <input
              type="text"
              required
              value={jobForm.requiredSkills}
              onChange={(e) => setJobForm({ ...jobForm, requiredSkills: e.target.value })}
              placeholder="React, Node.js, TypeScript, Docker"
              className="input text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Employment Type</label>
              <select
                value={jobForm.employmentType}
                onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                className="input text-xs"
              >
                <option value="Full-time">Full-time</option>
                <option value="Contract">Contract</option>
                <option value="Part-time">Part-time</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
            <div>
              <label className="label">Work Location</label>
              <input
                type="text"
                value={jobForm.location}
                onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                placeholder="San Francisco / Remote"
                className="input text-xs"
              />
            </div>
          </div>
          <div>
            <label className="label">Job Description & Deliverables</label>
            <textarea
              required
              rows={3}
              value={jobForm.description}
              onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
              className="input text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setIsJobModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Post Requisition
            </button>
          </div>
        </form>
      </Modal>

      {/* Resume Screening Engine Modal */}
      <Modal
        isOpen={isResumeModalOpen}
        onClose={() => {
          setIsResumeModalOpen(false);
          setScreeningResult(null);
          setResumeFile(null);
        }}
        title={`Custom Resume Match Engine: ${selectedCandidate?.name || ''}`}
      >
        <div className="space-y-4">
          <form onSubmit={handleUploadResume} className="space-y-3">
            <div>
              <label className="label">Select PDF or DOCX Resume</label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setResumeFile(e.target.files[0])}
                className="input text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-primary-50 file:text-primary-700"
              />
            </div>
            <button
              type="submit"
              disabled={!resumeFile}
              className="btn-primary w-full text-xs py-2"
            >
              🚀 Run Screening Algorithm
            </button>
          </form>

          {/* Scoring Visualizer */}
          {screeningResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-sm">Overall Match Score</span>
                <span className="text-xl font-extrabold text-primary-600 dark:text-primary-400">
                  {screeningResult.overallScore}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-white dark:bg-dark-800 rounded-lg">
                  <p className="text-[10px] text-slate-400">Skills (50%)</p>
                  <p className="font-bold mt-0.5">{screeningResult.skillMatchScore}%</p>
                </div>
                <div className="p-2 bg-white dark:bg-dark-800 rounded-lg">
                  <p className="text-[10px] text-slate-400">Experience (30%)</p>
                  <p className="font-bold mt-0.5">{screeningResult.experienceScore}%</p>
                </div>
                <div className="p-2 bg-white dark:bg-dark-800 rounded-lg">
                  <p className="text-[10px] text-slate-400">Education (20%)</p>
                  <p className="font-bold mt-0.5">{screeningResult.educationScore}%</p>
                </div>
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-600 dark:text-slate-300">Detected Skills:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {screeningResult.skillsMatched?.map((s, idx) => (
                    <span key={idx} className="badge bg-emerald-100 text-emerald-700 text-[10px]">
                      ✓ {s}
                    </span>
                  ))}
                  {screeningResult.skillsMissing?.map((s, idx) => (
                    <span key={idx} className="badge bg-rose-100 text-rose-700 text-[10px]">
                      ✗ {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default JobList;
