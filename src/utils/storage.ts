/**
 * DocuVault Secure Storage Engine
 * High-performance, offline-first IndexedDB storage with encryption support,
 * audit logging, family sharing permissions, and emergency access records.
 */

import type { EncryptedPayload } from './crypto';

export interface DocumentItem {
  id: string;
  name: string;
  category: 'Identity' | 'Education' | 'Finance' | 'Health' | 'Personal' | 'Other' | string;
  description?: string;
  tags: string[];
  documentDate: string; // YYYY-MM-DD
  expiryDate?: string | null; // YYYY-MM-DD or null
  mimeType: string;
  fileSize: number;
  dataUrl: string; // Base64 data URL
  encryptedPayload?: EncryptedPayload;
  ocrText?: string;
  keyFields?: Array<{ label: string; value: string }>;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  status: 'success' | 'warning' | 'info';
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected';
  invitedAt: string;
  sharedDocIds: string[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  authorizedDocIds: string[];
  accessDurationHours: number;
  status: 'active' | 'revoked';
  createdAt: string;
}

export interface QRShare {
  id: string;
  shareCode: string;
  documentId: string;
  documentName: string;
  createdAt: string;
  expiresAt: string;
  hasPassword: boolean;
  password?: string;
  allowDownload: boolean;
  status: 'active' | 'revoked' | 'expired';
  accessCount: number;
}

const DB_NAME = 'DocuVault_SecureDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;

      if (!db.objectStoreNames.contains('documents')) {
        const docStore = db.createObjectStore('documents', { keyPath: 'id' });
        docStore.createIndex('category', 'category', { unique: false });
        docStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        docStore.createIndex('expiryDate', 'expiryDate', { unique: false });
      }

      if (!db.objectStoreNames.contains('audit_logs')) {
        const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
        auditStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('family')) {
        db.createObjectStore('family', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('emergency')) {
        db.createObjectStore('emergency', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('qr_shares')) {
        db.createObjectStore('qr_shares', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// --- DOCUMENT OPERATIONS ---

export async function getAllDocuments(): Promise<DocumentItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const store = tx.objectStore('documents');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getDocumentById(id: string): Promise<DocumentItem | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const store = tx.objectStore('documents');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDocument(doc: DocumentItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    const request = store.put(doc);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- AUDIT LOGS ---

export async function addAuditLog(
  action: string,
  details: string,
  status: 'success' | 'warning' | 'info' = 'info'
): Promise<void> {
  const db = await getDB();
  const entry: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action,
    details,
    status,
    timestamp: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('audit_logs', 'readwrite');
    const store = tx.objectStore('audit_logs');
    const request = store.add(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audit_logs', 'readonly');
    const store = tx.objectStore('audit_logs');
    const request = store.getAll();

    request.onsuccess = () => {
      const logs: AuditLog[] = request.result || [];
      // Sort newest first
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(logs.slice(0, limit));
    };
    request.onerror = () => reject(request.error);
  });
}

// --- FAMILY VAULT ---

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('family', 'readonly');
    const store = tx.objectStore('family');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFamilyMember(member: FamilyMember): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('family', 'readwrite');
    const store = tx.objectStore('family');
    const request = store.put(member);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('family', 'readwrite');
    const store = tx.objectStore('family');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- EMERGENCY ACCESS ---

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('emergency', 'readonly');
    const store = tx.objectStore('emergency');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveEmergencyContact(contact: EmergencyContact): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('emergency', 'readwrite');
    const store = tx.objectStore('emergency');
    const request = store.put(contact);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('emergency', 'readwrite');
    const store = tx.objectStore('emergency');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- QR SHARING ---

export async function getQRShares(): Promise<QRShare[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('qr_shares', 'readonly');
    const store = tx.objectStore('qr_shares');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveQRShare(share: QRShare): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('qr_shares', 'readwrite');
    const store = tx.objectStore('qr_shares');
    const request = store.put(share);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function revokeQRShare(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('qr_shares', 'readwrite');
    const store = tx.objectStore('qr_shares');
    const request = store.get(id);
    request.onsuccess = () => {
      const share = request.result;
      if (share) {
        share.status = 'revoked';
        store.put(share);
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// --- ACADEMIC DEMO MODE DATA ---
// Distinct, safe, fictional documents for professor presentation and grading
export async function loadAcademicDemoData(): Promise<void> {
  const now = new Date();
  
  // 15 days from now for upcoming expiry demonstration
  const expiringSoonDate = new Date(now.getTime() + 15 * 86400000).toISOString().split('T')[0];
  // 1 year from now
  const nextYearDate = new Date(now.getTime() + 365 * 86400000).toISOString().split('T')[0];
  // 20 days ago for expired demonstration
  const expiredDate = new Date(now.getTime() - 20 * 86400000).toISOString().split('T')[0];

  // SVG Data URLs for clean visual display without external network calls
  const createMockCardSvg = (title: string, subtitle: string, accentColor: string, idNum: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#171A20" />
          <stop offset="100%" stop-color="#0B0D10" />
        </linearGradient>
      </defs>
      <rect width="600" height="380" rx="16" fill="url(#bg)" stroke="#222630" stroke-width="2"/>
      <rect x="24" y="24" width="8" height="60" rx="4" fill="${accentColor}" />
      <text x="44" y="48" fill="#F4F5F7" font-family="sans-serif" font-size="20" font-weight="bold">${title}</text>
      <text x="44" y="72" fill="#9299A5" font-family="sans-serif" font-size="13">${subtitle}</text>
      <rect x="44" y="100" width="512" height="1" fill="#222630" />
      <text x="44" y="140" fill="#9299A5" font-family="sans-serif" font-size="12">DOCUMENT ID NUMBER</text>
      <text x="44" y="165" fill="#648BFF" font-family="monospace" font-size="18" font-weight="bold">${idNum}</text>
      <text x="44" y="210" fill="#9299A5" font-family="sans-serif" font-size="12">HOLDER / BENEFICIARY</text>
      <text x="44" y="235" fill="#F4F5F7" font-family="sans-serif" font-size="16" font-weight="600">ALEX J. RIVERS (DEMO)</text>
      <rect x="44" y="270" width="160" height="60" rx="8" fill="#222630" />
      <text x="56" y="295" fill="#9299A5" font-family="sans-serif" font-size="11">SECURITY LEVEL</text>
      <text x="56" y="318" fill="#10B981" font-family="sans-serif" font-size="13" font-weight="bold">ENCRYPTED AT REST</text>
      <text x="556" y="350" fill="#648BFF" text-anchor="end" font-family="sans-serif" font-size="11">DocuVault Academic Demo File</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + window.btoa(svg);
  };

  const demoDocs: DocumentItem[] = [
    {
      id: 'demo_passport_01',
      name: 'International Travel Passport',
      category: 'Identity',
      tags: ['Travel', 'Passport', 'Identity', 'Global'],
      documentDate: '2016-04-12',
      expiryDate: expiringSoonDate, // Expiring in 15 days!
      mimeType: 'image/svg+xml',
      fileSize: 42100,
      dataUrl: createMockCardSvg('REPUBLIC PASSPORT', 'DEPARTMENT OF IMMIGRATION', '#648BFF', 'P9842104-X'),
      ocrText: 'REPUBLIC PASSPORT\nISSUING COUNTRY: DEMO CITIZENSHIP\nDOCUMENT NO: P9842104-X\nSURNAME: RIVERS\nGIVEN NAMES: ALEX J.\nDATE OF BIRTH: 14 NOV 1998\nDATE OF EXPIRY: ' + expiringSoonDate + '\nAUTHORITY: CONSULAR SECTION',
      keyFields: [
        { label: 'Document Number', value: 'P9842104-X' },
        { label: 'Holder Name', value: 'Alex J. Rivers' },
        { label: 'Expiry Date', value: expiringSoonDate },
      ],
      isFavorite: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true,
    },
    {
      id: 'demo_dl_02',
      name: 'State Commercial Driving Licence',
      category: 'Identity',
      tags: ['Driving', 'Identity', 'State Permit'],
      documentDate: '2021-08-10',
      expiryDate: nextYearDate, // Valid
      mimeType: 'image/svg+xml',
      fileSize: 38400,
      dataUrl: createMockCardSvg('MOTOR VEHICLE DRIVER LICENCE', 'DEPARTMENT OF TRANSPORT', '#10B981', 'DL-CA-4029188'),
      ocrText: 'DRIVER LICENCE - CLASS C\nLICENCE NO: DL-CA-4029188\nNAME: ALEX RIVERS\nRESTRICTIONS: NONE\nEXPIRY DATE: ' + nextYearDate,
      keyFields: [
        { label: 'Licence No', value: 'DL-CA-4029188' },
        { label: 'Class', value: 'Class C (Motor Vehicle)' },
        { label: 'Expiry Date', value: nextYearDate },
      ],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true,
    },
    {
      id: 'demo_degree_03',
      name: 'B.Tech Computer Science Degree Certificate',
      category: 'Education',
      description: 'Official University graduation degree and honors diploma',
      tags: ['Degree', 'Academics', 'Computer Science', 'Diploma'],
      documentDate: '2024-05-20',
      expiryDate: null, // NO EXPIRY for educational degrees
      mimeType: 'image/svg+xml',
      fileSize: 45200,
      dataUrl: createMockCardSvg('UNIVERSITY DEGREE OF TECHNOLOGY', 'FACULTY OF COMPUTER SCIENCE & CYBER SECURITY', '#F59E0B', 'UNIV-CS-2024-8841'),
      ocrText: 'UNIVERSITY SENATE CONFERMENT\nTHIS CERTIFIES THAT ALEX J. RIVERS HAS SATISFIED ALL REQUIREMENTS AND IS CONFERRED THE DEGREE OF\nBACHELOR OF TECHNOLOGY IN COMPUTER SCIENCE & CYBER SECURITY\nWITH FIRST CLASS HONORS.\nPERMANENT REGISTRATION NO: UNIV-CS-2024-8841',
      keyFields: [
        { label: 'Registration No', value: 'UNIV-CS-2024-8841' },
        { label: 'Discipline', value: 'Computer Science & Cyber Security' },
        { label: 'Validity', value: 'Permanent (Lifetime)' },
      ],
      isFavorite: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true,
    },
    {
      id: 'demo_health_04',
      name: 'Comprehensive Health Insurance Policy',
      category: 'Health',
      description: 'Annual family medical coverage policy and cashless hospital card',
      tags: ['Health', 'Insurance', 'Medical', 'Cashless Hospitalization'],
      documentDate: '2023-11-10',
      expiryDate: expiredDate, // EXPIRED 20 days ago to test alerts!
      mimeType: 'image/svg+xml',
      fileSize: 48900,
      dataUrl: createMockCardSvg('HEALTHCARE SHIELD POLICY', 'PRIME MEDICAL ASSURANCE', '#EF4444', 'POL-MED-994102'),
      ocrText: 'PRIME HEALTHCARE ASSURANCE POLICY\nPOLICY HOLDER: ALEX J. RIVERS\nPOLICY NO: POL-MED-994102\nSUM INSURED: $50,000 USD\nVALIDITY EXPIRED ON: ' + expiredDate + '\nSTATUS: RENEWAL REQUIRED IMMEDIATELY',
      keyFields: [
        { label: 'Policy Number', value: 'POL-MED-994102' },
        { label: 'Sum Insured', value: '$50,000 USD' },
        { label: 'Expiry Date', value: expiredDate },
      ],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true,
    },
    {
      id: 'demo_lab_05',
      name: 'Annual Blood Work & Metabolic Panel',
      category: 'Health',
      description: 'Complete diagnostic blood profile and metabolic test results',
      tags: ['Health', 'Lab Report', 'Blood Test', 'Diagnostics'],
      documentDate: '2024-10-15',
      expiryDate: null,
      mimeType: 'image/svg+xml',
      fileSize: 39500,
      dataUrl: createMockCardSvg('DIAGNOSTIC PATHOLOGY REPORT', 'METROPOLITAN CLINICAL LAB', '#8B5CF6', 'LAB-REF-77192'),
      ocrText: 'CLINICAL LABORATORY REPORT\nPATIENT: ALEX RIVERS\nAGE/GENDER: 26 / M\nFASTING BLOOD GLUCOSE: 92 mg/dL (NORMAL 70-99)\nTOTAL CHOLESTEROL: 178 mg/dL (DESIRABLE <200)\nVITAMIN D: 42 ng/mL (OPTIMAL 30-100)\nSUMMARY: ALL METABOLIC MARKERS WITHIN HEALTHY PHYSIOLOGICAL RANGE',
      keyFields: [
        { label: 'Lab Reference', value: 'LAB-REF-77192' },
        { label: 'Fasting Glucose', value: '92 mg/dL (Normal)' },
        { label: 'Status', value: 'Healthy Parameters' },
      ],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true,
    },
  ];

  for (const doc of demoDocs) {
    await saveDocument(doc);
  }

  // Add demo family members
  const demoFamily: FamilyMember[] = [
    {
      id: 'fam_01',
      name: 'Elena Rivers',
      email: 'elena.rivers@example.com',
      role: 'editor',
      status: 'accepted',
      invitedAt: '2024-09-01',
      sharedDocIds: ['demo_health_04'],
    },
    {
      id: 'fam_02',
      name: 'Marcus Rivers',
      email: 'marcus.rivers@example.com',
      role: 'viewer',
      status: 'pending',
      invitedAt: '2024-10-20',
      sharedDocIds: ['demo_passport_01'],
    },
  ];

  for (const member of demoFamily) {
    await saveFamilyMember(member);
  }

  // Add demo emergency contact
  const demoEmergency: EmergencyContact = {
    id: 'emg_01',
    name: 'Dr. Sarah Jenkins',
    relationship: 'Family Physician & Emergency Proxy',
    email: 'dr.jenkins@cityclinic.org',
    phone: '+1 (555) 234-5678',
    authorizedDocIds: ['demo_health_04', 'demo_lab_05'],
    accessDurationHours: 24,
    status: 'active',
    createdAt: '2024-10-01',
  };
  await saveEmergencyContact(demoEmergency);

  await addAuditLog('DEMO_DATA_LOADED', 'Loaded fictional academic presentation documents for SEASD evaluation.', 'info');
}

export async function clearAcademicDemoData(): Promise<void> {
  const docs = await getAllDocuments();
  for (const doc of docs) {
    if (doc.isDemo) {
      await deleteDocument(doc.id);
    }
  }

  // Remove demo family & emergency
  const family = await getFamilyMembers();
  for (const m of family) {
    if (m.id.startsWith('fam_')) {
      await deleteFamilyMember(m.id);
    }
  }

  const contacts = await getEmergencyContacts();
  for (const c of contacts) {
    if (c.id.startsWith('emg_')) {
      await deleteEmergencyContact(c.id);
    }
  }

  await addAuditLog('DEMO_DATA_CLEARED', 'Cleared all academic demo data. Vault restored to pristine state.', 'warning');
}
