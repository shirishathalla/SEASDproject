import React, { useState } from 'react';
import {
  HeartPulse,
  Activity,
  FileCheck,
  Plus,
  ShieldAlert,
  Sparkles,
  Lock,
  Search,
  AlertCircle,
  Eye,
  Calendar,
} from 'lucide-react';
import type { DocumentItem } from '../utils/storage';

interface HealthVaultViewProps {
  documents: DocumentItem[];
  onViewDocument: (doc: DocumentItem) => void;
  onOpenScan: () => void;
}

type HealthSubtype = 'all' | 'lab' | 'prescription' | 'insurance' | 'vaccine';

export const HealthVaultView: React.FC<HealthVaultViewProps> = ({
  documents,
  onViewDocument,
  onOpenScan,
}) => {
  const [subtype, setSubtype] = useState<HealthSubtype>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiConsentGiven, setAiConsentGiven] = useState(false);

  // Filter health documents
  const healthDocs = documents.filter(
    (doc) =>
      doc.category.toLowerCase() === 'health' ||
      doc.tags.some((t) => ['health', 'medical', 'prescription', 'doctor', 'hospital', 'lab'].includes(t.toLowerCase()))
  );

  const filteredDocs = healthDocs.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.ocrText && doc.ocrText.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (subtype === 'all') return true;
    if (subtype === 'lab') {
      return (
        doc.name.toLowerCase().includes('lab') ||
        doc.name.toLowerCase().includes('blood') ||
        doc.tags.includes('Lab Report')
      );
    }
    if (subtype === 'prescription') {
      return (
        doc.name.toLowerCase().includes('prescription') ||
        doc.tags.includes('Prescription')
      );
    }
    if (subtype === 'insurance') {
      return (
        doc.name.toLowerCase().includes('insurance') ||
        doc.tags.includes('Insurance')
      );
    }
    if (subtype === 'vaccine') {
      return (
        doc.name.toLowerCase().includes('vaccin') ||
        doc.tags.includes('Vaccination')
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#EC4899]/15 via-[#171A20] to-[#0B0D10] border border-[#EC4899]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40">
              <HeartPulse className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#F4F5F7]">Private Health Vault</h2>
          </div>
          <p className="text-xs text-[#9299A5] max-w-xl leading-relaxed">
            Isolated cryptographic partition for sensitive clinical records, pathology reports,
            doctor prescriptions, and health insurance. External AI querying strictly enforces an
            explicit privacy consent boundary.
          </p>
        </div>

        <button
          onClick={onOpenScan}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EC4899] hover:bg-[#d63384] text-white text-xs font-semibold transition-all shadow-lg shadow-[#EC4899]/20 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Health Record
        </button>
      </div>

      {/* AI Privacy Mandate Banner */}
      <div className="p-4 rounded-xl bg-[#0B0D10] border border-[#222630] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-[#648BFF] shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-[#F4F5F7] block">
              Medical Privacy & Zero AI Exfiltration Mandate
            </span>
            <span className="text-[#9299A5]">
              Health documents are stored locally in your encrypted IndexedDB. No health data is sent
              to Gemini AI unless you grant explicit one-time session consent.
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#C5CAD3] cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={aiConsentGiven}
            onChange={(e) => setAiConsentGiven(e.target.checked)}
            className="rounded border-[#222630] text-[#648BFF]"
          />
          <span className="font-medium">Consent to AI Assistant Querying</span>
        </label>
      </div>

      {/* Subcategory Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all' as HealthSubtype, label: 'All Records' },
            { id: 'lab' as HealthSubtype, label: 'Lab Reports' },
            { id: 'prescription' as HealthSubtype, label: 'Prescriptions' },
            { id: 'insurance' as HealthSubtype, label: 'Medical Insurance' },
            { id: 'vaccine' as HealthSubtype, label: 'Vaccination' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSubtype(pill.id)}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors border ${
                subtype === pill.id
                  ? 'bg-[#171A20] text-[#EC4899] border-[#EC4899]/40'
                  : 'bg-[#171A20]/50 text-[#9299A5] border-[#222630] hover:text-[#F4F5F7]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#9299A5] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search health records..."
            className="w-full pl-9 pr-3 py-2 bg-[#171A20] border border-[#222630] rounded-xl text-xs focus:border-[#EC4899] focus:outline-none"
          />
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onViewDocument(doc)}
              className="p-4 rounded-2xl bg-[#171A20] border border-[#222630] hover:border-[#EC4899]/40 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EC4899]/15 text-[#EC4899] border border-[#EC4899]/30">
                    Health
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#9299A5]">
                    <Calendar className="w-3 h-3" />
                    <span>{doc.documentDate}</span>
                  </div>
                </div>

                <h4 className="font-bold text-sm text-[#F4F5F7] group-hover:text-[#EC4899] transition-colors truncate mb-1">
                  {doc.name}
                </h4>
                {doc.description && (
                  <p className="text-xs text-[#9299A5] line-clamp-2 mb-3">{doc.description}</p>
                )}

                {doc.keyFields && doc.keyFields.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#0B0D10] border border-[#222630] mb-3 space-y-1">
                    {doc.keyFields.slice(0, 2).map((kf, i) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span className="text-[#9299A5]">{kf.label}:</span>
                        <span className="font-mono text-[#F4F5F7] truncate max-w-[140px]">
                          {kf.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#222630] flex items-center justify-between text-xs text-[#9299A5]">
                <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                <span className="flex items-center gap-1 text-[#648BFF] group-hover:translate-x-0.5 transition-transform">
                  View Record <Eye className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#171A20] border border-[#222630] text-center space-y-3">
          <HeartPulse className="w-10 h-10 text-[#EC4899]/40 mx-auto" />
          <h4 className="font-bold text-base text-[#F4F5F7]">No Health Records Found</h4>
          <p className="text-xs text-[#9299A5] max-w-sm mx-auto">
            Upload your medical prescriptions, blood test results, or health insurance cards to keep
            them organized and securely encrypted.
          </p>
        </div>
      )}
    </div>
  );
};
