/**
 * DocuVault Biometrics & Hardware Security Module
 * Uses the WebAuthn / Credential Management API (PublicKeyCredential)
 * Supports native fingerprint / Face ID / Windows Hello with graceful fallback
 */

export interface BiometricStatus {
  isSupported: boolean;
  isPlatformAvailable: boolean;
  isEnabled: boolean;
  credentialId?: string;
  authenticatorType?: string;
}

const STORAGE_KEY_BIOMETRIC = 'docuvault_biometric_enabled';
const STORAGE_KEY_CRED_ID = 'docuvault_biometric_cred_id';

/**
 * Check if the current browser/device supports WebAuthn platform biometrics
 */
export async function checkBiometricCapabilities(): Promise<{
  isSupported: boolean;
  isPlatformAvailable: boolean;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { isSupported: false, isPlatformAvailable: false };
  }

  let isPlatformAvailable = false;
  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      isPlatformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch (e) {
    console.warn('[DocuVault Biometrics] Platform check error:', e);
  }

  return {
    isSupported: true,
    isPlatformAvailable,
  };
}

/**
 * Register a biometric credential for the user
 */
export async function registerBiometrics(userEmail: string, userName: string): Promise<{
  success: boolean;
  credentialId?: string;
  error?: string;
}> {
  try {
    const { isSupported } = await checkBiometricCapabilities();
    if (!isSupported) {
      return { success: false, error: 'WebAuthn is not supported by your current browser.' };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode(userEmail);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'DocuVault Secure Wallet',
          id: window.location.hostname || 'localhost',
        },
        user: {
          id: userId,
          name: userEmail,
          displayName: userName || 'DocuVault User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Biometric registration was cancelled.' };
    }

    const credIdBase64 = window.btoa(
      String.fromCharCode(...new Uint8Array(credential.rawId))
    );

    localStorage.setItem(STORAGE_KEY_BIOMETRIC, 'true');
    localStorage.setItem(STORAGE_KEY_CRED_ID, credIdBase64);

    return {
      success: true,
      credentialId: credIdBase64,
    };
  } catch (error: any) {
    console.error('[DocuVault Biometrics Register Error]', error);
    return {
      success: false,
      error: error?.message || 'Biometric hardware sensor rejected registration or was cancelled.',
    };
  }
}

/**
 * Authenticate with registered biometric credential
 */
export async function authenticateBiometrics(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const isEnabled = localStorage.getItem(STORAGE_KEY_BIOMETRIC) === 'true';
    if (!isEnabled) {
      return { success: false, error: 'Biometrics is not enabled on this device.' };
    }

    const credIdBase64 = localStorage.getItem(STORAGE_KEY_CRED_ID);
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const allowCredentials: PublicKeyCredentialDescriptor[] = credIdBase64
      ? [
          {
            type: 'public-key',
            id: Uint8Array.from(window.atob(credIdBase64), (c) => c.charCodeAt(0)),
            transports: ['internal'],
          },
        ]
      : [];

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      },
    });

    if (!assertion) {
      return { success: false, error: 'Biometric verification cancelled.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[DocuVault Biometrics Verify Error]', error);
    return {
      success: false,
      error: error?.message || 'Biometric authentication failed. Please enter your Vault PIN.',
    };
  }
}

/**
 * Disable biometrics
 */
export function disableBiometrics(): void {
  localStorage.removeItem(STORAGE_KEY_BIOMETRIC);
  localStorage.removeItem(STORAGE_KEY_CRED_ID);
}

/**
 * Check if biometrics is actively enabled on device
 */
export function isBiometricsConfigured(): boolean {
  return localStorage.getItem(STORAGE_KEY_BIOMETRIC) === 'true';
}
