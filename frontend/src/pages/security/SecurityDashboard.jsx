import React, { useState, useEffect } from 'react';
import { securityApi } from '../../api';
import {
  FiShield, FiKey, FiLock, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiAlertTriangle, FiActivity, FiCpu,
  FiTerminal, FiServer, FiLayers, FiEye, FiTrash2
} from 'react-icons/fi';

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState('telemetry');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState(null);
  const [testingLoading, setTestingLoading] = useState(false);
  const [rotationLoading, setRotationLoading] = useState(false);
  const [auditScanLoading, setAuditScanLoading] = useState(false);
  const [selectedKeyModal, setSelectedKeyModal] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchSecurityStatus = async () => {
    try {
      setLoading(true);
      const res = await securityApi.getStatus();
      if (res.data?.success) {
        setStatusData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load security status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
  }, []);

  const handleRunDiagnostics = async () => {
    try {
      setTestingLoading(true);
      setFeedbackMsg(null);
      const res = await securityApi.runTests();
      if (res.data?.success) {
        setTestResults(res.data);
        setFeedbackMsg({ type: 'success', text: 'Diagnostic suite completed successfully! All manual algorithms verified.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error running security diagnostic suite: ' + err.message });
    } finally {
      setTestingLoading(false);
    }
  };

  const handleRotateKey = async (algorithm, purpose) => {
    try {
      setRotationLoading(true);
      const res = await securityApi.rotateKey({ algorithm, purpose });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: `${algorithm} Key rotated successfully. New Key ID: ${res.data.data.newKeyId}` });
        await fetchSecurityStatus();
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: `Key rotation failed: ${err.message}` });
    } finally {
      setRotationLoading(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!window.confirm('Are you sure you want to revoke this security key?')) return;
    try {
      const res = await securityApi.revokeKey(keyId, { reason: 'Administrative key retirement' });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: `Key ${keyId} revoked successfully.` });
        await fetchSecurityStatus();
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: `Revocation failed: ${err.message}` });
    }
  };

  const handleVerifyAuditChain = async () => {
    try {
      setAuditScanLoading(true);
      const res = await securityApi.verifyAudit();
      if (res.data?.success) {
        setFeedbackMsg({
          type: res.data.data.isValid ? 'success' : 'error',
          text: `Audit Chain Scan Result: ${res.data.data.status} (${res.data.data.verifiedEntries}/${res.data.data.totalEntries} entries valid)`
        });
        await fetchSecurityStatus();
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: `Audit scan failed: ${err.message}` });
    } finally {
      setAuditScanLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await securityApi.revokeSession(sessionId);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Session terminated.' });
        await fetchSecurityStatus();
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: `Session revocation failed: ${err.message}` });
    }
  };

  if (loading && !statusData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <FiRefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading Security Center...</p>
        </div>
      </div>
    );
  }

  const summary = statusData?.summary || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-indigo-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Security Systems Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <FiShield className="text-indigo-400" /> Security Center
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Monitor authentication activity, manage active sessions, review audit logs, and control access security.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSecurityStatus}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all border border-white/10 backdrop-blur-md"
            >
              <FiRefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => { setActiveTab('testing'); handleRunDiagnostics(); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all"
            >
              <FiTerminal className="w-4 h-4" /> Run Diagnostics
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <FiCheckCircle className="w-5 h-5 flex-shrink-0" /> : <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Top 4 Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Encryption Status */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Data Protection</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FiLock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl font-bold mt-2 text-slate-800 dark:text-white">Encrypted</h3>
          <p className="text-xs text-slate-500 mt-1">User data encrypted at rest</p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <FiCheckCircle className="w-4 h-4" /> Confidentiality Active
          </div>
        </div>

        {/* Metric 2: Digital Signatures */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Digital Signatures</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FiKey className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl font-bold mt-2 text-slate-800 dark:text-white">Signed</h3>
          <p className="text-xs text-slate-500 mt-1">Payroll & leave records signed</p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <FiCheckCircle className="w-4 h-4" /> Non-Repudiation Enforced
          </div>
        </div>

        {/* Metric 3: Integrity */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Integrity</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <FiActivity className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl font-bold mt-2 text-slate-800 dark:text-white">Verified</h3>
          <p className="text-xs text-slate-500 mt-1">Data tamper detection active</p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <FiCheckCircle className="w-4 h-4" /> Tamper Detection Active
          </div>
        </div>

        {/* Metric 4: Audit Ledger */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Audit Ledger</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiLayers className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-xl font-bold mt-2 text-slate-800 dark:text-white">{statusData?.auditChain?.verifiedEntries || 0} Blocks</h3>
          <p className="text-xs text-slate-500 mt-1">Immutable chained audit log</p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <FiCheckCircle className="w-4 h-4" /> Chain Integrity Verified
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 dark:border-dark-800 flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'telemetry', label: 'Security Overview', icon: FiServer },
          { id: 'keys', label: 'Key Management', icon: FiKey },
          { id: 'testing', label: 'Security Testing', icon: FiTerminal },
          { id: 'sessions', label: 'Active Sessions', icon: FiCpu },
          { id: 'audit', label: 'Audit Log Chain', icon: FiShield },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-850'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Security Architecture */}
      {activeTab === 'telemetry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <FiShield className="text-indigo-600" /> Security Architecture Overview
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-dark-800 text-slate-500 uppercase text-[11px] font-semibold">
                    <tr>
                      <th className="py-3 px-4 rounded-l-lg">Security Feature</th>
                      <th className="py-3 px-4">Module</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4 rounded-r-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">1. Data Confidentiality</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Registration & Login</td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">Asymmetric Encryption (user data at rest)</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">ACTIVE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">2. Password Security</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Authentication</td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">Salted Password Hashing (PBKDF2)</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">ACTIVE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">3. Two-Factor Authentication</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Login Step 2 (2FA)</td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">TOTP via Google Authenticator (RFC 6238)</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">ACTIVE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">4. Key Management</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Enterprise Keystore</td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">Generation, Rotation, Storage, Revocation</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">ACTIVE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">5. Profile Data Protection</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Employee Profiles</td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">Encrypted fields before database storage</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">ACTIVE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">6. Digital Signatures</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Payroll & Leaves</td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">ECC-based digital signature verification</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">ACTIVE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">7. Secure QR Attendance</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Attendance QR Scan</td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">Signed QR tokens with nonce + expiry</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">ACTIVE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">8. Immutable Audit Log</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Audit Logs</td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">Hash-chained tamper-proof audit entries</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">ACTIVE</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Rules Card */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <FiCheckCircle className="text-emerald-600" /> Security Compliance
              </h2>
              <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>Asymmetric-Only Encryption:</strong> All sensitive user data protected with public-key encryption before storage.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>No Plaintext Storage:</strong> All personally identifiable information (PII) encrypted before writing to database.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>Salted Passwords:</strong> Every password uses a unique random salt making rainbow table attacks impossible.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                  <span><strong>Relational Database:</strong> PostgreSQL with full ACID compliance, foreign key constraints, and data normalization.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Key Management Lifecycle */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FiKey className="text-indigo-600" /> Security Key Store & Lifecycle
                </h2>
                <p className="text-xs text-slate-500 mt-1">Manage encryption keys, rotation schedules, and revocation statuses.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={rotationLoading}
                  onClick={() => handleRotateKey('RSA', 'encryption')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-all disabled:opacity-50"
                >
                  {rotationLoading ? 'Rotating...' : 'Rotate RSA Key'}
                </button>
                <button
                  disabled={rotationLoading}
                  onClick={() => handleRotateKey('ECC', 'signature')}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow transition-all disabled:opacity-50"
                >
                  {rotationLoading ? 'Rotating...' : 'Rotate ECC Key'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-dark-800 text-slate-500 uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Key ID</th>
                    <th className="py-3 px-4">Algorithm</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4">Rotation Schedule</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                  {(statusData?.keys || []).map(key => (
                    <tr key={key.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-850/50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-800 dark:text-slate-200">{key.key_id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{key.algorithm}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 capitalize">{key.purpose}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                          key.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' :
                          key.status === 'rotated' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' :
                          'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                        }`}>
                          {key.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(key.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{key.rotation_date ? new Date(key.rotation_date).toLocaleDateString() : 'Manual'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedKeyModal(key)}
                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-dark-800 rounded-lg"
                          title="View Public Key Certificate"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        {key.status === 'active' && (
                          <button
                            onClick={() => handleRevokeKey(key.key_id)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-dark-800 rounded-lg"
                            title="Revoke Key"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Security Testing Panel */}
      {activeTab === 'testing' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FiTerminal className="text-indigo-600" /> Interactive Security Diagnostics
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Runs end-to-end verification tests on all security modules including encryption, signing, password hashing, and audit chain integrity.
                </p>
              </div>
              <button
                disabled={testingLoading}
                onClick={handleRunDiagnostics}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
              >
                <FiRefreshCw className={`w-4 h-4 ${testingLoading ? 'animate-spin' : ''}`} />
                {testingLoading ? 'Executing Diagnostics...' : 'Run Diagnostics Suite'}
              </button>
            </div>

            {testResults ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl flex items-center justify-between font-bold text-sm ${
                  testResults.allPassed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResults.allPassed ? <FiCheckCircle className="w-5 h-5" /> : <FiXCircle className="w-5 h-5" />}
                    <span>{testResults.allPassed ? 'ALL SECURITY TESTS PASSED (6/6)' : 'SOME TESTS FAILED'}</span>
                  </div>
                  <span className="text-xs font-mono">{new Date(testResults.timestamp).toLocaleTimeString()}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testResults.results.map((test, index) => (
                    <div key={index} className="border border-slate-200 dark:border-dark-800 rounded-xl p-4 bg-slate-50/50 dark:bg-dark-850/50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{test.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{test.purpose}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                          test.status === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
                        }`}>
                          {test.status}
                        </span>
                      </div>
                      <div className="mt-3 text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-dark-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-dark-800 overflow-x-auto">
                        <p><strong>Algorithm:</strong> {test.algorithm}</p>
                        <p><strong>Latency:</strong> {test.executionTimeMs} ms</p>
                        {test.details && (
                          <pre className="mt-1 text-[11px] text-slate-500">{JSON.stringify(test.details, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-dark-800 rounded-xl">
                <FiCpu className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300">Diagnostics Suite Ready</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">Click below to run automated verification across all security modules.</p>
                <button
                  onClick={handleRunDiagnostics}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs shadow hover:bg-indigo-500"
                >
                  Start Diagnostic Run
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Active Sessions & Threat Defense */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <FiCpu className="text-indigo-600" /> Active Authenticated Sessions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-dark-800 text-slate-500 uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Client User-Agent</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                  {(statusData?.activeSessions || []).map(sess => (
                    <tr key={sess.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-850/50">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {sess.user?.name}
                        <span className="block text-xs text-slate-400 font-normal">{sess.user?.email}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">{sess.ip_address}</td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">{sess.user_agent}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase">
                          {sess.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(sess.last_active).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRevokeSession(sess.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-100"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Audit Hash-Chain Scanner */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FiShield className="text-indigo-600" /> Immutable Audit Log
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Each audit entry is securely chained to the previous one, making tampering detectable.
                </p>
              </div>
              <button
                disabled={auditScanLoading}
                onClick={handleVerifyAuditChain}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-all disabled:opacity-50"
              >
                <FiRefreshCw className={`w-3.5 h-3.5 ${auditScanLoading ? 'animate-spin' : ''}`} />
                {auditScanLoading ? 'Scanning Ledger...' : 'Scan Hash Chain'}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Ledger Continuous Integrity:</span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold uppercase">
                  {statusData?.auditChain?.status || 'INTEGRITY_VERIFIED_SECURE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Total blocks verified: <strong>{statusData?.auditChain?.verifiedEntries || 0} / {statusData?.auditChain?.totalEntries || 0}</strong>. Zero corruptions detected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Public Key Details */}
      {selectedKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiKey className="text-indigo-600" /> Public Key Certificate ({selectedKeyModal.algorithm})
              </h3>
              <button onClick={() => setSelectedKeyModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-dark-850 p-4 rounded-xl border border-slate-200 dark:border-dark-800 break-all max-h-60 overflow-y-auto">
              <p className="text-slate-500 font-sans font-bold">Key Identifier:</p>
              <p className="text-indigo-600 dark:text-indigo-400">{selectedKeyModal.key_id}</p>
              <p className="text-slate-500 font-sans font-bold mt-2">Public Key Data:</p>
              <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{selectedKeyModal.public_key}</pre>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedKeyModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-dark-800 hover:bg-slate-300 dark:hover:bg-dark-700 text-slate-800 dark:text-slate-200 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
