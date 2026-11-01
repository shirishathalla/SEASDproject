import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  FileText,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Share2,
  Mail,
  Send,
} from 'lucide-react';
import type { DocumentItem, FamilyMember } from '../utils/storage';
import {
  getFamilyMembers,
  saveFamilyMember,
  deleteFamilyMember,
  addAuditLog,
} from '../utils/storage';

interface FamilyVaultViewProps {
  documents: DocumentItem[];
  onViewDocument: (doc: DocumentItem) => void;
}

export const FamilyVaultView: React.FC<FamilyVaultViewProps> = ({
  documents,
  onViewDocument,
}) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);

  // Invite Form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    const data = await getFamilyMembers();
    setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      return setErrorMsg('Name and email are required.');
    }

    try {
      const newMember: FamilyMember = {
        id: `fam_${Date.now()}`,
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        status: 'pending',
        invitedAt: new Date().toISOString().split('T')[0],
        sharedDocIds: selectedDocIds,
      };

      await saveFamilyMember(newMember);
      await addAuditLog(
        'FAMILY_INVITE_SENT',
        `Invited ${newMember.email} as ${newMember.role} with ${selectedDocIds.length} shared document(s).`,
        'success'
      );

      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setSelectedDocIds([]);
      setErrorMsg(null);
      await loadMembers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save family invitation.');
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (confirm(`Revoke all family access for ${name}?`)) {
      await deleteFamilyMember(id);
      await addAuditLog('FAMILY_ACCESS_REVOKED', `Revoked access for family member ${name}.`, 'warning');
      await loadMembers();
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // Shared documents across family
  const allSharedDocIds = Array.from(new Set(members.flatMap((m) => m.sharedDocIds)));
  const sharedDocs = documents.filter((doc) => allSharedDocIds.includes(doc.id));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#171A20] to-[#0B0D10] border border-[#222630] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-[#648BFF]/15 text-[#648BFF] border border-[#648BFF]/30">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#F4F5F7]">Family Vault & Access Control</h2>
          </div>
          <p className="text-xs text-[#9299A5] max-w-xl leading-relaxed">
            Share select identity and health documents with verified family members. Every family
            member maintains a completely private personal vault; only documents you explicitly grant
            access to are visible.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white text-xs font-semibold transition-all shadow-lg shadow-[#648BFF]/20 self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Invite Family Member
        </button>
      </div>

      {/* Grid: Family Members & Shared Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Family Members List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#F4F5F7]">Authorized Members ({members.length})</h3>
            <span className="text-[10px] font-mono text-[#9299A5]">Role-Based Access</span>
          </div>

          {members.length > 0 ? (
            <div className="space-y-2.5">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 rounded-xl bg-[#171A20] border border-[#222630] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F4F5F7] truncate">{member.name}</span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          member.role === 'editor'
                            ? 'bg-[#10B981]/20 text-[#10B981]'
                            : 'bg-[#648BFF]/20 text-[#648BFF]'
                        }`}
                      >
                        {member.role}
                      </span>
                    </div>
                    <span className="text-[#9299A5] truncate block mt-0.5">{member.email}</span>
                    <span className="text-[10px] text-[#9299A5] mt-1 block">
                      {member.sharedDocIds.length} shared document(s)
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    className="p-1.5 rounded-lg text-[#9299A5] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors shrink-0"
                    title="Revoke member access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#171A20] border border-[#222630] text-center text-xs text-[#9299A5]">
              No family members invited yet. Invite your spouse, parent, or guardian to share critical documents.
            </div>
          )}
        </div>

        {/* Right: Shared Documents View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#F4F5F7]">Shared Documents ({sharedDocs.length})</h3>
            <span className="text-[10px] font-mono text-[#10B981]">End-to-End Segregated</span>
          </div>

          {sharedDocs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sharedDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onViewDocument(doc)}
                  className="p-3.5 rounded-xl bg-[#171A20] border border-[#222630] hover:border-[#648BFF]/40 cursor-pointer transition-all flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0B0D10] flex items-center justify-center text-[#648BFF] shrink-0 border border-[#222630]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-[#F4F5F7] truncate">{doc.name}</h4>
                    <span className="text-[10px] text-[#9299A5] block mt-0.5">{doc.category}</span>
                    {doc.expiryDate && (
                      <span className="text-[10px] font-mono text-[#F59E0B] block mt-1">
                        Expiry: {doc.expiryDate}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#171A20] border border-[#222630] text-center space-y-2">
              <Share2 className="w-8 h-8 text-[#9299A5] mx-auto" />
              <p className="text-xs text-[#9299A5]">
                No documents are currently shared with family members.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#171A20] border border-[#222630] rounded-2xl p-6 text-[#F4F5F7] shadow-2xl">
            <h3 className="font-bold text-base mb-1">Invite Family Member</h3>
            <p className="text-xs text-[#9299A5] mb-4">
              Authorized members can view or manage only the documents selected below.
            </p>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Full Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Elena Rivers"
                  required
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="elena@example.com"
                  required
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Role & Permission</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm"
                >
                  <option value="viewer">Viewer (Read-only access)</option>
                  <option value="editor">Editor (Can upload family documents)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1.5">
                  Select Documents to Share ({selectedDocIds.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-[#0B0D10] border border-[#222630] rounded-xl">
                  {documents.length > 0 ? (
                    documents.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#171A20] cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(d.id)}
                          onChange={() => toggleDocSelection(d.id)}
                          className="rounded border-[#222630] text-[#648BFF]"
                        />
                        <span className="truncate text-[#C5CAD3]">{d.name}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-[11px] text-[#9299A5] text-center py-2">
                      No documents available to share.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-[#222630] text-xs font-medium text-[#9299A5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#648BFF] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
