import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiLock, FiBriefcase, FiArrowRight, FiShield, FiKey, FiCheckCircle } from 'react-icons/fi';

export const Register = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  // After registration, backend returns 2FA setup data
  const [twoFASetup, setTwoFASetup] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // Direct registration call with companyName: backend creates company & companyAdmin together
      const regRes = await authApi.register({
        companyName: formData.companyName,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'companyAdmin',
      });

      toast.success('Account created! Please scan the QR code to set up Google Authenticator.');
      // Store the 2FA setup payload returned by register endpoint
      setTwoFASetup(regRes.data?.data?.twoFactor || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Immediate verification from the QR setup view so the user can log in instantly
  const handleVerifyAndLogin = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter the 6-digit code from Google Authenticator');
      return;
    }
    setVerifying(true);
    try {
      await login(formData.email, formData.password, verificationCode);
      toast.success('Registration and two-factor authentication complete! Welcome!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid 6-digit code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // ── Step 2: Show 2FA QR code setup immediately with code verification ────
  if (twoFASetup) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(twoFASetup.otpAuthUrl)}`;
    return (
      <div className="space-y-5 animate-scale-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-2 shadow-inner">
            <FiShield className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Set Up Google Authenticator
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Two-factor authentication is required for your new workspace. Scan the QR code below.
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-dark-800 rounded-2xl border border-slate-200 dark:border-dark-700">
          <img
            src={qrUrl}
            alt="Google Authenticator QR Code"
            className="w-44 h-44 rounded-xl shadow-sm border border-slate-100 dark:border-dark-700"
          />
          <p className="text-xs text-slate-500 text-center">
            Open <strong>Google Authenticator</strong> → Tap <strong>+</strong> → <strong>Scan QR code</strong>
          </p>
        </div>

        {/* Manual entry secret */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <FiKey className="w-3.5 h-3.5" /> Can't scan? Enter this secret manually:
          </p>
          <div className="p-2.5 bg-slate-50 dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-dark-700 font-mono text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-widest break-all select-all">
            {twoFASetup.secret}
          </div>
        </div>

        {/* Verification form on the same screen */}
        <form onSubmit={handleVerifyAndLogin} className="space-y-3 pt-2">
          <div>
            <label className="label text-xs font-semibold">Enter 6-Digit Code from App to Enter Workspace</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FiKey className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="input pl-10 tracking-widest text-center text-lg font-mono font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={verifying || verificationCode.length !== 6}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : (
              <>
                <span>Complete Setup & Enter Dashboard</span>
                <FiArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-1">
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              I'll complete verification on the login page instead →
            </Link>
          </div>
        </form>
      </div>
    );
  }

  // ── Step 1: Registration form ──────────────────────────────────────────────
  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
        Create your workspace
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Company Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FiBriefcase className="w-4 h-4" />
            </div>
            <input
              type="text"
              name="companyName"
              required
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Acme Corp"
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="label">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FiUser className="w-4 h-4" />
            </div>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Jane Doe"
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="label">Work Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FiMail className="w-4 h-4" />
            </div>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@acme.com"
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FiLock className="w-4 h-4" />
            </div>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="label">Confirm Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FiLock className="w-4 h-4" />
            </div>
            <input
              type="password"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="input pl-10"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-300">
          <FiShield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>After registration, you'll set up <strong>Google Authenticator</strong> for two-factor authentication.</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-6"
        >
          {loading ? 'Creating Workspace...' : (
            <>
              <span>Get Started Free</span>
              <FiArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default Register;
