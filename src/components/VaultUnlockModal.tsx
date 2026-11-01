import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Fingerprint,
  AlertCircle,
  RotateCw,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const VaultUnlockModal: React.FC = () => {
  const {
    user,
    unlockVaultWithPin,
    unlockWithBiometricsAction,
    sendOtp,
    verifyOtp,
    resetPinWithOtp,
    logout,
  } = useAuth();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot PIN state
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) return;
    setError(null);
    setLoading(true);

    try {
      const res = await unlockVaultWithPin(pin);
      if (!res.success) {
        setError(res.error || 'Incorrect Vault PIN.');
        setPin('');
      }
    } catch (err: any) {
      setError(err.message || 'Decryption error.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await unlockWithBiometricsAction();
      if (!res.success) {
        setError(res.error || 'Biometric authentication failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Sensor error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const res = await sendOtp(user.email, 'pin-reset');
      setOtpSent(true);
      if (res.devPreviewCode) setDevOtpPreview(res.devPreviewCode);
    } catch (err: any) {
      setError(err.message || 'Failed to send PIN reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPinReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (resetOtp.length !== 6) return setError('Please enter 6-digit verification code.');
    if (!/^\d{4,8}$/.test(newPin)) return setError('PIN must be 4 to 8 digits.');
    if (newPin !== confirmNewPin) return setError('PINs do not match.');

    setLoading(true);
    setError(null);
    try {
      await verifyOtp(user.email, resetOtp);
      const res = await resetPinWithOtp(newPin);
      if (!res.success) {
        throw new Error(res.error || 'Failed to update PIN.');
      }
      setIsResettingPin(false);
      setPin('');
    } catch (err: any) {
      setError(err.message || 'PIN reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#171A20] border border-[#222630] rounded-2xl shadow-2xl p-6 sm:p-7 text-[#F4F5F7] text-center">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#0B0D10] border border-[#648BFF]/40 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#648BFF]/10">
          <Lock className="w-7 h-7 text-[#648BFF]" />
        </div>

        <h2 className="text-lg font-bold">Personal Vault Locked</h2>
        <p className="text-xs text-[#9299A5] mt-1 mb-5">
          {user?.fullName ? `Welcome back, ${user.fullName.split(' ')[0]}` : 'Unlock your secure documents'}
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center gap-2 text-xs text-[#EF4444]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isResettingPin ? (
          <div className="space-y-5">
            {/* PIN Input */}
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  autoFocus
                  className="w-full text-center tracking-[0.6em] font-mono text-2xl py-3 bg-[#0B0D10] border border-[#222630] rounded-xl focus:border-[#648BFF] focus:outline-none"
                />
              </div>

              {/* Number Pad for Quick Touch on Mobile */}
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => {
                      if (pin.length < 8) setPin((prev) => prev + digit);
                    }}
                    className="py-2.5 rounded-xl bg-[#0B0D10] border border-[#222630] hover:bg-[#222630] text-sm font-semibold font-mono transition-colors"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin('')}
                  className="py-2.5 rounded-xl bg-[#0B0D10] border border-[#222630] hover:bg-[#222630] text-xs font-medium text-[#9299A5] transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pin.length < 8) setPin((prev) => prev + '0');
                  }}
                  className="py-2.5 rounded-xl bg-[#0B0D10] border border-[#222630] hover:bg-[#222630] text-sm font-semibold font-mono transition-colors"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPin((prev) => prev.slice(0, -1))}
                  className="py-2.5 rounded-xl bg-[#0B0D10] border border-[#222630] hover:bg-[#222630] text-xs font-medium text-[#9299A5] transition-colors"
                >
                  ⌫
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || pin.length < 4}
                className="w-full py-2.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#648BFF]/20 disabled:opacity-50"
              >
                {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                Unlock Vault
              </button>
            </form>

            {/* Biometrics Option */}
            {user?.biometricsEnabled && (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={loading}
                className="w-full py-2 rounded-xl bg-[#222630] hover:bg-[#2c3240] text-xs font-medium text-[#F4F5F7] transition-colors flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4 text-[#648BFF]" />
                Unlock with Biometrics
              </button>
            )}

            {/* Recovery / Logout Links */}
            <div className="flex items-center justify-between text-xs text-[#9299A5] pt-2 border-t border-[#222630]">
              <button
                type="button"
                onClick={() => {
                  setIsResettingPin(true);
                  setError(null);
                }}
                className="hover:text-[#648BFF] transition-colors"
              >
                Forgot PIN?
              </button>
              <button
                type="button"
                onClick={logout}
                className="hover:text-[#EF4444] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Forgot PIN Reset with Email OTP Flow */
          <div className="space-y-4 text-left">
            {!otpSent ? (
              <div className="space-y-3">
                <p className="text-xs text-[#9299A5]">
                  To reset your zero-knowledge PIN, we will dispatch an authorization OTP to your registered email{' '}
                  <span className="text-white font-mono">{user?.email}</span>.
                </p>
                <button
                  type="button"
                  onClick={handleSendResetOtp}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white text-xs font-medium transition-all"
                >
                  {loading ? 'Sending Code...' : 'Send PIN Reset Code'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmPinReset} className="space-y-3">
                {devOtpPreview && (
                  <div className="p-2 rounded-lg bg-[#648BFF]/10 border border-[#648BFF]/30 text-xs text-[#648BFF]">
                    Live OTP Code: <span className="font-mono font-bold">{devOtpPreview}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] text-[#9299A5] mb-1">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full text-center tracking-[0.3em] font-mono py-2 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9299A5] mb-1">New Vault PIN (4-8 digits)</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full text-center tracking-[0.3em] font-mono py-2 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9299A5] mb-1">Confirm New PIN</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full text-center tracking-[0.3em] font-mono py-2 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-white text-xs font-medium transition-all"
                >
                  {loading ? 'Re-encrypting...' : 'Reset PIN & Unlock'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setIsResettingPin(false);
                setOtpSent(false);
                setError(null);
              }}
              className="w-full text-center text-xs text-[#9299A5] hover:text-[#F4F5F7] pt-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
