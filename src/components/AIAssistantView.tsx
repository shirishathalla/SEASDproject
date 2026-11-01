import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  FileText,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  RotateCw,
  HelpCircle,
  CheckCircle2,
  CheckSquare,
} from 'lucide-react';
import type { DocumentItem } from '../utils/storage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citedDocIds?: string[];
}

interface AIAssistantViewProps {
  documents: DocumentItem[];
  onViewDocument: (doc: DocumentItem) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  documents,
  onViewDocument,
}) => {
  // Privacy Consent State
  const [hasConsented, setHasConsented] = useState<boolean>(() => {
    return localStorage.getItem('docuvault_ai_consent') === 'true';
  });

  // Selected Documents to authorize for AI querying (User Controlled!)
  const [consentedDocIds, setConsentedDocIds] = useState<string[]>(() => {
    return documents.map((d) => d.id);
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am DocuVault AI Assistant. I can help analyze your authorized documents, extract renewal dates, summarize clauses, generate application checklists, and answer natural-language questions about your vault.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleGrantConsent = () => {
    localStorage.setItem('docuvault_ai_consent', 'true');
    setHasConsented(true);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'new_chat',
        role: 'assistant',
        content: 'New conversation started. How can I assist you with your documents today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || loading) return;

    if (!hasConsented) {
      setErrorMsg('Please review and grant AI privacy consent before submitting queries.');
      return;
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setLoading(true);
    setErrorMsg(null);

    try {
      // Filter strictly consented documents
      const authorizedDocuments = documents
        .filter((d) => consentedDocIds.includes(d.id))
        .map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          tags: d.tags,
          documentDate: d.documentDate,
          expiryDate: d.expiryDate,
          description: d.description,
          ocrText: d.ocrText,
        }));

      // Call secure server proxy route
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          chatHistory: messages.map((m) => ({ role: m.role, content: m.content })),
          consentedDocuments: authorizedDocuments,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to receive AI response.');
      }

      // Check if any document IDs are cited in the response like [Doc: <id>]
      const citedDocIds: string[] = [];
      const matches = data.reply.matchAll(/\[Doc:\s*([a-zA-Z0-9_\-]+)\]/g);
      for (const m of matches) {
        if (m[1] && !citedDocIds.includes(m[1])) {
          citedDocIds.push(m[1]);
        }
      }

      const assistantMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply.replace(/\[Doc:\s*[a-zA-Z0-9_\-]+\]/g, '').trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citedDocIds: citedDocIds.length > 0 ? citedDocIds : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('[DocuVault Assistant Error]', err);
      setErrorMsg(err.message || 'Error communicating with assistant. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const suggestedPrompts = [
    'Which documents in my vault are expiring soon?',
    'Summarize my health and insurance documents',
    'List all documents in the Education category',
    'Generate a checklist for an international travel visa application',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#171A20] border border-[#222630] rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Bar */}
      <div className="px-5 py-3.5 border-b border-[#222630] bg-[#0B0D10]/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#648BFF]/20 to-[#222630] border border-[#648BFF]/40 flex items-center justify-center text-[#648BFF]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#F4F5F7]">DocuVault AI Assistant</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-[11px] text-[#9299A5]">
              Zero-Fabrication Policy • Grounded in authorized vault documents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-[#9299A5] hover:text-[#EF4444] hover:bg-[#222630] transition-colors"
            title="Start new conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Privacy Consent Banner if not yet confirmed */}
      {!hasConsented && (
        <div className="p-4 bg-[#648BFF]/10 border-b border-[#648BFF]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#F4F5F7]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#648BFF] shrink-0" />
            <div>
              <span className="font-semibold block">Privacy Consent Required</span>
              <span className="text-[#9299A5]">
                DocuVault requires explicit consent before sending document metadata or OCR text to
                Google Gemini API via our secure server proxy. Your master PIN and keys are never sent.
              </span>
            </div>
          </div>
          <button
            onClick={handleGrantConsent}
            className="px-4 py-2 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-semibold shrink-0 transition-colors"
          >
            Grant AI Consent
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#0B0D10]/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-[#171A20] border border-[#222630] flex items-center justify-center text-[#648BFF] shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#648BFF] text-white rounded-tr-none'
                  : 'bg-[#171A20] border border-[#222630] text-[#F4F5F7] rounded-tl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Clickable Cited Documents */}
              {msg.citedDocIds && msg.citedDocIds.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#222630] space-y-1.5">
                  <span className="text-[10px] font-semibold text-[#9299A5] uppercase tracking-wider block">
                    Source Document Citations:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {msg.citedDocIds.map((docId) => {
                      const citedDoc = documents.find((d) => d.id === docId);
                      if (!citedDoc) return null;
                      return (
                        <button
                          key={docId}
                          type="button"
                          onClick={() => onViewDocument(citedDoc)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0D10] border border-[#222630] hover:border-[#648BFF] text-xs text-[#648BFF] transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span className="font-mono">{citedDoc.name}</span>
                          <ExternalLink className="w-3 h-3 text-[#9299A5]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <span
                className={`text-[10px] block mt-1.5 ${
                  msg.role === 'user' ? 'text-white/70 text-right' : 'text-[#9299A5]'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-[#171A20] border border-[#222630] flex items-center justify-center text-[#648BFF] shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-[#171A20] border border-[#222630] text-xs text-[#9299A5] flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-[#648BFF]" />
              <span>Analyzing authorized documents with Gemini 3.8 Flash...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Pills */}
      <div className="px-4 py-2 border-t border-[#222630] bg-[#0B0D10]/90 flex gap-2 overflow-x-auto text-xs">
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            className="px-3 py-1.5 rounded-lg bg-[#171A20] hover:bg-[#222630] text-[#C5CAD3] hover:text-white border border-[#222630] whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-[#648BFF]" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-[#222630] bg-[#171A20]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={
              hasConsented
                ? 'Ask about your authorized documents (e.g. "When does my passport expire?")...'
                : 'Grant AI consent above to enable queries'
            }
            disabled={!hasConsented || loading}
            className="flex-1 py-2.5 px-4 bg-[#0B0D10] border border-[#222630] rounded-xl text-xs sm:text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || !hasConsented || loading}
            className="py-2.5 px-4 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-[#648BFF]/20 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
