/**
 * DocuVault Cryptographic Engine
 * Genuine client-side Zero-Knowledge AES-256-GCM encryption
 * using the W3C standard Web Crypto API (SubtleCrypto).
 *
 * Designed for B.Tech CS & Cyber Security SEASD specifications:
 * - PBKDF2 key derivation with HMAC-SHA-256 and 100,000 iterations
 * - AES-256-GCM authenticated encryption (12-byte random IV, 128-bit authentication tag)
 * - Zero plaintext leakage to server or third parties
 */

export interface EncryptedPayload {
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  saltHex: string;
  ivHex: string;
  ciphertextBase64: string;
  timestamp: number;
}

export interface CryptoInspectionDetails {
  algorithm: string;
  keyLengthBits: number;
  kdfIterations: number;
  saltHex: string;
  ivHex: string;
  authTagBits: number;
  ciphertextSample: string;
}

// Convert ArrayBuffer to Hex string
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a cryptographically secure random salt (16 bytes = 128 bits)
 */
export function generateSalt(length = 16): Uint8Array {
  const salt = new Uint8Array(length);
  window.crypto.getRandomValues(salt);
  return salt;
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from a PIN / password using PBKDF2
 */
export async function deriveKeyFromPin(
  pin: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinKeyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    pinKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // Key is non-extractable from memory
    ['encrypt', 'decrypt']
  );
}

/**
 * Compute PBKDF2 hash of user's PIN for authentication verification
 */
export async function hashPinForVerification(pin: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bufferToHex(derivedBits);
}

/**
 * Encrypt plaintext string or object using AES-256-GCM
 */
export async function encryptDocumentData(
  data: string | object,
  key: CryptoKey,
  salt: Uint8Array
): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  const encodedData = encoder.encode(jsonString);

  // 96-bit (12-byte) initialization vector as recommended by NIST SP 800-38D for AES-GCM
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-256-GCM',
      iv,
      tagLength: 128, // 128-bit authentication tag
    },
    key,
    encodedData
  );

  return {
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations: 100000,
    saltHex: bufferToHex(salt),
    ivHex: bufferToHex(iv),
    ciphertextBase64: bufferToBase64(encryptedBuffer),
    timestamp: Date.now(),
  };
}

/**
 * Decrypt AES-256-GCM encrypted payload
 * Throws error if PIN or data was modified (authentic MAC failure)
 */
export async function decryptDocumentData<T = any>(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<T> {
  const iv = hexToBuffer(payload.ivHex);
  const ciphertextBytes = base64ToBuffer(payload.ciphertextBase64);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-256-GCM',
        iv: iv as unknown as BufferSource,
        tagLength: 128,
      },
      key,
      ciphertextBytes as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);

    try {
      return JSON.parse(jsonString) as T;
    } catch {
      return jsonString as unknown as T;
    }
  } catch (error) {
    throw new Error('Decryption failed: Invalid PIN or tampered cryptographic payload (GCM authentication tag mismatch).');
  }
}

/**
 * Helper to inspect cryptographic proof parameters for academic review
 */
export function getCryptoInspection(payload: EncryptedPayload): CryptoInspectionDetails {
  return {
    algorithm: 'AES-256-GCM (NIST SP 800-38D Standard)',
    keyLengthBits: 256,
    kdfIterations: payload.iterations || 100000,
    saltHex: payload.saltHex,
    ivHex: payload.ivHex,
    authTagBits: 128,
    ciphertextSample: payload.ciphertextBase64.slice(0, 48) + '...',
  };
}
