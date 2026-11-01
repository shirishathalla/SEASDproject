import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  deriveKeyFromPin,
  hashPinForVerification,
  generateSalt,
  bufferToHex,
  hexToBuffer,
} from '../utils/crypto';
import {
  authenticateBiometrics,
  registerBiometrics,
  isBiometricsConfigured,
  disableBiometrics,
  checkBiometricCapabilities,
} from '../utils/biometrics';
import { addAuditLog } from '../utils/storage';

export interface UserProfile {
  email: string;
  fullName: string;
  photoUrl?: string;
  isEmailVerified: boolean;
  hasPin: boolean;
  pinSaltHex?: string;
  pinHash?: string;
  passwordHash?: string;
  biometricsEnabled: boolean;
  registeredAt: string;
  autoLockMinutes: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isVaultUnlocked: boolean;
  isPrivacyObscured: boolean;
  sessionCryptoKey: CryptoKey | null;
  autoLockMinutes: number;
  remainingLockSeconds: number;
  // Auth flows
  sendOtp: (email: string, purpose?: 'registration' | 'reset-password' | 'pin-reset') => Promise<{ success: boolean; message: string; devPreviewCode?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  registerUser: (fullName: string, email: string, password: string) => Promise<boolean>;
  loginUser: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  setupVaultPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  unlockVaultWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  unlockWithBiometricsAction: () => Promise<{ success: boolean; error?: string }>;
  enableBiometricsAction: () => Promise<{ success: boolean; error?: string }>;
  disableBiometricsAction: () => void;
  lockVault: () => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updatePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithOtp: (email: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  resetPinWithOtp: (newPin: string) => Promise<{ success: boolean; error?: string }>;
  setAutoLockDuration: (minutes: number) => void;
  resetVaultActivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'docuvault_user_profile';
const USERS_DB_KEY = 'docuvault_registered_accounts';

// Simple deterministic hash for password authentication verification
async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password + 'docuvault_auth_pepper');
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  return bufferToHex(hashBuffer);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem(USER_STORAGE_KEY);
  });

  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [sessionCryptoKey, setSessionCryptoKey] = useState<CryptoKey | null>(null);
  const [isPrivacyObscured, setIsPrivacyObscured] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    return user?.autoLockMinutes || 5;
  });
  const [remainingLockSeconds, setRemainingLockSeconds] = useState<number>(300);

  const lastActivityRef = useRef<number>(Date.now());
  const autoLockTimerRef = useRef<any>(null);

  // Sync user state with localStorage
  const saveUser = (updatedUser: UserProfile | null) => {
    setUser(updatedUser);
    if (updatedUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      setIsAuthenticated(true);
      // Also update in accounts directory
      try {
        const accounts = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
        accounts[updatedUser.email.toLowerCase()] = updatedUser;
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(accounts));
      } catch (e) {
        console.error('Failed to update accounts registry', e);
      }
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
      setIsAuthenticated(false);
      setIsVaultUnlocked(false);
      setSessionCryptoKey(null);
    }
  };

  // Lock vault helper
  const lockVault = useCallback(() => {
    setIsVaultUnlocked(false);
    setSessionCryptoKey(null);
    addAuditLog('VAULT_LOCKED', 'Personal vault automatically locked due to inactivity or manual request.', 'info');
  }, []);

  // Activity reset for auto-lock
  const resetVaultActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (autoLockMinutes > 0) {
      setRemainingLockSeconds(autoLockMinutes * 60);
    }
  }, [autoLockMinutes]);

  // Window blur / Tab switch Privacy Screen
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPrivacyObscured(true);
      } else {
        setIsPrivacyObscured(false);
      }
    };

    const handleBlur = () => setIsPrivacyObscured(true);
    const handleFocus = () => setIsPrivacyObscured(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Auto-lock countdown and timer
  useEffect(() => {
    if (!isVaultUnlocked || autoLockMinutes === 0) {
      return;
    }

    autoLockTimerRef.current = setInterval(() => {
      const elapsedSecs = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = autoLockMinutes * 60 - elapsedSecs;
      setRemainingLockSeconds(Math.max(0, remaining));

      if (remaining <= 0) {
        lockVault();
      }
    }, 1000);

    return () => {
      if (autoLockTimerRef.current) clearInterval(autoLockTimerRef.current);
    };
  }, [isVaultUnlocked, autoLockMinutes, lockVault]);

  // Activity listeners to reset auto-lock
  useEffect(() => {
    const handleUserActivity = () => {
      if (isVaultUnlocked) {
        resetVaultActivityTimer();
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [isVaultUnlocked, resetVaultActivityTimer]);

  // 1. Send OTP via backend
  const sendOtp = async (
    email: string,
    purpose: 'registration' | 'reset-password' | 'pin-reset' = 'registration'
  ) => {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send OTP.');
    }
    return {
      success: true,
      message: data.message,
      devPreviewCode: data.deliveryStatus?.devPreviewCode,
    };
  };

  // 2. Verify OTP via backend
  const verifyOtp = async (email: string, code: string) => {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid OTP code.');
    }
    return { success: true, message: data.message };
  };

  // 3. Register user profile
  const registerUser = async (fullName: string, email: string, password: string) => {
    const passwordHash = await hashPassword(password);
    const newUser: UserProfile = {
      fullName,
      email: email.trim().toLowerCase(),
      isEmailVerified: true,
      hasPin: false,
      biometricsEnabled: false,
      registeredAt: new Date().toISOString(),
      autoLockMinutes: 5,
      passwordHash,
    };
    saveUser(newUser);
    await addAuditLog('USER_REGISTERED', `Account registered for ${email}. Email verification confirmed.`, 'success');
    return true;
  };

  // 4. Setup Vault PIN (creates salt, derives initial AES-256 key, unlocks vault)
  const setupVaultPin = async (pin: string) => {
    if (!user) return { success: false, error: 'No active session.' };
    if (!/^\d{4,8}$/.test(pin)) {
      return { success: false, error: 'PIN must be between 4 and 8 digits.' };
    }

    try {
      const salt = generateSalt(16);
      const saltHex = bufferToHex(salt);
      const pinHash = await hashPinForVerification(pin, salt);
      const key = await deriveKeyFromPin(pin, salt);

      const updated: UserProfile = {
        ...user,
        hasPin: true,
        pinSaltHex: saltHex,
        pinHash,
      };

      saveUser(updated);
      setSessionCryptoKey(key);
      setIsVaultUnlocked(true);
      resetVaultActivityTimer();

      await addAuditLog('VAULT_PIN_CREATED', 'Personal zero-knowledge encryption key derived and vault initialized.', 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to setup PIN.' };
    }
  };

  // 5. Unlock Vault with PIN
  const unlockVaultWithPin = async (pin: string) => {
    if (!user || !user.pinSaltHex || !user.pinHash) {
      return { success: false, error: 'Vault is not configured with a PIN.' };
    }

    try {
      const salt = hexToBuffer(user.pinSaltHex);
      const computedHash = await hashPinForVerification(pin, salt);

      if (computedHash !== user.pinHash) {
        await addAuditLog('VAULT_UNLOCK_FAILED', 'Incorrect PIN entered for vault unlocking.', 'warning');
        return { success: false, error: 'Incorrect Vault PIN. Please try again.' };
      }

      // Derive in-memory AES-GCM session key
      const key = await deriveKeyFromPin(pin, salt);
      setSessionCryptoKey(key);
      setIsVaultUnlocked(true);
      resetVaultActivityTimer();

      await addAuditLog('VAULT_UNLOCKED', 'Personal vault unlocked using PIN authentication.', 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Decryption error.' };
    }
  };

  // 6. Unlock with Biometrics
  const unlockWithBiometricsAction = async () => {
    if (!user) return { success: false, error: 'No active user session.' };

    const result = await authenticateBiometrics();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Biometric verified! In browser preview/WebAuthn, we need the derived session key.
    // If the PIN was set, we prompt or use cached platform credential.
    // To ensure zero-knowledge cryptographic operations succeed, we can unlock vault:
    if (user.pinSaltHex && user.pinHash) {
      // Create session key using device-bound salt
      const salt = hexToBuffer(user.pinSaltHex);
      const masterKey = await deriveKeyFromPin(user.email, salt);
      setSessionCryptoKey(masterKey);
    }

    setIsVaultUnlocked(true);
    resetVaultActivityTimer();
    await addAuditLog('VAULT_UNLOCKED_BIOMETRIC', 'Vault unlocked using hardware biometric authentication.', 'success');
    return { success: true };
  };

  // 7. Enable Biometrics
  const enableBiometricsAction = async () => {
    if (!user) return { success: false, error: 'User not logged in.' };
    const regResult = await registerBiometrics(user.email, user.fullName);
    if (!regResult.success) {
      return { success: false, error: regResult.error };
    }

    const updated = { ...user, biometricsEnabled: true };
    saveUser(updated);
    await addAuditLog('BIOMETRIC_REGISTERED', 'WebAuthn biometric credential registered for device.', 'success');
    return { success: true };
  };

  // 8. Disable Biometrics
  const disableBiometricsAction = () => {
    disableBiometrics();
    if (user) {
      saveUser({ ...user, biometricsEnabled: false });
      addAuditLog('BIOMETRIC_DISABLED', 'Biometric login disabled by user.', 'info');
    }
  };

  // 9. Login User
  const loginUser = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const accounts = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
    const existingUser: UserProfile | undefined = accounts[normalizedEmail];

    if (!existingUser) {
      return { success: false, error: 'No account found with this email. Please register first.' };
    }

    const enteredHash = await hashPassword(password);
    if (existingUser.passwordHash && existingUser.passwordHash !== enteredHash) {
      return { success: false, error: 'Invalid password. Please check your credentials.' };
    }

    saveUser(existingUser);
    setIsVaultUnlocked(false);
    await addAuditLog('USER_LOGIN', `User ${normalizedEmail} signed in. Vault locked pending PIN.`, 'success');
    return { success: true };
  };

  // 10. Logout
  const logout = () => {
    addAuditLog('USER_LOGOUT', 'User signed out. In-memory encryption session destroyed.', 'info');
    saveUser(null);
  };

  // 11. Update Profile
  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    saveUser(updated);
    addAuditLog('PROFILE_UPDATED', 'Personal profile information modified.', 'info');
  };

  // 12. Update Password
  const updatePassword = async (oldPass: string, newPass: string) => {
    if (!user) return { success: false, error: 'Not authenticated.' };
    const oldHash = await hashPassword(oldPass);
    if (user.passwordHash && user.passwordHash !== oldHash) {
      return { success: false, error: 'Current password is incorrect.' };
    }
    const newHash = await hashPassword(newPass);
    saveUser({ ...user, passwordHash: newHash });
    await addAuditLog('PASSWORD_CHANGED', 'User password successfully updated.', 'success');
    return { success: true };
  };

  // 13. Reset Password With OTP
  const resetPasswordWithOtp = async (email: string, newPass: string) => {
    const normalized = email.trim().toLowerCase();
    const accounts = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '{}');
    const existing = accounts[normalized];
    if (!existing) {
      return { success: false, error: 'Account not found.' };
    }
    const newHash = await hashPassword(newPass);
    existing.passwordHash = newHash;
    accounts[normalized] = existing;
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(accounts));
    if (user && user.email.toLowerCase() === normalized) {
      saveUser({ ...user, passwordHash: newHash });
    }
    await addAuditLog('PASSWORD_RESET_OTP', `Password reset completed for ${normalized}.`, 'success');
    return { success: true };
  };

  // 14. Reset PIN with OTP
  const resetPinWithOtp = async (newPin: string) => {
    if (!user) return { success: false, error: 'User not signed in.' };
    return setupVaultPin(newPin);
  };

  // 15. Set Auto-Lock
  const setAutoLockDuration = (minutes: number) => {
    setAutoLockMinutes(minutes);
    if (user) {
      saveUser({ ...user, autoLockMinutes: minutes });
    }
    setRemainingLockSeconds(minutes * 60);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isVaultUnlocked,
        isPrivacyObscured,
        sessionCryptoKey,
        autoLockMinutes,
        remainingLockSeconds,
        sendOtp,
        verifyOtp,
        registerUser,
        loginUser,
        setupVaultPin,
        unlockVaultWithPin,
        unlockWithBiometricsAction,
        enableBiometricsAction,
        disableBiometricsAction,
        lockVault,
        logout,
        updateProfile,
        updatePassword,
        resetPasswordWithOtp,
        resetPinWithOtp,
        setAutoLockDuration,
        resetVaultActivityTimer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
