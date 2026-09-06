import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi, userApi, securityApi } from '../../api';
import toast from 'react-hot-toast';
import { FiUser, FiLock, FiShield, FiKey, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 2FA State
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await userApi.updateProfile(profileData);
      updateUser(res.data?.data);
      toast.success('Profile details updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPass(true);
    try {
      await authApi.updatePassword({
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });
      toast.success('Password updated successfully!');
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed');
    } finally {
      setSavingPass(false);
    }
  };

  const handleStart2FASetup = async () => {
    try {
      setMfaLoading(true);
      const res = await securityApi.setup2FA();
      if (res.data?.success) {
        setTwoFactorSetup(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initialize 2FA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirm2FA = async (e) => {
    e.preventDefault();
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      toast.error('Please enter a valid 6-digit TOTP code');
      return;
    }
    try {
      setMfaLoading(true);
      const res = await securityApi.verify2FA({ token: twoFactorToken });
      if (res.data?.success) {
        toast.success('Two-Factor Authentication is now enabled!');
        updateUser({ mfa_enabled: true });
        setTwoFactorSetup(null);
        setTwoFactorToken('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    try {
      setMfaLoading(true);
      const res = await securityApi.disable2FA({ password: disablePassword });
      if (res.data?.success) {
        toast.success('Two-Factor Authentication disabled');
        updateUser({ mfa_enabled: false });
        setShowDisableModal(false);
        setDisablePassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect password');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Account Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your personal profile, login credentials, and security options
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FiUser className="text-primary-500" /> Personal Identity
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                required
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Work Email (Read Only)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="input text-xs bg-slate-100 dark:bg-dark-800 opacity-70 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="label">Phone Contact</label>
              <input
                type="text"
                value={profileData.phone || ''}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="input text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="btn-primary text-xs py-2 px-4"
            >
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FiLock className="text-indigo-500" /> Change Password
          </h3>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                required
                value={passData.currentPassword}
                onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={passData.newPassword}
                onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                required
                value={passData.confirmPassword}
                onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                className="input text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingPass}
              className="btn-primary text-xs py-2 px-4"
            >
              {savingPass ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Two-Factor Authentication (2FA) Card */}
      <div className="card p-6 space-y-4 border-indigo-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiShield className="text-emerald-500" /> Two-Factor Authentication (TOTP / RFC 6238)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Adds an extra layer of secondary verification when logging in to your HR account.
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase self-start sm:self-auto ${
            user?.mfa_enabled ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400'
          }`}>
            {user?.mfa_enabled ? '2FA ENABLED' : '2FA DISABLED'}
          </span>
        </div>

        {!user?.mfa_enabled ? (
          <div>
            {!twoFactorSetup ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Protect your account with Google Authenticator, Authy, or standard TOTP apps.
                </p>
                <button
                  onClick={handleStart2FASetup}
                  disabled={mfaLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow transition-all"
                >
                  {mfaLoading ? 'Generating Secret...' : 'Enable 2FA'}
                </button>
              </div>
            ) : (
              <div className="space-y-4 bg-slate-50 dark:bg-dark-850 p-5 rounded-2xl border border-slate-200 dark:border-dark-800 animate-scale-in">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Step 1: Save TOTP Shared Secret</h4>
                <div className="p-3 bg-white dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-dark-800 font-mono text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-widest break-all">
                  {twoFactorSetup.secret}
                </div>
                <p className="text-xs text-slate-500">
                  Current Test Code: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{twoFactorSetup.previewCurrentCode}</strong>
                </p>

                <form onSubmit={handleConfirm2FA} className="space-y-3 pt-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Step 2: Verify 6-Digit Code</h4>
                  <div className="flex gap-2 max-w-xs">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={twoFactorToken}
                      onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="input text-center font-mono font-bold tracking-widest text-base"
                    />
                    <button
                      type="submit"
                      disabled={mfaLoading}
                      className="btn-primary text-xs px-4 py-2 whitespace-nowrap"
                    >
                      {mfaLoading ? 'Verifying...' : 'Confirm & Activate'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <FiCheckCircle className="w-4 h-4" /> Two-Factor Authentication is active and protecting your sessions.
            </div>
            <button
              onClick={() => setShowDisableModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100"
            >
              Disable 2FA
            </button>
          </div>
        )}
      </div>

      {/* Modal to disable 2FA */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <h3 className="font-bold text-slate-900 dark:text-white">Disable Two-Factor Authentication</h3>
            <p className="text-xs text-slate-500">Please enter your password to confirm turning off 2FA protection.</p>
            <form onSubmit={handleDisable2FA} className="space-y-4">
              <input
                type="password"
                required
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Your current password"
                className="input text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-dark-800 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mfaLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
                >
                  {mfaLoading ? 'Disabling...' : 'Confirm Disable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
