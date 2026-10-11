import React, { useState } from 'react';
import { Bill, BillCategory } from '../../types';
import { formatCurrency } from '../../lib/splitCalculator';
import { useHousehold } from '../../context/HouseholdContext';
import { apiClient } from '../../lib/apiClient';
import {
  X,
  Download,
  FileText,
  Building,
  ExternalLink,
  Upload,
  Loader2,
} from 'lucide-react';

interface DocumentViewerModalProps {
  bill: Bill | null;
  category?: BillCategory;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  bill,
  category,
  onClose,
}) => {
  const { updateBill } = useHousehold();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!bill) return null;

  const documentUrl = bill.filePath || bill.fileDataUrl;
  const hasOriginalDocument = Boolean(documentUrl);

  const rawFileName =
    bill.fileName ||
    (bill.filePath && !bill.filePath.startsWith('data:')
      ? bill.filePath.split('/').pop()?.split('?')[0]
      : null);

  const isPdf = Boolean(
    bill.fileType?.toLowerCase().includes('pdf') ||
    (rawFileName && rawFileName.toLowerCase().endsWith('.pdf')) ||
    (documentUrl && documentUrl.toLowerCase().includes('.pdf'))
  );

  const isImage = Boolean(
    bill.fileType?.toLowerCase().startsWith('image/') ||
    (rawFileName && /\.(png|jpe?g|webp|gif)$/i.test(rawFileName)) ||
    (documentUrl && /\.(png|jpe?g|webp|gif)/i.test(documentUrl))
  );

  const defaultExt = isPdf ? '.pdf' : isImage ? '.png' : '.pdf';
  const fileName = rawFileName || `${bill.providerName.replace(/\s+/g, '_')}_Invoice${defaultExt}`;

  const handleDownload = async () => {
    if (hasOriginalDocument && documentUrl) {
      setIsDownloading(true);
      try {
        if (documentUrl.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = documentUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // Fetch from Cloudflare storage as blob to guarantee correct download with filename
          const response = await fetch(documentUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch file`);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        }
      } catch (err: any) {
        console.warn('Direct blob download failed, falling back to window.open / anchor download:', err);
        const link = document.createElement('a');
        link.href = documentUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        setIsDownloading(false);
      }
    } else {
      // Generate a structured printable receipt text file for sample/demo bills without attachment
      const content = `=====================================================
HOUSESPLITS - OFFICIAL BILL RECEIPT
=====================================================
Provider:       ${bill.providerName}
Category:       ${category?.name || 'Utility'}
Invoice Ref:    ${bill.invoiceNumber || 'N/A'}
Total Amount:   ${formatCurrency(bill.totalAmount, bill.currency)}
Due Date:       ${bill.dueDate}
Issue Date:     ${bill.issueDate || 'N/A'}
Paid by Admin:  ${bill.paidToProvider ? 'YES' : 'PENDING'}

ROOMMATE SPLITS:
${bill.splits.map((s) => `- ${s.profileId}: ${s.percentage}% (${formatCurrency(s.amountDue, bill.currency)}) - Status: ${s.status}`).join('\n')}
=====================================================`;

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName.replace(/\.[^/.]+$/, '')}_receipt.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleAttachDocument = async (selectedFile: File) => {
    setIsUploadingAttachment(true);
    setUploadError(null);
    try {
      const uploadRes = await apiClient.uploadFile(selectedFile);
      await updateBill(bill.id, {
        filePath: uploadRes.url,
        fileType: uploadRes.fileType,
        fileName: uploadRes.fileName,
      });
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white truncate max-w-xs">{fileName}</h3>
              <p className="text-xs text-zinc-400">
                {hasOriginalDocument ? 'Original Attached Document' : 'Invoice Record & Summary'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Visual Details Card */}
        <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-brand-400" />
              <span className="font-bold text-white text-base">{bill.providerName}</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              {category?.name || 'Expense'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-3 border-y border-zinc-800/80 text-xs">
            <div>
              <span className="text-zinc-500 block">Total Amount</span>
              <span className="text-lg font-black text-emerald-400">
                {formatCurrency(bill.totalAmount, bill.currency)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Due Date</span>
              <span className="font-bold text-zinc-200">{bill.dueDate}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Invoice Number</span>
              <span className="font-mono text-zinc-300">{bill.invoiceNumber || 'N/A'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Provider Payment</span>
              <span className={bill.paidToProvider ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {bill.paidToProvider ? 'Paid to Provider' : 'Pending Payment'}
              </span>
            </div>
          </div>

          {/* Document Preview Frame */}
          {hasOriginalDocument && documentUrl ? (
            <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 flex flex-col items-center justify-center text-center">
              {isImage ? (
                <div className="max-h-60 w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/40 p-2">
                  <img
                    src={documentUrl}
                    alt={fileName}
                    className="max-h-56 w-auto object-contain rounded"
                  />
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center mb-3">
                    <FileText className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-200">{fileName}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {isPdf ? 'Original PDF Invoice Document' : 'Original Attached Document'}
                  </p>
                </div>
              )}

              {/* Quick Actions for Existing Document */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/80 w-full justify-center">
                {!documentUrl.startsWith('data:') && (
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
                    <span>Open in New Tab</span>
                  </a>
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700 cursor-pointer transition-colors">
                  {isUploadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-brand-400" />}
                  <span>{isUploadingAttachment ? 'Uploading...' : 'Replace File'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={isUploadingAttachment}
                    onChange={(e) => e.target.files?.[0] && handleAttachDocument(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* No Document Attached Case */
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 text-zinc-500 flex items-center justify-center mb-2.5">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-zinc-300">No Original Document Attached</p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-sm leading-relaxed">
                This bill was recorded manually without a scanned document. You can attach the original invoice PDF or photo now, or download a structured receipt summary.
              </p>
              
              <label className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs font-bold cursor-pointer transition-colors shadow-sm">
                {isUploadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isUploadingAttachment ? 'Uploading File...' : 'Attach Original Invoice Document'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={isUploadingAttachment}
                  onChange={(e) => e.target.files?.[0] && handleAttachDocument(e.target.files[0])}
                  className="hidden"
                />
              </label>

              {uploadError && (
                <p className="text-xs text-rose-400 mt-2 font-medium">{uploadError}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
          >
            Close
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-black font-bold text-xs shadow-glow transition-all"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {isDownloading
                ? 'Downloading...'
                : hasOriginalDocument
                ? 'Download Original Document'
                : 'Download Summary Receipt (.txt)'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
