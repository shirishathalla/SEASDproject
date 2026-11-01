import React, { useState } from 'react';
import {
  User,
  Mail,
  Camera,
  Lock,
  KeyRound,
  Fingerprint,
  Bell,
  Shield,
  LogOut,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfileView: React.FC = () => {
  const {
    user,
    updateProfile,
    updatePassword,
    setupVaultPin,
    enableBiometricsAction,
    disableBiometricsAction,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');

  // Edit details form
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photoUrl || null);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // PIN change form
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  // Notification states
  const [notifyExpiring, setNotifyExpiring] = useState(true);
  const [notifyFamily, setNotifyFamily] = useState(true);

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        updateProfile({ photoUrl: result });
        setSuccessMsg('Profile photo updated successfully.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    updateProfile({ photoUrl: undefined });
    setSuccessMsg('Profile avatar removed.');
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName.trim()) return setErrorMsg('Full name cannot be empty.');
    updateProfile({ fullName: fullName.trim() });
    setSuccessMsg('Profile information saved.');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) return setErrorMsg('Password must be at least 8 characters.');
    if (newPassword !== confirmNewPassword) return setErrorMsg('New passwords do not match.');

    setLoading(true);
    try {
      const res = await updatePassword(currentPassword, newPassword);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update password.');
      } else {
        setSuccessMsg('Master password successfully updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Password update error.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!/^\d{4,8}$/.test(newPin)) return setErrorMsg('PIN must be 4 to 8 digits.');
    if (newPin !== confirmNewPin) return setErrorMsg('PIN confirmation does not match.');

    setLoading(true);
    try {
      const res = await setupVaultPin(newPin);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to change Vault PIN.');
      } else {
        setSuccessMsg('Vault PIN successfully updated and re-keyed.');
        setNewPin('');
        setConfirmNewPin('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'PIN re-keying failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#171A20] to-[#0B0D10] border border-[#222630] flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar with Camera Overlay */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-[#222630] border-2 border-[#648BFF]/40 flex items-center justify-center">
            {photoPreview ? (
              <img src={photoPreview} alt={user?.fullName || 'User'} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-[#648BFF]" />
            )}
          </div>

          <label className="absolute bottom-0 right-0 p-2 rounded-full bg-[#648BFF] hover:bg-[#5278ea] text-white cursor-pointer shadow-lg transition-transform group-hover:scale-110">
            <Camera className="w-3.5 h-3.5" />
            <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
          </label>
        </div>

        <div className="text-center sm:text-left flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#F4F5F7] truncate">{user?.fullName || 'DocuVault User'}</h2>
          <p className="text-xs text-[#9299A5] font-mono mt-0.5">{user?.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-[11px] text-[#9299A5]">
            <span className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] font-mono">
              ✓ Email Verified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3" /> Member since {user?.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : '2024'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] text-xs font-semibold transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#222630] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'profile' ? 'bg-[#171A20] text-[#648BFF] border border-[#648BFF]/40' : 'text-[#9299A5]'
          }`}
        >
          Personal Info
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'security' ? 'bg-[#171A20] text-[#648BFF] border border-[#648BFF]/40' : 'text-[#9299A5]'
          }`}
        >
          Security & Credentials
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'preferences' ? 'bg-[#171A20] text-[#648BFF] border border-[#648BFF]/40' : 'text-[#9299A5]'
          }`}
        >
          Preferences
        </button>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs text-[#10B981] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* --- TAB 1: PERSONAL INFO --- */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-2xl bg-[#171A20] border border-[#222630] space-y-4">
          <h3 className="font-bold text-sm text-[#F4F5F7]">Identity Information</h3>

          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Full Legal Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs text-[#F4F5F7]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Verified Email Address</label>
              <input
                type="email"
                readOnly
                value={user?.email || ''}
                className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs font-mono text-[#9299A5] cursor-not-allowed"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#648BFF] text-white text-xs font-semibold hover:bg-[#5278ea] transition-colors"
              >
                Save Profile Changes
              </button>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-4 py-2 rounded-xl bg-[#222630] text-[#EF4444] text-xs font-medium hover:bg-[#2e3442] transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Photo
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* --- TAB 2: SECURITY & CREDENTIALS --- */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change PIN */}
          <div className="p-6 rounded-2xl bg-[#171A20] border border-[#222630] space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#648BFF]" />
              <h3 className="font-bold text-sm text-[#F4F5F7]">Change Master Vault PIN</h3>
            </div>
            <p className="text-xs text-[#9299A5]">
              Re-keys your zero-knowledge master key using PBKDF2 (100,000 iterations).
            </p>

            <form onSubmit={handleChangePin} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">New PIN (4-8 digits)</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs font-mono tracking-widest text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Confirm New PIN</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs font-mono tracking-widest text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || newPin.length < 4}
                className="px-4 py-2 rounded-xl bg-[#648BFF] text-white text-xs font-semibold hover:bg-[#5278ea] transition-colors disabled:opacity-50"
              >
                {loading ? 'Re-encrypting...' : 'Update Vault PIN'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="p-6 rounded-2xl bg-[#171A20] border border-[#222630] space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#648BFF]" />
              <h3 className="font-bold text-sm text-[#F4F5F7]">Change Account Password</h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">New Password (min 8 chars)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-[#648BFF] text-white text-xs font-semibold hover:bg-[#5278ea] transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB 3: PREFERENCES --- */}
      {activeTab === 'preferences' && (
        <div className="p-6 rounded-2xl bg-[#171A20] border border-[#222630] space-y-4">
          <h3 className="font-bold text-sm text-[#F4F5F7]">Notifications & Alert Preferences</h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0D10] border border-[#222630]">
              <div>
                <span className="font-semibold text-white block">Document Renewal Reminders</span>
                <span className="text-[#9299A5]">Receive alerts 30, 15, 7, and 1 day prior to document expiration</span>
              </div>
              <input
                type="checkbox"
                checked={notifyExpiring}
                onChange={(e) => setNotifyExpiring(e.target.checked)}
                className="rounded border-[#222630] text-[#648BFF]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0D10] border border-[#222630]">
              <div>
                <span className="font-semibold text-white block">Family Vault Activity Alerts</span>
                <span className="text-[#9299A5]">Notify when an invited family member views shared documents</span>
              </div>
              <input
                type="checkbox"
                checked={notifyFamily}
                onChange={(e) => setNotifyFamily(e.target.checked)}
                className="rounded border-[#222630] text-[#648BFF]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
