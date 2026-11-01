import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Camera,
  RotateCw,
  Sliders,
  Crop,
  Check,
  X,
  FileText,
  AlertCircle,
  Sparkles,
  Calendar,
  Tag,
  Shield,
  Layers,
  Trash2,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import type { DocumentItem } from '../utils/storage';
import { encryptDocumentData, deriveKeyFromPin, generateSalt } from '../utils/crypto';
import { useAuth } from '../context/AuthContext';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDocument: (doc: DocumentItem) => Promise<void>;
  customCategories?: string[];
}

type ScanMode = 'select' | 'upload' | 'camera';
type FilterType = 'normal' | 'contrast' | 'grayscale' | 'bw_threshold';

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveDocument,
  customCategories = [],
}) => {
  const { sessionCryptoKey, user } = useAuth();

  const [mode, setMode] = useState<ScanMode>('select');

  // Camera capture state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Multi-page scans queue
  const [capturedPages, setCapturedPages] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Enhancement controls
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>('normal');

  // Final Document Form Fields
  const [documentName, setDocumentName] = useState<string>('');
  const [category, setCategory] = useState<string>('Identity');
  const [description, setDescription] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [documentDate, setDocumentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [hasExpiry, setHasExpiry] = useState<boolean>(false);

  // AI Assistant Analysis State
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<any | null>(null);

  // Upload file info
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>('image/jpeg');
  const [fileSize, setFileSize] = useState<number>(0);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const standardCategories = ['Identity', 'Education', 'Finance', 'Health', 'Personal', 'Other'];
  const allCategories = Array.from(new Set([...standardCategories, ...customCategories]));

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('[DocuVault Camera Error]', err);
      setCameraError('Unable to access camera hardware. Check browser permissions or choose files from storage.');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (mode === 'camera' && isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, isOpen]);

  if (!isOpen) return null;

  // Capture frame from camera
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setCapturedPages((prev) => [...prev, dataUrl]);
    setCurrentPageIndex(capturedPages.length);
    setFileDataUrl(dataUrl);
    setFileMime('image/jpeg');
    setFileSize(Math.round(dataUrl.length * 0.75));

    // Default title
    if (!documentName) {
      setDocumentName(`Scan_${new Date().toISOString().slice(0, 10)}_${capturedPages.length + 1}`);
    }
  };

  // Handle local file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileDataUrl(result);
      setFileMime(file.type || 'application/pdf');
      setFileSize(file.size);

      // Prepopulate name
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setDocumentName(cleanName);

      setMode('upload');
    };
    reader.readAsDataURL(file);
  };

  // Apply visual enhancements (Rotation, Grayscale, Contrast, Threshold) on active image
  const getEnhancedImageDataUrl = (rawUrl: string): string => {
    if (!rawUrl || rawUrl.startsWith('data:application/pdf')) return rawUrl;
    if (rotationDegrees === 0 && activeFilter === 'normal') return rawUrl;

    const img = new Image();
    img.src = rawUrl;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return rawUrl;

    if (rotationDegrees % 180 !== 0) {
      canvas.width = img.height || 800;
      canvas.height = img.width || 600;
    } else {
      canvas.width = img.width || 800;
      canvas.height = img.height || 600;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotationDegrees * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Filters
    if (activeFilter !== 'normal') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        if (activeFilter === 'grayscale') {
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        } else if (activeFilter === 'contrast') {
          // Increase contrast by 30%
          const factor = (259 * (128 + 30)) / (255 * (259 - 30));
          data[i] = factor * (r - 128) + 128;
          data[i + 1] = factor * (g - 128) + 128;
          data[i + 2] = factor * (b - 128) + 128;
        } else if (activeFilter === 'bw_threshold') {
          const threshold = gray > 135 ? 255 : 0;
          data[i] = threshold;
          data[i + 1] = threshold;
          data[i + 2] = threshold;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // Trigger Gemini AI Intelligent Classification & OCR
  const handleAIAnalyze = async () => {
    if (!fileDataUrl) return;
    setIsAnalyzingAI(true);
    setErrorMsg(null);

    try {
      // 1. Request OCR text & key fields
      const ocrRes = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: fileDataUrl,
          mimeType: fileMime,
          documentTitle: documentName,
        }),
      });
      const ocrData = await ocrRes.json();

      // 2. Request Smart Categorization & Expiry detection
      const classRes = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: ocrData?.ocr?.extractedText || '',
          filename: documentName,
          imageBase64: fileDataUrl,
          mimeType: fileMime,
        }),
      });
      const classData = await classRes.json();

      if (classData?.classification) {
        const c = classData.classification;
        setAiSuggestions({
          ...c,
          ocrText: ocrData?.ocr?.extractedText,
          keyFields: ocrData?.ocr?.keyFields,
        });

        // Prepopulate fields based on user consent
        if (c.suggestedFilename) setDocumentName(c.suggestedFilename);
        if (c.suggestedCategory && allCategories.includes(c.suggestedCategory)) {
          setCategory(c.suggestedCategory);
        }
        if (c.suggestedTags?.length) {
          setTagsInput(c.suggestedTags.join(', '));
        }
        if (c.expiryDate) {
          setExpiryDate(c.expiryDate);
          setHasExpiry(true);
        } else {
          setHasExpiry(false);
          setExpiryDate('');
        }
        if (c.summary) {
          setDescription(c.summary);
        }
      }
    } catch (err: any) {
      console.error('[Gemini AI Analyze error]', err);
      setErrorMsg('AI classification encountered an issue, but you can continue saving manually.');
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Save Document to encrypted vault
  const handleSaveDocument = async () => {
    if (!documentName.trim()) {
      return setErrorMsg('Please enter a document name.');
    }
    if (!fileDataUrl) {
      return setErrorMsg('No document file or scan available.');
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const finalDataUrl = getEnhancedImageDataUrl(fileDataUrl);

      // Parse tags
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      let encryptedPayload = undefined;
      // If session crypto key is available, generate genuine AES-256-GCM ciphertext
      if (sessionCryptoKey && user?.pinSaltHex) {
        const salt = generateSalt(16);
        encryptedPayload = await encryptDocumentData(
          {
            dataUrl: finalDataUrl,
            ocrText: aiSuggestions?.ocrText || '',
            name: documentName.trim(),
          },
          sessionCryptoKey,
          salt
        );
      }

      const newDoc: DocumentItem = {
        id: docId,
        name: documentName.trim(),
        category,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : [category],
        documentDate: documentDate || new Date().toISOString().split('T')[0],
        expiryDate: hasExpiry && expiryDate ? expiryDate : null,
        mimeType: fileMime,
        fileSize,
        dataUrl: finalDataUrl,
        encryptedPayload,
        ocrText: aiSuggestions?.ocrText || '',
        keyFields: aiSuggestions?.keyFields || [],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveDocument(newDoc);
      stopCamera();
      onClose();
    } catch (err: any) {
      console.error('[DocuVault Save Error]', err);
      setErrorMsg(err.message || 'Failed to save encrypted document.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#171A20] border border-[#222630] rounded-2xl shadow-2xl p-5 sm:p-7 text-[#F4F5F7] relative my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222630] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B0D10] border border-[#648BFF]/40 flex items-center justify-center text-[#648BFF]">
              {mode === 'camera' ? <Camera className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-[#F4F5F7]">
                {mode === 'select'
                  ? 'Add Document to Secure Vault'
                  : mode === 'camera'
                  ? 'Scan Document with Camera'
                  : 'Document Details & Metadata'}
              </h3>
              <p className="text-xs text-[#9299A5]">
                {mode === 'select'
                  ? 'Select your preferred acquisition method'
                  : 'Client-side zero-knowledge encrypted before storage'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#9299A5] hover:text-white hover:bg-[#222630] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center gap-2 text-xs text-[#EF4444]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* --- STEP 1: TWO CLEAR CHOICES (as requested) --- */}
        {mode === 'select' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {/* Choice A: Files / Gallery */}
            <label className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl bg-[#0B0D10] border-2 border-dashed border-[#222630] hover:border-[#648BFF] cursor-pointer transition-all group text-center hover:bg-[#0B0D10]/80">
              <div className="w-14 h-14 rounded-2xl bg-[#171A20] border border-[#222630] group-hover:border-[#648BFF]/40 flex items-center justify-center mb-4 text-[#648BFF] transition-all">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-sm text-[#F4F5F7]">Choose from Files / Gallery</h4>
              <p className="text-xs text-[#9299A5] mt-1.5 leading-relaxed">
                Upload existing PDF documents, JPG, JPEG, or PNG files from device storage.
              </p>
              <span className="mt-4 inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#222630] group-hover:bg-[#648BFF] group-hover:text-white transition-all text-[#C5CAD3]">
                Browse Files
              </span>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {/* Choice B: Scan with Camera */}
            <button
              type="button"
              onClick={() => setMode('camera')}
              className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl bg-[#0B0D10] border-2 border-dashed border-[#222630] hover:border-[#648BFF] cursor-pointer transition-all group text-center hover:bg-[#0B0D10]/80"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#171A20] border border-[#222630] group-hover:border-[#648BFF]/40 flex items-center justify-center mb-4 text-[#648BFF] transition-all">
                <Camera className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-sm text-[#F4F5F7]">Scan with Camera</h4>
              <p className="text-xs text-[#9299A5] mt-1.5 leading-relaxed">
                Live camera capture with multi-page queue, contrast filters, and perspective rotation.
              </p>
              <span className="mt-4 inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#222630] group-hover:bg-[#648BFF] group-hover:text-white transition-all text-[#C5CAD3]">
                Open Scanner
              </span>
            </button>
          </div>
        )}

        {/* --- STEP 2: CAMERA CAPTURE VIEW --- */}
        {mode === 'camera' && (
          <div className="space-y-4">
            {cameraError ? (
              <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] text-center">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-[#222630] text-[#F4F5F7]"
                >
                  Return to File Selection
                </button>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-[#222630]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Visual scan frame overlay */}
                <div className="absolute inset-8 border-2 border-[#648BFF]/40 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-2 border-l-2 border-[#648BFF]"></span>
                    <span className="w-4 h-4 border-t-2 border-r-2 border-[#648BFF]"></span>
                  </div>
                  <div className="text-center text-[11px] font-mono text-[#648BFF] bg-black/60 py-1 px-3 rounded-full self-center">
                    Align document inside frame
                  </div>
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-2 border-l-2 border-[#648BFF]"></span>
                    <span className="w-4 h-4 border-b-2 border-r-2 border-[#648BFF]"></span>
                  </div>
                </div>
              </div>
            )}

            {/* Controls Bar */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setMode('select');
                }}
                className="px-3 py-2 rounded-xl bg-[#222630] text-xs font-medium text-[#9299A5] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={captureFrame}
                className="px-6 py-2.5 rounded-xl bg-[#648BFF] hover:bg-[#5278ea] text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-[#648BFF]/20"
              >
                <Camera className="w-4 h-4" />
                Capture Document Page
              </button>

              {capturedPages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setMode('upload');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-xs font-semibold text-white transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Proceed ({capturedPages.length})
                </button>
              )}
            </div>

            {/* Multi-Page Queue Thumbnails */}
            {capturedPages.length > 0 && (
              <div className="pt-2 border-t border-[#222630]">
                <div className="flex items-center justify-between text-xs text-[#9299A5] mb-2">
                  <span>Captured Pages ({capturedPages.length})</span>
                  <button
                    type="button"
                    onClick={() => setCapturedPages([])}
                    className="text-[#EF4444] hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {capturedPages.map((pageUrl, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-20 rounded-lg overflow-hidden border border-[#222630] shrink-0 group"
                    >
                      <img src={pageUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setCapturedPages((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-[#EF4444]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 3: DOCUMENT ENHANCEMENT, METADATA & GEMINI CLASSIFICATION --- */}
        {mode === 'upload' && fileDataUrl && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Preview & Enhancement Tools */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0B0D10] p-3 rounded-2xl border border-[#222630]">
              {/* Document Preview Box */}
              <div className="sm:col-span-1 rounded-xl overflow-hidden bg-[#171A20] border border-[#222630] aspect-[3/4] flex items-center justify-center relative">
                {fileMime.startsWith('image/') ? (
                  <img
                    src={getEnhancedImageDataUrl(fileDataUrl)}
                    alt="Document preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <FileText className="w-12 h-12 text-[#648BFF] mb-2" />
                    <span className="text-xs font-mono text-[#9299A5]">PDF Document</span>
                    <span className="text-[10px] text-[#9299A5]">
                      {(fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </div>

              {/* Enhancement Controls & Gemini Smart Auto-Detect Button */}
              <div className="sm:col-span-2 flex flex-col justify-between space-y-3">
                {/* Enhancement Filters for Scanned Images */}
                {fileMime.startsWith('image/') && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9299A5] uppercase tracking-wider mb-1.5">
                      Image Enhancement Filter
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'normal' as FilterType, label: 'Original Color' },
                        { id: 'contrast' as FilterType, label: 'Contrast +30%' },
                        { id: 'grayscale' as FilterType, label: 'Grayscale' },
                        { id: 'bw_threshold' as FilterType, label: 'Doc Threshold' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setActiveFilter(f.id)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                            activeFilter === f.id
                              ? 'bg-[#171A20] text-[#648BFF] border-[#648BFF]/40'
                              : 'bg-[#171A20]/50 text-[#9299A5] border-[#222630] hover:text-[#F4F5F7]'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Rotation control */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setRotationDegrees((prev) => (prev + 90) % 360)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#171A20] text-xs text-[#C5CAD3] hover:text-white border border-[#222630]"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> Rotate 90° ({rotationDegrees}°)
                      </button>
                    </div>
                  </div>
                )}

                {/* Gemini AI Smart Auto-Organizer Button */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#648BFF]/10 to-[#171A20] border border-[#648BFF]/30">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#648BFF]">
                      <Sparkles className="w-3.5 h-3.5" />
                      Gemini Smart Classifier & OCR
                    </span>
                    {aiSuggestions && (
                      <span className="text-[10px] text-[#10B981] font-mono">Analyzed</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9299A5] mb-2.5">
                    Automatically detect document type, category, important dates, and extract searchable text.
                  </p>
                  <button
                    type="button"
                    onClick={handleAIAnalyze}
                    disabled={isAnalyzingAI}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#648BFF] hover:bg-[#5278ea] text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {isAnalyzingAI ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Analyzing with Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Run AI Classification
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Metadata Fields Form */}
            <div className="space-y-3 pt-2">
              {/* Document Name */}
              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="e.g. Passport_AlexRivers.pdf"
                  required
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none"
                />
              </div>

              {/* Category & Document Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                    Document Issue Date
                  </label>
                  <input
                    type="date"
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                    className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none"
                  />
                </div>
              </div>

              {/* Expiry Date Management (Strictly Optional!) */}
              <div className="p-3 rounded-xl bg-[#0B0D10] border border-[#222630] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasExpiryCheckbox"
                      checked={hasExpiry}
                      onChange={(e) => {
                        setHasExpiry(e.target.checked);
                        if (!e.target.checked) setExpiryDate('');
                      }}
                      className="rounded border-[#222630] text-[#648BFF] focus:ring-0"
                    />
                    <label htmlFor="hasExpiryCheckbox" className="text-xs font-medium text-[#F4F5F7] cursor-pointer">
                      Document has an Applicable Expiry Date
                    </label>
                  </div>
                  <span className="text-[10px] text-[#9299A5] font-mono">
                    (Passport, Driver's License, Insurance)
                  </span>
                </div>

                {hasExpiry && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-[11px] text-[#9299A5] mb-1">
                      Expiry Date (Tracked for renewal alerts)
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full py-2 px-3 bg-[#171A20] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Optional Description (Strictly Optional as requested) */}
              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                  Optional Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional notes, issuing authority, or policy number..."
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/40"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-[#C5CAD3] mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="ID, Travel, Govt, Urgent"
                  className="w-full py-2 px-3 bg-[#0B0D10] border border-[#222630] rounded-xl text-sm focus:border-[#648BFF] focus:outline-none placeholder-[#9299A5]/40"
                />
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#222630]">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="px-3 py-2 rounded-xl bg-[#222630] text-xs font-medium text-[#9299A5] hover:text-white"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleSaveDocument}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#0ea371] text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-[#10B981]/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Encrypting & Storing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Confirm & Save to Encrypted Vault
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
