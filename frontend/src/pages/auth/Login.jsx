import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiArrowRight, FiShield, FiKey, FiArrowLeft, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [require2FA, setRequire2FA] = useState(false);
  // For accounts setting up 2FA or re-scanning QR
  const [setupData, setSetupData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    if ((require2FA || setupData) && !totpCode) {
      toast.error('Please enter the 6-digit code from Google Authenticator');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password, (require2FA || setupData) ? totpCode : null);

      if (res?.require2FASetup) {
        setSetupData(res.data);
        setRequire2FA(false);
        toast.success('Scan the QR code in Google Authenticator, then enter the 6-digit code.');
      } else if (res?.require2FA) {
        setRequire2FA(true);
        setSetupData(null);
        toast.success('Enter your 6-digit code from Google Authenticator.');
      } else {
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Allows existing users who don't have the authenticator configured to request a fresh QR code
  const handleRequestFreshQR = async () => {
    if (!email || !password) {
      toast.error('Please enter your email and password first');
      return;
    }
    setLoading(true);
    try {
      const res = await login(email, password, null, true);
      if (res?.require2FASetup) {
        setSetupData(res.data);
        setRequire2FA(false);
        setTotpCode('');
        toast.success('New QR code generated! Scan it with Google Authenticator.');
      } else {
        toast.error(res?.message || 'Could not reset authenticator');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset 2FA');
    } finally {
      setLoading(false);
    }
  };

  // ── 2FA Setup View (shown for new accounts or existing accounts without code) ──
  if (setupData) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(setupData.otpAuthUrl)}`;
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
            Two-factor authentication is required. Scan the QR code with your phone.
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
            Open <strong>Google Authenticator</strong> app → Tap <strong>+</strong> → <strong>Scan QR code</strong>
          </p>
        </div>

        {/* Manual secret */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <FiKey className="w-3.5 h-3.5" /> Or enter code manually into Google Authenticator:
          </p>
          <div className="p-2.5 bg-slate-50 dark:bg-dark-800 rounded-xl border border-slate-200 dark:border-dark-700 font-mono text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-widest break-all select-all">
            {setupData.secret}
          </div>
        </div>

        {/* Direct verification on the same screen */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div>
            <label className="label text-xs font-semibold">Enter 6-Digit Code from App to Finish Login</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FiKey className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="input pl-10 tracking-widest text-center text-lg font-mono font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || totpCode.length !== 6}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : (
              <>
                <span>Verify Code & Log In</span>
                <FiArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setSetupData(null); setRequire2FA(false); setTotpCode(''); }}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1"
          >
            Cancel and return to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
          {require2FA ? <FiKey className="w-6 h-6" /> : <FiShield className="w-6 h-6" />}
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {require2FA ? 'Two-Factor Authentication' : 'Sign in to your account'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {require2FA ? 'Step 2: Enter the 6-digit code from Google Authenticator' : 'Secure HR & Team Management Platform'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!require2FA ? (
          <>
            <div>
              <label className="label">Work Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiMail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@company.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiLock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 animate-scale-in">
            <div>
              <label className="label">6-Digit Code from Google Authenticator</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FiKey className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="input pl-10 tracking-widest text-center text-lg font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setRequire2FA(false)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <FiArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <button
                type="button"
                onClick={handleRequestFreshQR}
                className="text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1"
              >
                <FiRefreshCw className="w-3 h-3" /> Don't have the app configured? Scan QR
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 mt-6"
        >
          {loading ? 'Verifying...' : (
            <>
              <span>{require2FA ? 'Verify Code' : 'Sign In'}</span>
              <FiArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
          Register new company
        </Link>
      </div>
    </div>
  );
};

export default Login;
