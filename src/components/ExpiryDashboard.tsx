import React, { useState } from 'react';
import {
  ClockAlert,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Bell,
  ArrowRight,
  Filter,
  Shield,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { DocumentItem } from '../utils/storage';

interface ExpiryDashboardProps {
  documents: DocumentItem[];
  onViewDocument: (doc: DocumentItem) => void;
  onOpenScan: () => void;
}

type ExpiryFilter = 'all' | 'expired' | 'urgent' | 'soon' | 'valid';

export const ExpiryDashboard: React.FC<ExpiryDashboardProps> = ({
  documents,
  onViewDocument,
  onOpenScan,
}) => {
  const [filter, setFilter] = useState<ExpiryFilter>('all');
  const [reminderConfig, setReminderConfig] = useState({
    remind30Days: true,
    remind15Days: true,
    remind7Days: true,
    remind1Day: true,
  });

  // Filter only documents with genuine applicable expiry dates
  const expiryTrackedDocs = documents.filter((doc) => !!doc.expiryDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const analyzedDocs = expiryTrackedDocs.map((doc) => {
    const exp = new Date(doc.expiryDate!);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: 'expired' | 'urgent' | 'soon' | 'valid' = 'valid';
    if (diffDays < 0) status = 'expired';
    else if (diffDays <= 7) status = 'urgent';
    else if (diffDays <= 30) status = 'soon';

    return {
      doc,
      diffDays,
      status,
    };
  });

  // Sort: expired first, then soonest expiring
  analyzedDocs.sort((a, b) => a.diffDays - b.diffDays);

  const filteredDocs = analyzedDocs.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const expiredCount = analyzedDocs.filter((d) => d.status === 'expired').length;
  const urgentCount = analyzedDocs.filter((d) => d.status === 'urgent').length;
  const soonCount = analyzedDocs.filter((d) => d.status === 'soon').length;
  const validCount = analyzedDocs.filter((d) => d.status === 'valid').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#171A20] to-[#0B0D10] border border-[#222630] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
              <ClockAlert className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#F4F5F7]">Expiry & Renewal Management</h2>
          </div>
          <p className="text-xs text-[#9299A5] max-w-xl leading-relaxed">
            Tracks only documents with applicable legal validity (Passport, Driving Licence,
            Insurance policies). Permanent identity cards and degrees are kept free of artificial expiry.
          </p>
        </div>

        {/* Quick reminder settings toggle */}
        <div className="p-3 rounded-xl bg-[#0B0D10] border border-[#222630] text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[#C5CAD3] font-semibold">
            <Bell className="w-3.5 h-3.5 text-[#648BFF]" />
            Active Reminder Intervals
          </div>
          <div className="flex gap-2">
            {['30d', '15d', '7d', '1d'].map((interval) => (
              <span
                key={interval}
                className="px-2 py-0.5 rounded bg-[#171A20] text-[#10B981] font-mono text-[11px] border border-[#222630]"
              >
                ✓ {interval}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter('expired')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filter === 'expired'
              ? 'bg-[#EF4444]/15 border-[#EF4444]'
              : 'bg-[#171A20] border-[#222630] hover:border-[#EF4444]/50'
          }`}
        >
          <span className="text-xs text-[#9299A5] flex items-center justify-between">
            Expired
            <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
          </span>
          <p className="text-2xl font-bold font-mono text-[#EF4444] mt-1">{expiredCount}</p>
        </button>

        <button
          onClick={() => setFilter('urgent')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filter === 'urgent'
              ? 'bg-[#EF4444]/15 border-[#EF4444]'
              : 'bg-[#171A20] border-[#222630] hover:border-[#EF4444]/50'
          }`}
        >
          <span className="text-xs text-[#9299A5] flex items-center justify-between">
            Within 7 Days
            <Clock className="w-3.5 h-3.5 text-[#EF4444]" />
          </span>
          <p className="text-2xl font-bold font-mono text-[#EF4444] mt-1">{urgentCount}</p>
        </button>

        <button
          onClick={() => setFilter('soon')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filter === 'soon'
              ? 'bg-[#F59E0B]/15 border-[#F59E0B]'
              : 'bg-[#171A20] border-[#222630] hover:border-[#F59E0B]/50'
          }`}
        >
          <span className="text-xs text-[#9299A5] flex items-center justify-between">
            Within 30 Days
            <Calendar className="w-3.5 h-3.5 text-[#F59E0B]" />
          </span>
          <p className="text-2xl font-bold font-mono text-[#F59E0B] mt-1">{soonCount}</p>
        </button>

        <button
          onClick={() => setFilter('valid')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filter === 'valid'
              ? 'bg-[#10B981]/15 border-[#10B981]'
              : 'bg-[#171A20] border-[#222630] hover:border-[#10B981]/50'
          }`}
        >
          <span className="text-xs text-[#9299A5] flex items-center justify-between">
            Valid
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
          </span>
          <p className="text-2xl font-bold font-mono text-[#10B981] mt-1">{validCount}</p>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-[#171A20] p-1 rounded-xl border border-[#222630] text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'all' ? 'bg-[#222630] text-[#648BFF]' : 'text-[#9299A5] hover:text-white'
            }`}
          >
            All Tracked ({expiryTrackedDocs.length})
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'expired' ? 'bg-[#222630] text-[#EF4444]' : 'text-[#9299A5] hover:text-white'
            }`}
          >
            Expired ({expiredCount})
          </button>
          <button
            onClick={() => setFilter('soon')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'soon' ? 'bg-[#222630] text-[#F59E0B]' : 'text-[#9299A5] hover:text-white'
            }`}
          >
            Expiring Soon ({urgentCount + soonCount})
          </button>
        </div>

        <button
          onClick={onOpenScan}
          className="text-xs px-3 py-1.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-medium transition-colors shadow-sm"
        >
          + Track New Document
        </button>
      </div>

      {/* Document List */}
      {filteredDocs.length > 0 ? (
        <div className="space-y-3">
          {filteredDocs.map(({ doc, diffDays, status }) => (
            <div
              key={doc.id}
              onClick={() => onViewDocument(doc)}
              className="p-4 rounded-2xl bg-[#171A20] border border-[#222630] hover:border-[#648BFF]/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    status === 'expired'
                      ? 'bg-[#EF4444]/15 text-[#EF4444]'
                      : status === 'urgent'
                      ? 'bg-[#EF4444]/15 text-[#EF4444] animate-pulse'
                      : status === 'soon'
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                      : 'bg-[#10B981]/15 text-[#10B981]'
                  }`}
                >
                  <ClockAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-[#F4F5F7]">{doc.name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D10] text-[#9299A5] border border-[#222630]">
                      {doc.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#9299A5] mt-1">
                    {status === 'expired'
                      ? `Lapsed on ${doc.expiryDate} (${Math.abs(diffDays)} days ago) - Immediate renewal required`
                      : `Expires on ${doc.expiryDate} (${diffDays} days remaining)`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <span
                  className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${
                    status === 'expired'
                      ? 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30'
                      : status === 'urgent'
                      ? 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30'
                      : status === 'soon'
                      ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30'
                      : 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30'
                  }`}
                >
                  {status === 'expired'
                    ? 'EXPIRED'
                    : status === 'urgent'
                    ? 'RENEW URGENT'
                    : status === 'soon'
                    ? 'EXPIRING SOON'
                    : 'VALID'}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDocument(doc);
                  }}
                  className="p-2 rounded-xl bg-[#222630] hover:bg-[#2e3442] text-[#9299A5] hover:text-white"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#171A20] border border-[#222630] text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#222630] flex items-center justify-center mx-auto text-[#9299A5]">
            <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
          </div>
          <h4 className="font-bold text-base text-[#F4F5F7]">No Documents In This Expiry Category</h4>
          <p className="text-xs text-[#9299A5] max-w-sm mx-auto">
            {expiryTrackedDocs.length === 0
              ? 'None of your documents currently have tracked expiration dates. You can add expiration dates when uploading applicable documents.'
              : 'All your tracked renewal deadlines are currently up to date.'}
          </p>
        </div>
      )}
    </div>
  );
};
