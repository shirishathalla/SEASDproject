import React, { useState } from 'react';
import {
  FileText,
  Star,
  QrCode,
  Download,
  MoreVertical,
  Calendar,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  Tag,
  Shield,
  Edit2,
} from 'lucide-react';
import type { DocumentItem } from '../utils/storage';

interface DocumentCardProps {
  document: DocumentItem;
  onView: (doc: DocumentItem) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onShareQR: (doc: DocumentItem) => void;
  onEdit: (doc: DocumentItem) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  onView,
  onToggleFavorite,
  onDelete,
  onShareQR,
  onEdit,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Compute Expiry Status
  const getExpiryStatus = () => {
    if (!doc.expiryDate) {
      return { label: 'Permanent', color: 'text-[#9299A5] bg-[#222630]', isUrgent: false };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(doc.expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Expired ${Math.abs(diffDays)}d ago`,
        color: 'text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30',
        isUrgent: true,
      };
    } else if (diffDays <= 7) {
      return {
        label: `Urgent: ${diffDays}d left`,
        color: 'text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30 animate-pulse',
        isUrgent: true,
      };
    } else if (diffDays <= 30) {
      return {
        label: `Expires in ${diffDays}d`,
        color: 'text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30',
        isUrgent: false,
      };
    } else {
      return {
        label: `Valid until ${doc.expiryDate}`,
        color: 'text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/30',
        isUrgent: false,
      };
    }
  };

  const expiryStatus = getExpiryStatus();

  // Category Color Map
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'identity':
        return 'text-[#648BFF] bg-[#648BFF]/10 border-[#648BFF]/30';
      case 'education':
        return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
      case 'finance':
        return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30';
      case 'health':
        return 'text-[#EC4899] bg-[#EC4899]/10 border-[#EC4899]/30';
      case 'personal':
        return 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30';
      default:
        return 'text-[#9299A5] bg-[#222630] border-[#222630]';
    }
  };

  // Download Decrypted File
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = window.document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.name.endsWith('.pdf') || doc.name.endsWith('.jpg') || doc.name.endsWith('.png')
      ? doc.name
      : `${doc.name}.${doc.mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`;
    link.click();
  };

  return (
    <div
      onClick={() => onView(doc)}
      className="group relative bg-[#171A20] hover:bg-[#1a1e26] border border-[#222630] hover:border-[#648BFF]/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-[#0B0D10]/50"
    >
      <div>
        {/* Top Badges & Favorite Button */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${getCategoryColor(
                doc.category
              )}`}
            >
              {doc.category}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg ${expiryStatus.color}`}>
              {expiryStatus.label}
            </span>
            {doc.isDemo && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                DEMO
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(doc.id);
              }}
              className="p-1 rounded-lg text-[#9299A5] hover:text-[#F59E0B] transition-colors"
              title={doc.isFavorite ? 'Remove favorite' : 'Mark as favorite'}
            >
              <Star
                className={`w-4 h-4 ${
                  doc.isFavorite ? 'fill-[#F59E0B] text-[#F59E0B]' : ''
                }`}
              />
            </button>

            {/* More Menu Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1 rounded-lg text-[#9299A5] hover:text-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-7 z-20 w-36 bg-[#0B0D10] border border-[#222630] rounded-xl shadow-xl py-1 text-xs"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(doc);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[#C5CAD3] hover:bg-[#171A20] hover:text-white flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Metadata
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onShareQR(doc);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[#C5CAD3] hover:bg-[#171A20] hover:text-white flex items-center gap-2"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#648BFF]" /> Share via QR
                  </button>
                  <div className="h-px bg-[#222630] my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(doc.id);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Thumbnail / Icon */}
        <div className="w-full h-32 rounded-xl bg-[#0B0D10] border border-[#222630] overflow-hidden flex items-center justify-center mb-3 relative group-hover:border-[#648BFF]/30 transition-colors">
          {doc.dataUrl.startsWith('data:image/') ? (
            <img
              src={doc.dataUrl}
              alt={doc.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-3">
              <FileText className="w-10 h-10 text-[#648BFF] mb-1.5" />
              <span className="text-[11px] font-mono text-[#9299A5]">PDF Document</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10]/80 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Title & Description */}
        <h4 className="font-bold text-sm text-[#F4F5F7] truncate mb-1" title={doc.name}>
          {doc.name}
        </h4>
        {doc.description && (
          <p className="text-xs text-[#9299A5] line-clamp-1 mb-2 font-normal">
            {doc.description}
          </p>
        )}

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-3">
            {doc.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B0D10] text-[#9299A5] border border-[#222630]"
              >
                #{tag}
              </span>
            ))}
            {doc.tags.length > 3 && (
              <span className="text-[10px] text-[#9299A5]">+{doc.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Quick Actions */}
      <div className="pt-3 border-t border-[#222630] flex items-center justify-between text-xs text-[#9299A5]">
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <Calendar className="w-3.5 h-3.5" />
          <span>{doc.documentDate}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShareQR(doc);
            }}
            className="p-1.5 rounded-lg bg-[#222630] hover:bg-[#648BFF] hover:text-white transition-colors"
            title="Create temporary secure QR code"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-[#222630] hover:bg-[#10B981] hover:text-white transition-colors"
            title="Download decrypted file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
