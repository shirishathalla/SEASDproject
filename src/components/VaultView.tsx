import React, { useState, useMemo } from 'react';
import {
  FolderLock,
  Plus,
  Camera,
  Bot,
  Star,
  ClockAlert,
  HardDrive,
  Layers,
  Sparkles,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  Shield,
  ArrowRight,
} from 'lucide-react';
import type { DocumentItem } from '../utils/storage';
import { DocumentCard } from './DocumentCard';
import { useAuth } from '../context/AuthContext';

interface VaultViewProps {
  documents: DocumentItem[];
  onOpenScan: () => void;
  onOpenAssistant: () => void;
  onViewDocument: (doc: DocumentItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onShareQR: (doc: DocumentItem) => void;
  onUpdateDocument: (doc: DocumentItem) => Promise<void>;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  documents,
  onOpenScan,
  onOpenAssistant,
  onViewDocument,
  onToggleFavorite,
  onDeleteDocument,
  onShareQR,
  onUpdateDocument,
  isDemoMode,
  onToggleDemoMode,
}) => {
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterFavorites, setFilterFavorites] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom category creation state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('docuvault_custom_categories') || '[]');
    } catch {
      return [];
    }
  });

  // Edit metadata modal state
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editExpiry, setEditExpiry] = useState('');

  // Delete confirmation modal state
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // All categories
  const baseCategories = ['All', 'Identity', 'Education', 'Finance', 'Health', 'Personal', 'Other'];
  const allCategories = Array.from(new Set([...baseCategories, ...customCategories]));

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const clean = newCategoryName.trim();
    if (!customCategories.includes(clean)) {
      const updated = [...customCategories, clean];
      setCustomCategories(updated);
      localStorage.setItem('docuvault_custom_categories', JSON.stringify(updated));
    }
    setSelectedCategory(clean);
    setNewCategoryName('');
    setIsAddCategoryOpen(false);
  };

  // Metrics Calculation
  const totalDocuments = documents.length;
  const uniqueCategories = new Set(documents.map((d) => d.category)).size;
  const totalSizeBytes = documents.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
  const storageFormatted =
    totalSizeBytes > 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalSizeBytes / 1024).toFixed(1)} KB`;

  // Expiring soon count (within 30 days)
  const expiringSoonCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return documents.filter((doc) => {
      if (!doc.expiryDate) return false;
      const exp = new Date(doc.expiryDate);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length;
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (selectedCategory !== 'All' && doc.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      // Favorites filter
      if (filterFavorites && !doc.isFavorite) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesDesc = doc.description?.toLowerCase().includes(q);
        const matchesTags = doc.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }
      return true;
    });
  }, [documents, selectedCategory, filterFavorites, searchQuery]);

  // Recent & Favorite lists for quick widgets
  const favoriteDocs = documents.filter((d) => d.isFavorite);
  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Edit Doc Handlers
  const handleStartEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditCategory(doc.category);
    setEditDesc(doc.description || '');
    setEditTags(doc.tags.join(', '));
    setEditExpiry(doc.expiryDate || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    const updated: DocumentItem = {
      ...editingDoc,
      name: editName.trim() || editingDoc.name,
      category: editCategory,
      description: editDesc.trim() || undefined,
      tags: editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      expiryDate: editExpiry ? editExpiry : null,
      updatedAt: new Date().toISOString(),
    };

    await onUpdateDocument(updated);
    setEditingDoc(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. DASHBOARD WELCOME & METRICS HEADER */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#171A20] via-[#12151B] to-[#0B0D10] border border-[#222630] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0B0D10] border border-[#648BFF]/40 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-[#648BFF]/10">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="User Avatar" className="w-full h-full object-cover" />
            ) : (
              <FolderLock className="w-7 h-7 text-[#648BFF]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F4F5F7]">
                Welcome, {user?.fullName?.split(' ')[0] || 'User'}
              </h2>
              {isDemoMode && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                  DEMO ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-[#9299A5] mt-0.5">
              Zero-knowledge personal security wallet • AES-256-GCM encrypted
            </p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenScan}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white text-xs font-semibold transition-all shadow-lg shadow-[#648BFF]/20"
          >
            <Plus className="w-4 h-4" />
            Add Document
          </button>
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#222630] hover:bg-[#2e3442] text-xs font-semibold text-[#F4F5F7] transition-colors border border-[#222630]"
          >
            <Bot className="w-4 h-4 text-[#648BFF]" />
            AI Assistant
          </button>
        </div>
      </div>

      {/* 2. STATS KPI WIDGETS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#171A20] border border-[#222630] flex flex-col justify-between">
          <span className="text-xs text-[#9299A5] flex items-center justify-between">
            Total Documents
            <FolderLock className="w-4 h-4 text-[#648BFF]" />
          </span>
          <p className="text-2xl font-bold font-mono text-[#F4F5F7] mt-2">{totalDocuments}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#171A20] border border-[#222630] flex flex-col justify-between">
          <span className="text-xs text-[#9299A5] flex items-center justify-between">
            Active Categories
            <Layers className="w-4 h-4 text-[#10B981]" />
          </span>
          <p className="text-2xl font-bold font-mono text-[#F4F5F7] mt-2">{uniqueCategories}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#171A20] border border-[#222630] flex flex-col justify-between">
          <span className="text-xs text-[#9299A5] flex items-center justify-between">
            Storage Encrypted
            <HardDrive className="w-4 h-4 text-[#8B5CF6]" />
          </span>
          <p className="text-2xl font-bold font-mono text-[#F4F5F7] mt-2">{storageFormatted}</p>
        </div>

        <div className="p-4 rounded-xl bg-[#171A20] border border-[#222630] flex flex-col justify-between">
          <span className="text-xs text-[#9299A5] flex items-center justify-between">
            Expiring Soon
            <ClockAlert className="w-4 h-4 text-[#F59E0B]" />
          </span>
          <p
            className={`text-2xl font-bold font-mono mt-2 ${
              expiringSoonCount > 0 ? 'text-[#F59E0B]' : 'text-[#F4F5F7]'
            }`}
          >
            {expiringSoonCount}
          </p>
        </div>
      </div>

      {/* 3. CATEGORY PILLS & CONTROLS */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Scrollable Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors border ${
                  selectedCategory === cat
                    ? 'bg-[#171A20] text-[#648BFF] border-[#648BFF]/40 shadow-sm'
                    : 'bg-[#171A20]/40 text-[#9299A5] border-[#222630] hover:text-[#F4F5F7]'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => setIsAddCategoryOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#222630] text-[#9299A5] hover:text-[#648BFF] text-xs font-medium shrink-0 transition-colors flex items-center gap-1"
              title="Create custom category"
            >
              <Plus className="w-3.5 h-3.5" /> Custom
            </button>
          </div>

          {/* Favorites Filter & Search */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                filterFavorites
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
                  : 'bg-[#171A20] text-[#9299A5] border-[#222630] hover:text-white'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${filterFavorites ? 'fill-[#F59E0B]' : ''}`} />
              Favorites ({favoriteDocs.length})
            </button>

            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#9299A5] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter vault..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#171A20] border border-[#222630] rounded-xl text-xs focus:border-[#648BFF] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN DOCUMENTS GRID OR EMPTY STATE */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onView={onViewDocument}
              onToggleFavorite={onToggleFavorite}
              onDelete={(id) => setDeletingDocId(id)}
              onShareQR={onShareQR}
              onEdit={handleStartEdit}
            />
          ))}
        </div>
      ) : (
        /* Section 5 Exact Empty State */
        <div className="p-12 sm:p-16 rounded-3xl bg-[#171A20]/80 border border-[#222630] text-center max-w-xl mx-auto space-y-5 my-8">
          <div className="w-16 h-16 rounded-2xl bg-[#0B0D10] border border-[#222630] flex items-center justify-center mx-auto text-[#648BFF] shadow-inner">
            <FolderLock className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-bold text-lg text-[#F4F5F7]">Your secure vault is ready.</h3>
            <p className="text-xs text-[#9299A5] mt-1.5 leading-relaxed">
              Add your important documents to get started. All documents are encrypted on your device
              with zero server-side exposure.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenScan}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#648BFF]/20"
            >
              <Plus className="w-4 h-4" />
              Add Document
            </button>
            <button
              onClick={onOpenScan}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#222630] hover:bg-[#2c3240] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-[#222630]"
            >
              <Camera className="w-4 h-4 text-[#648BFF]" />
              Scan Document
            </button>
            <button
              onClick={onOpenAssistant}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#222630] hover:bg-[#2c3240] text-[#C5CAD3] hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-[#222630]"
            >
              <Bot className="w-4 h-4 text-[#10B981]" />
              AI Assistant
            </button>
          </div>

          {/* Academic Demo Mode Helper for Professor Review */}
          <div className="pt-4 border-t border-[#222630]/60">
            <button
              onClick={onToggleDemoMode}
              className="text-xs text-[#F59E0B] hover:underline flex items-center justify-center gap-1.5 mx-auto font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Academic Presentation Demo Data (Fictional Samples)
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE CUSTOM CATEGORY --- */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#171A20] border border-[#222630] rounded-2xl p-6 text-[#F4F5F7] shadow-2xl">
            <h4 className="font-bold text-sm mb-1">Create Custom Category</h4>
            <p className="text-xs text-[#9299A5] mb-4">
              Add a specialized category (e.g. "Property", "Tax Returns", "Patents").
            </p>
            <form onSubmit={handleAddCustomCategory} className="space-y-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category Name"
                required
                autoFocus
                className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="w-full py-2 rounded-xl bg-[#222630] text-xs font-medium text-[#9299A5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#648BFF] text-white text-xs font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT DOCUMENT METADATA --- */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#171A20] border border-[#222630] rounded-2xl p-6 text-[#F4F5F7] shadow-2xl">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#648BFF]" />
              Edit Document Metadata
            </h4>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9299A5] mb-1">Document Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[#9299A5] mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                >
                  {allCategories
                    .filter((c) => c !== 'All')
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[#9299A5] mb-1">Expiry Date (Leave empty if permanent)</label>
                <input
                  type="date"
                  value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[#9299A5] mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[#9299A5] mb-1">Optional Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="w-full py-2 rounded-xl bg-[#222630] text-xs font-medium text-[#9299A5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#648BFF] text-white text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: DELETE CONFIRMATION --- */}
      {deletingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#171A20] border border-[#222630] rounded-2xl p-6 text-[#F4F5F7] text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base">Permanently Delete Document?</h4>
              <p className="text-xs text-[#9299A5] mt-1">
                This document and its encrypted ciphertext payload will be purged from your local
                vault. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingDocId(null)}
                className="w-full py-2 rounded-xl bg-[#222630] text-xs font-medium text-[#9299A5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDocument(deletingDocId);
                  setDeletingDocId(null);
                }}
                className="w-full py-2 rounded-xl bg-[#EF4444] text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
