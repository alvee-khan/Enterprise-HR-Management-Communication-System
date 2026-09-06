import React, { useState, useEffect } from 'react';
import { documentApi } from '../../api';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiFolder, FiPlus, FiFile, FiTrash2, FiDownload, FiPaperclip } from 'react-icons/fi';

export const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Contract',
    description: ''
  });

  const fetchDocuments = async () => {
    try {
      const res = await documentApi.getAll();
      setDocuments(res.data?.data || []);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    const data = new FormData();
    data.append('document', file);
    data.append('name', formData.name);
    data.append('type', formData.type);
    data.append('description', formData.description);

    try {
      await documentApi.upload(data);
      toast.success('Document uploaded securely!');
      setIsModalOpen(false);
      fetchDocuments();
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete document?')) return;
    try {
      await documentApi.delete(id);
      toast.success('Document removed');
      fetchDocuments();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Document Repository & Vault
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Store employment contracts, certifications, policy handbooks, and identity records
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 text-xs"
        >
          <FiPlus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Accessing document vault..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.length === 0 ? (
            <div className="card p-8 text-center text-slate-400 text-xs col-span-3">
              No files currently stored.
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc._id} className="card p-5 space-y-3 hover:shadow-glow transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xl">
                    <FiFile />
                  </div>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="text-slate-300 hover:text-rose-500 p-1"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {doc.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {doc.type} • {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'File'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Uploaded by {doc.uploadedBy?.name || 'Staff'}
                  </span>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-[11px] py-1 px-2 flex items-center gap-1"
                  >
                    <FiDownload /> View
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Document"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="label">Document Title</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Non-Disclosure Agreement 2024"
              className="input text-xs"
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input text-xs"
            >
              <option value="Contract">Contract</option>
              <option value="Certificate">Certificate</option>
              <option value="Resume">Resume</option>
              <option value="ID">ID & Passport</option>
              <option value="Salary Slip">Salary Slip</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Select File</label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files[0])}
              className="input text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-primary-50 file:text-primary-700"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              Upload
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentList;
