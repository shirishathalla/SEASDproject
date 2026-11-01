import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Mail,
  Lock,
  User,
  Fingerprint,
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkBiometricCapabilities } from '../utils/biometrics';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  initialMode?: 'login' | 'register';
}

type RegistrationStep =
  | 'details' // 1. Name, Email, Password
  | 'otp' // 2. Real Email OTP Verification
  | 'pin' // 3. Create & Confirm Vault PIN
  | 'biometric' // 4. Biometric Setup (optional)
  | 'photo'; // 5. Profile Photo (optional)

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
}) => {
  const {
    loginUser,
    sendOtp,
    verifyOtp,
    registerUser,
    setupVaultPin,
    enableBiometricsAction,
    updateProfile,
    resetPasswordWithOtp,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [regStep, setRegStep] = useState<RegistrationStep>('details');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  // PIN State
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Biometrics Hardware Check
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Profile Photo State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Status & Errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset password states
  const [resetStep, setResetStep] = useState<'email' | 'otp_and_pass'>('email');
  const [newPassword, setNewPassword] = useState('');

  // Check biometric capability on mount
  useEffect(() => {
    checkBiometricCapabilities().then((cap) => {
      setBiometricAvailable(cap.isSupported && cap.isPlatformAvailable);
    });
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  // --- REGISTRATION FLOW HANDLERS ---

  // Step 1: Submit Details -> Send real OTP
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError('Please enter your full name.');
    if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters long.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res = await sendOtp(email.trim(), 'registration');
      setSuccessMsg(res.message);
      if (res.devPreviewCode) setDevOtpPreview(res.devPreviewCode);
      setCooldown(60);
      setRegStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      return setError('Please enter the 6-digit verification code.');
    }

    setLoading(true);
    try {
      await verifyOtp(email.trim(), otpCode.trim());
      // Create user record in system
      await registerUser(fullName.trim(), email.trim(), password);
      setSuccessMsg('Email verified successfully! Now create your personal Vault PIN.');
      setRegStep('pin');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const res = await sendOtp(email.trim(), 'registration');
      setSuccessMsg('A new verification code has been dispatched.');
      if (res.devPreviewCode) setDevOtpPreview(res.devPreviewCode);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Setup Vault PIN
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4,8}$/.test(pin)) {
      return setError('PIN must be 4 to 8 numerical digits.');
    }
    if (pin !== confirmPin) {
      return setError('Vault PIN confirmation does not match.');
    }

    setLoading(true);
    try {
      const res = await setupVaultPin(pin);
      if (!res.success) {
        throw new Error(res.error || 'Failed to initialize Vault PIN.');
      }
      setSuccessMsg('Vault PIN configured! Your master AES-256 key is derived.');
      setRegStep('biometric');
    } catch (err: any) {
      setError(err.message || 'Cryptographic PIN initialization failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Biometrics configuration
  const handleBiometricToggle = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await enableBiometricsAction();
      if (res.success) {
        setBiometricEnabled(true);
        setSuccessMsg('Biometric authentication enabled successfully.');
      } else {
        setError(res.error || 'Biometric hardware sensor rejected registration.');
      }
    } catch (err: any) {
      setError(err.message || 'Biometric hardware error.');
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Profile Photo handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinishRegistration = () => {
    if (photoPreview) {
      updateProfile({ photoUrl: photoPreview });
    }
    // Registration complete! Modal will automatically close as user is logged in & unlocked
  };

  // --- LOGIN HANDLER ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return setError('Email and password are required.');

    setLoading(true);
    try {
      const res = await loginUser(email.trim(), password);
      if (!res.success) {
        setError(res.error || 'Login failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD FLOW ---
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError('Please enter your account email.');

    setLoading(true);
    try {
      const res = await sendOtp(email.trim(), 'reset-password');
      setSuccessMsg(res.message);
      if (res.devPreviewCode) setDevOtpPreview(res.devPreviewCode);
      setCooldown(60);
      setResetStep('otp_and_pass');
    } catch (err: any) {
      setError(err.message || 'Failed to request reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otpCode || otpCode.trim().length !== 6) return setError('Enter 6-digit OTP.');
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.');

    setLoading(true);
    try {
      await verifyOtp(email.trim(), otpCode.trim());
      await resetPasswordWithOtp(email.trim(), newPassword);
      setSuccessMsg('Password updated! You can now login with your new credentials.');
      setMode('login');
      setResetStep('email');
      setOtpCode('');
      setPassword(newPassword);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#171A20] border border-[#222630] rounded-2xl shadow-2xl p-6 sm:p-8 text-[#F4F5F7] relative">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#648BFF]/20 to-[#222630] border border-[#648BFF]/40 flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-[#648BFF]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">DocuVault</h2>
          <p className="text-xs text-[#9299A5] mt-1 font-mono">
            {mode === 'login'
              ? 'Enter credentials to access your secure wallet'
              : mode === 'register'
              ? `Registration Security Pipeline [Step ${
                  regStep === 'details'
                    ? '1/5'
                    : regStep === 'otp'
                    ? '2/5'
                    : regStep === 'pin'
                    ? '3/5'
                    : regStep === 'biometric'
                    ? '4/5'
                    : '5/5'
                }]`
              : 'Recover Your DocuVault Account'}
          </p>
        </div>

        {/* Global Error & Success Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-2.5 text-xs text-[#EF4444]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-start gap-2.5 text-xs text-[#10B981]">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Real OTP Dev Delivery Banner for Academic Review */}
        {devOtpPreview && (
          <div className="mb-4 p-3 rounded-xl bg-[#648BFF]/10 border border-[#648BFF]/30 text-xs text-[#648BFF]">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live OTP Dispatched (SMTP Audit)
              </span>
              <span className="font-mono bg-[#648BFF]/20 px-2 py-0.5 rounded text-white tracking-widest text-sm">
                {devOtpPreview}
              </span>
            </div>
            <p className="text-[11px] text-[#9299A5] mt-1">
              Valid for 5 minutes. Real verification is required before proceeding.
            </p>
          </div>
        )}

        {/* --- 1. LOGIN MODE --- */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#C5CAD3] mb-1.5">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9299A5] absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#C5CAD3]">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-[#648BFF] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9299A5] absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#9299A5] hover:text-[#F4F5F7]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#648BFF]/20 disabled:opacity-50"
            >
              {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Sign In to Vault'}
            </button>

            <div className="pt-3 text-center border-t border-[#222630] text-xs text-[#9299A5]">
              New to DocuVault?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setRegStep('details');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-[#648BFF] font-medium hover:underline"
              >
                Create Secure Account
              </button>
            </div>
          </form>
        )}

        {/* --- 2. REGISTRATION PIPELINE --- */}
        {mode === 'register' && (
          <div>
            {/* Step 1: Details */}
            {regStep === 'details' && (
              <form onSubmit={handleDetailsSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#9299A5] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex J. Rivers"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    Email Address (For Verification OTP)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9299A5] absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.rivers@university.edu"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    Master Password (min 8 chars)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9299A5] absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-9 pr-10 py-2 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    Confirm Master Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9299A5] absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-9 pr-10 py-2 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#648BFF]/20"
                >
                  {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Send Verification OTP'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-2 text-center text-xs text-[#9299A5]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-[#648BFF] hover:underline"
                  >
                    Log In
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Email OTP */}
            {regStep === 'otp' && (
              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div className="text-center p-3 rounded-xl bg-[#0B0D10] border border-[#222630]">
                  <p className="text-xs text-[#C5CAD3]">
                    We sent a 6-digit code to <span className="font-semibold text-white">{email}</span>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full text-center tracking-[0.4em] font-mono text-2xl py-3 bg-[#0B0D10] border border-[#222630] rounded-xl focus:border-[#648BFF] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#9299A5]">
                  <button
                    type="button"
                    onClick={() => setRegStep('details')}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || loading}
                    className="text-[#648BFF] hover:underline disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#648BFF]/20 disabled:opacity-50"
                >
                  {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Verify Code & Proceed'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Step 3: Vault PIN */}
            {regStep === 'pin' && (
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="p-3 rounded-xl bg-[#0B0D10] border border-[#222630] text-xs text-[#9299A5]">
                  <div className="flex items-center gap-1.5 text-[#F4F5F7] font-semibold mb-1">
                    <KeyRound className="w-4 h-4 text-[#648BFF]" />
                    Zero-Knowledge Master PIN
                  </div>
                  Your PIN derives your local AES-256-GCM encryption key via PBKDF2 (100,000 rounds). It is never sent to any server.
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    Create Vault PIN (4 to 8 digits)
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 bg-[#0B0D10] border border-[#222630] rounded-xl focus:border-[#648BFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    Confirm Vault PIN
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={8}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    required
                    className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 bg-[#0B0D10] border border-[#222630] rounded-xl focus:border-[#648BFF] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || pin.length < 4}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#648BFF]/20 disabled:opacity-50"
                >
                  {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Derive Master Key & Save'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Step 4: Biometrics */}
            {regStep === 'biometric' && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#222630] border border-[#648BFF]/30 flex items-center justify-center mx-auto text-[#648BFF]">
                  <Fingerprint className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Enable Biometric Unlocking</h3>
                  <p className="text-xs text-[#9299A5] mt-1 max-w-xs mx-auto">
                    {biometricAvailable
                      ? 'Unlock your vault instantly using native platform fingerprint or Face ID (WebAuthn).'
                      : 'Hardware biometric platform authenticator is not detected on this browser/OS.'}
                  </p>
                </div>

                {biometricAvailable ? (
                  <button
                    type="button"
                    onClick={handleBiometricToggle}
                    disabled={loading || biometricEnabled}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      biometricEnabled
                        ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                        : 'bg-[#648BFF] hover:bg-[#5278ea] text-white'
                    }`}
                  >
                    {biometricEnabled ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Biometrics Configured
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" /> Register Sensor
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs text-[#9299A5]">
                    PIN authentication will be used as the primary cryptographic unlock mechanism.
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRegStep('photo')}
                    className="w-full py-2 rounded-xl bg-[#222630] hover:bg-[#2e3442] text-xs font-medium text-[#F4F5F7] transition-colors"
                  >
                    {biometricEnabled ? 'Next Step' : 'Skip Biometrics'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Profile Photo & Finalize */}
            {regStep === 'photo' && (
              <div className="space-y-4 text-center">
                <div>
                  <h3 className="font-bold text-base">Personal Identification Photo</h3>
                  <p className="text-xs text-[#9299A5] mt-1">
                    Upload an optional square or passport-style avatar for your vault.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#648BFF]/40 bg-[#0B0D10] flex items-center justify-center overflow-hidden relative group">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-8 h-8 text-[#9299A5]" />
                    )}
                  </div>
                  <label className="cursor-pointer text-xs px-3 py-1.5 rounded-lg bg-[#222630] hover:bg-[#2c3240] text-[#F4F5F7] transition-colors">
                    <span>{photoPreview ? 'Change Photo' : 'Select Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleFinishRegistration}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#10B981]/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Enter My Personal Vault
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- 3. FORGOT PASSWORD MODE --- */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {resetStep === 'email' ? (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                <p className="text-xs text-[#9299A5]">
                  Enter your registered email address. We will dispatch a secure 6-digit recovery OTP.
                </p>
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9299A5] absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.rivers@university.edu"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-medium text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPasswordReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full text-center tracking-[0.3em] font-mono py-2 bg-[#0B0D10] border border-[#222630] rounded-xl focus:border-[#648BFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    New Master Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-white font-medium text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : 'Update Password & Return to Login'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className="w-full text-center text-xs text-[#9299A5] hover:text-[#F4F5F7] pt-2"
            >
              Cancel and Return to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
