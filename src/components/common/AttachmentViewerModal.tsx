import React, { useState } from 'react';
import { X, FileText, Download, Upload, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  attachmentUrl?: string;
  attachmentName?: string;
  uploadDate?: string;
  onUploadNew?: (fileUrl: string, fileName: string) => void;
  canEdit?: boolean;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  attachmentUrl,
  attachmentName,
  uploadDate,
  onUploadNew,
  canEdit = true,
}) => {
  if (!isOpen) return null;

  const [currentUrl, setCurrentUrl] = useState<string | undefined>(attachmentUrl);
  const [currentName, setCurrentName] = useState<string | undefined>(attachmentName || 'bill_document.pdf');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCurrentUrl(base64);
        setCurrentName(file.name);
        if (onUploadNew) {
          onUploadNew(base64, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isImage = currentUrl?.startsWith('data:image') || currentUrl?.match(/\.(jpeg|jpg|png|webp|gif)$/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="font-medium text-slate-700">File Name: </span>
              <span className="font-mono text-slate-900">{currentName}</span>
            </div>
            {uploadDate && (
              <div>
                <span className="font-medium text-slate-700">Uploaded: </span>
                <span>{uploadDate}</span>
              </div>
            )}
          </div>

          {currentUrl ? (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-100 flex flex-col items-center justify-center min-h-[260px] max-h-[420px] overflow-hidden">
              {isImage ? (
                <img
                  src={currentUrl}
                  alt="Bill / Voucher attachment"
                  className="max-h-[380px] max-w-full object-contain rounded shadow-xs"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{currentName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Scanned Bill / PDF Document</p>
                  </div>
                  <a
                    href={currentUrl}
                    download={currentName}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Attached File</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center bg-slate-50">
              <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-2">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="font-medium text-slate-700 text-xs">No attachment uploaded yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Upload a photo of the bill, invoice or payment proof.</p>
            </div>
          )}

          {canEdit && (
            <div className="pt-2">
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload / Replace Bill Photo or PDF</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {currentUrl ? (
            <a
              href={currentUrl}
              download={currentName}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Copy</span>
            </a>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
