import React from 'react';
import { FileText, FileCheck, Trash2, Upload } from 'lucide-react';

interface EditBillDocumentSectionProps {
  fileAction: 'keep' | 'replace' | 'remove';
  newFile: File | null;
  hasExistingDocument: boolean;
  currentExistingFileName: string | null;
  onSelectNewFile: (file: File) => void;
  onCancelReplace: () => void;
  onSetFileAction: (action: 'keep' | 'replace' | 'remove') => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const EditBillDocumentSection: React.FC<EditBillDocumentSectionProps> = ({
  fileAction,
  newFile,
  hasExistingDocument,
  currentExistingFileName,
  onSelectNewFile,
  onCancelReplace,
  onSetFileAction,
}) => {
  return (
    <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-brand-400" />
          <span>Invoice Document File</span>
        </span>
        <span className="text-[10px] text-zinc-500">Upload without changing splits</span>
      </div>

      {fileAction === 'replace' && newFile ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/30 text-xs">
          <div className="flex items-center gap-2 truncate">
            <FileCheck className="w-4 h-4 text-brand-400 shrink-0" />
            <span className="font-semibold text-brand-300 truncate">{newFile.name}</span>
            <span className="text-[10px] text-brand-400/80 shrink-0">({formatFileSize(newFile.size)})</span>
          </div>
          <button
            type="button"
            onClick={onCancelReplace}
            className="text-xs text-zinc-400 hover:text-rose-400 font-semibold px-2 py-0.5 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : fileAction === 'remove' ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
          <span>Document will be removed when you save</span>
          <button
            type="button"
            onClick={() => onSetFileAction('keep')}
            className="text-xs font-semibold underline hover:text-white"
          >
            Undo
          </button>
        </div>
      ) : hasExistingDocument ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="font-medium text-zinc-200 truncate">
              {currentExistingFileName || 'Attached Invoice Document'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-brand-400 hover:underline text-xs font-semibold cursor-pointer">
              <span>Replace Document</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => e.target.files?.[0] && onSelectNewFile(e.target.files[0])}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => onSetFileAction('remove')}
              className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
              title="Remove document attachment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-dashed border-zinc-700/80 text-xs">
          <span className="text-zinc-500 text-[11px]">No document attached to this bill yet</span>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 font-semibold cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Bill File (PDF / Image)</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => e.target.files?.[0] && onSelectNewFile(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
};
