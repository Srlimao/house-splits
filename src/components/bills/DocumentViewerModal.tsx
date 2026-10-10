import React from 'react';
import { Bill, BillCategory } from '../../types';
import { formatCurrency } from '../../lib/splitCalculator';
import { X, Download, FileText, Calendar, Building, CheckCircle2, Shield } from 'lucide-react';

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
  if (!bill) return null;

  const fileName = bill.fileName || `${bill.providerName.replace(/\s+/g, '_')}_Invoice.pdf`;

  const handleDownload = () => {
    if (bill.fileDataUrl) {
      const link = document.createElement('a');
      link.href = bill.fileDataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Generate a structured printable receipt text file for sample/demo bills
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
      link.download = fileName.endsWith('.pdf') ? fileName.replace('.pdf', '_receipt.txt') : `${fileName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
              <p className="text-xs text-zinc-400">Original Document & Invoice Record</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Visual Preview Card */}
        <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-brand-400" />
              <span className="font-bold text-white text-base">{bill.providerName}</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              {category?.name}
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

          {/* Simulated Document Preview Frame */}
          <div className="h-44 rounded-lg bg-zinc-900/80 border border-zinc-800 flex flex-col items-center justify-center text-center p-4">
            <FileText className="w-12 h-12 text-zinc-600 mb-2" />
            <p className="text-xs font-medium text-zinc-300">{fileName}</p>
            <p className="text-[11px] text-zinc-500 mt-1">Verified Document File</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
          >
            Close
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-bold text-xs shadow-glow transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Original Document</span>
          </button>
        </div>

      </div>
    </div>
  );
};
