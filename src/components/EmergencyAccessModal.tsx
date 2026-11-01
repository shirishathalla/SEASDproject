import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  UserCheck,
  Shield,
  Clock,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Phone,
  Mail,
  HeartPulse,
} from 'lucide-react';
import type { DocumentItem, EmergencyContact } from '../utils/storage';
import {
  getEmergencyContacts,
  saveEmergencyContact,
  deleteEmergencyContact,
  addAuditLog,
} from '../utils/storage';

interface EmergencyAccessModalProps {
  documents: DocumentItem[];
  isOpen: boolean;
  onClose: () => void;
  onViewDocument: (doc: DocumentItem) => void;
}

export const EmergencyAccessModal: React.FC<EmergencyAccessModalProps> = ({
  documents,
  isOpen,
  onClose,
  onViewDocument,
}) => {
  if (!isOpen) return null;

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Add Form
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [accessDurationHours, setAccessDurationHours] = useState(24);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadContacts = async () => {
    const list = await getEmergencyContacts();
    setContacts(list);
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      return setErrorMsg('Name, email, and phone are required.');
    }
    if (selectedDocIds.length === 0) {
      return setErrorMsg('Please select at least one document designated for emergency access.');
    }

    try {
      const contact: EmergencyContact = {
        id: `emg_${Date.now()}`,
        name: name.trim(),
        relationship: relationship.trim() || 'Emergency Proxy',
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        authorizedDocIds: selectedDocIds,
        accessDurationHours,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await saveEmergencyContact(contact);
      await addAuditLog(
        'EMERGENCY_CONTACT_ADDED',
        `Designated ${contact.name} (${contact.relationship}) for emergency access to ${selectedDocIds.length} document(s).`,
        'warning'
      );

      setIsAddOpen(false);
      setName('');
      setRelationship('');
      setEmail('');
      setPhone('');
      setSelectedDocIds([]);
      setErrorMsg(null);
      await loadContacts();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save emergency contact.');
    }
  };

  const handleRevokeContact = async (id: string, contactName: string) => {
    if (confirm(`Revoke emergency access for ${contactName}?`)) {
      await deleteEmergencyContact(id);
      await addAuditLog(
        'EMERGENCY_CONTACT_REVOKED',
        `Revoked emergency access for ${contactName}.`,
        'warning'
      );
      await loadContacts();
    }
  };

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#171A20] border border-[#222630] rounded-2xl shadow-2xl p-5 sm:p-7 text-[#F4F5F7] relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222630] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Emergency Access Protocol</h3>
              <p className="text-xs text-[#9299A5]">
                Designate trusted emergency proxies for medical emergencies or incapacitation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9299A5] hover:text-white hover:bg-[#222630] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 rounded-xl bg-[#0B0D10] border border-[#222630] text-xs text-[#9299A5] mb-5 flex items-start gap-3">
          <Shield className="w-4 h-4 text-[#648BFF] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#F4F5F7] block">
              Strict Principle of Least Privilege
            </span>
            Emergency contacts receive time-limited, verifiable access strictly to the documents you
            explicitly select (such as Blood Group ID, Medical Insurance, Emergency Directives).
            They NEVER receive full access to your personal vault.
          </div>
        </div>

        {!isAddOpen ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[#F4F5F7]">
                Designated Emergency Proxies ({contacts.length})
              </h4>
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EF4444] hover:bg-[#dc2626] text-white text-xs font-semibold transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Contact
              </button>
            </div>

            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 rounded-xl bg-[#0B0D10] border border-[#222630] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#F4F5F7]">{contact.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#222630] text-[#648BFF]">
                          {contact.relationship}
                        </span>
                        <span className="text-[10px] font-mono text-[#10B981]">
                          Active ({contact.accessDurationHours}h window)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[#9299A5] mt-1 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {contact.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-[#C5CAD3]">
                        Authorized Documents: {contact.authorizedDocIds.length} designated document(s)
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeContact(contact.id, contact.name)}
                      className="px-3 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] text-xs font-medium self-start sm:self-auto transition-colors"
                    >
                      Revoke Access
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#0B0D10] rounded-xl border border-[#222630] space-y-2">
                <HeartPulse className="w-8 h-8 text-[#9299A5] mx-auto" />
                <p className="text-xs text-[#9299A5]">
                  No emergency contacts designated. Add a family physician, spouse, or emergency contact.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Add Emergency Contact Form */
          <form onSubmit={handleAddContact} className="space-y-4">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-[#EF4444]/15 text-[#EF4444] text-xs">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Sarah Jenkins"
                  required
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Relationship</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Family Physician / Sister / Guardian"
                  required
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah.jenkins@hospital.org"
                  required
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  required
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#C5CAD3] mb-1.5">
                Designate Emergency Documents ({selectedDocIds.length} selected)
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-[#0B0D10] border border-[#222630] rounded-xl">
                {documents.map((d) => (
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
                    <span className="text-[10px] text-[#9299A5] ml-auto font-mono">
                      {d.category}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-full py-2 rounded-xl bg-[#222630] text-xs font-medium text-[#9299A5]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[#EF4444] text-white text-xs font-semibold"
              >
                Save Emergency Contact
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
