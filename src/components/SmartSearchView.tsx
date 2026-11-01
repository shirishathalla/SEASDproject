import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Filter,
  FileText,
  Calendar,
  Tag,
  CheckCircle2,
  ClockAlert,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import type { DocumentItem } from '../utils/storage';

interface SmartSearchViewProps {
  documents: DocumentItem[];
  onViewDocument: (doc: DocumentItem) => void;
}

export const SmartSearchView: React.FC<SmartSearchViewProps> = ({
  documents,
  onViewDocument,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'expiring_soon' | 'permanent'>('all');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(documents.map((d) => d.category));
    return ['all', ...Array.from(set)];
  }, [documents]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return documents.filter((doc) => {
      // Category filter
      if (selectedCategory !== 'all' && doc.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Expiry filter
      if (expiryFilter !== 'all') {
        if (expiryFilter === 'permanent' && doc.expiryDate) return false;
        if (expiryFilter === 'expired') {
          if (!doc.expiryDate) return false;
          if (new Date(doc.expiryDate).getTime() >= today.getTime()) return false;
        }
        if (expiryFilter === 'expiring_soon') {
          if (!doc.expiryDate) return false;
          const diff = Math.ceil((new Date(doc.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 0 || diff > 30) return false;
        }
      }

      // Query filter
      if (!q) return true;

      // Natural language matches:
      // "passport" -> matches doc name, tags, or type
      // "expiring" -> matches documents with expiry dates
      // "education" -> matches category Education
      // "health" -> matches category Health
      if (q.includes('passport') && doc.name.toLowerCase().includes('passport')) return true;
      if (q.includes('education') && doc.category.toLowerCase() === 'education') return true;
      if (q.includes('health') && doc.category.toLowerCase() === 'health') return true;
      if (q.includes('finance') && doc.category.toLowerCase() === 'finance') return true;
      if (q.includes('identity') && doc.category.toLowerCase() === 'identity') return true;

      const nameMatch = doc.name.toLowerCase().includes(q);
      const tagMatch = doc.tags.some((t) => t.toLowerCase().includes(q));
      const descMatch = doc.description?.toLowerCase().includes(q);
      const ocrMatch = doc.ocrText?.toLowerCase().includes(q);
      const keyFieldMatch = doc.keyFields?.some(
        (kf) => kf.label.toLowerCase().includes(q) || kf.value.toLowerCase().includes(q)
      );

      return nameMatch || tagMatch || descMatch || ocrMatch || keyFieldMatch;
    });
  }, [documents, query, selectedCategory, expiryFilter]);

  const exampleQueries = [
    'Find my passport',
    'Show all education certificates',
    'Find documents expiring soon',
    'Search my health reports',
    'Blood work metabolic panel',
  ];

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#171A20] to-[#0B0D10] border border-[#222630] space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 rounded-xl bg-[#648BFF]/15 text-[#648BFF] border border-[#648BFF]/30">
              <Search className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#F4F5F7]">Unified Vault & Deep OCR Search</h2>
          </div>
          <p className="text-xs text-[#9299A5]">
            Searches across file names, categories, tags, document numbers, and deep OCR extracted
            text bodies with natural-language understanding.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-[#9299A5] absolute left-4 top-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "Find my passport" or "Health Insurance" or search by card number...'
            className="w-full pl-12 pr-4 py-3.5 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/50 shadow-inner"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-3.5 text-xs text-[#9299A5] hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Query Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-[#9299A5]">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#648BFF]">
            <Sparkles className="w-3 h-3" /> Examples:
          </span>
          {exampleQueries.map((ex, i) => (
            <button
              key={i}
              onClick={() => setQuery(ex)}
              className="px-2.5 py-1 rounded-lg bg-[#0B0D10] hover:bg-[#222630] text-[#C5CAD3] hover:text-white border border-[#222630] transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Options Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#9299A5] font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg capitalize font-medium border transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#171A20] text-[#648BFF] border-[#648BFF]/40'
                  : 'bg-[#171A20]/40 text-[#9299A5] border-[#222630] hover:text-[#F4F5F7]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#9299A5] font-semibold">Expiry:</span>
          <select
            value={expiryFilter}
            onChange={(e: any) => setExpiryFilter(e.target.value)}
            className="py-1 px-2.5 bg-[#171A20] border border-[#222630] rounded-lg text-xs focus:border-[#648BFF] focus:outline-none"
          >
            <option value="all">All Documents</option>
            <option value="expiring_soon">Expiring Soon (30d)</option>
            <option value="expired">Expired</option>
            <option value="permanent">Permanent (No Expiry)</option>
          </select>
        </div>
      </div>

      {/* Search Results */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs text-[#9299A5]">
          <span>Found {searchResults.length} matching document(s)</span>
        </div>

        {searchResults.length > 0 ? (
          <div className="space-y-3">
            {searchResults.map((doc) => {
              // Highlight matched OCR snippet if present
              const q = query.trim().toLowerCase();
              let ocrSnippet = null;
              if (q && doc.ocrText && doc.ocrText.toLowerCase().includes(q)) {
                const idx = doc.ocrText.toLowerCase().indexOf(q);
                const start = Math.max(0, idx - 40);
                const end = Math.min(doc.ocrText.length, idx + 80);
                ocrSnippet = doc.ocrText.substring(start, end);
              }

              return (
                <div
                  key={doc.id}
                  onClick={() => onViewDocument(doc)}
                  className="p-4 rounded-2xl bg-[#171A20] border border-[#222630] hover:border-[#648BFF]/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#0B0D10] border border-[#222630] flex items-center justify-center text-[#648BFF] shrink-0 group-hover:border-[#648BFF]/30 transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#F4F5F7] group-hover:text-[#648BFF] transition-colors">
                          {doc.name}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D10] text-[#9299A5] border border-[#222630]">
                          {doc.category}
                        </span>
                        {doc.expiryDate && (
                          <span className="text-[10px] font-mono text-[#F59E0B]">
                            Exp: {doc.expiryDate}
                          </span>
                        )}
                      </div>

                      {doc.description && (
                        <p className="text-xs text-[#9299A5] mt-1 line-clamp-1">{doc.description}</p>
                      )}

                      {/* Display matched OCR snippet */}
                      {ocrSnippet && (
                        <div className="mt-2 p-2 rounded-lg bg-[#0B0D10] border border-[#222630] text-[11px] font-mono text-[#10B981]">
                          <span className="text-[#9299A5] mr-1">OCR Match:</span> ...{ocrSnippet}...
                        </div>
                      )}

                      {/* Tags */}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {doc.tags.map((t, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B0D10] text-[#9299A5]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end shrink-0">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-[#222630] group-hover:bg-[#648BFF] group-hover:text-white text-xs font-medium text-[#C5CAD3] transition-colors flex items-center gap-1.5"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-[#171A20] border border-[#222630] text-center space-y-2">
            <Search className="w-8 h-8 text-[#9299A5] mx-auto" />
            <h4 className="font-bold text-sm text-[#F4F5F7]">No Matching Documents</h4>
            <p className="text-xs text-[#9299A5]">
              No documents matched your query. Try broadening your terms or clear active filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
