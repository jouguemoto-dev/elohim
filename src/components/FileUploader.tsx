import React, { useRef, useState } from 'react';
import { Upload, X, FileText, ImageIcon, File as FileIcon, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Attachment } from '../types';

interface FileUploaderProps {
  onUpload: (attachments: Attachment[]) => void;
  existingAttachments?: Attachment[];
  label?: string;
  accept?: string;
  maxSize?: number; // In MB
  maxFiles?: number;
}

export default function FileUploader({ 
  onUpload, 
  existingAttachments = [], 
  label = "Anexar Arquivos (PDF, PNG, JPG)",
  accept = ".pdf,.png,.jpg,.jpeg",
  maxSize = 2, // Default 2MB limit for preview
  maxFiles
}: FileUploaderProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(existingAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: Attachment[] = [];

    const totalAllowed = maxFiles ? maxFiles : Infinity;
    const remainingSlots = totalAllowed - attachments.length;

    if (remainingSlots <= 0) {
      alert(`Você já atingiu o limite de ${maxFiles} arquivos.`);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];

    for (const file of filesToProcess) {
      // Size check
      if (file.size > maxSize * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite de ${maxSize}MB.`);
        continue;
      }

      // Convert to Base64 for the development environment
      // In a production app, this would be a Firebase Storage upload
      const reader = new FileReader();
      const filePromise = new Promise<Attachment>((resolve) => {
        reader.onload = (event) => {
          resolve({
            id: Math.random().toString(36).substring(2, 11),
            name: file.name,
            type: file.type,
            size: file.size,
            url: event.target?.result as string,
            uploadedAt: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      });

      const attachment = await filePromise;
      newAttachments.push(attachment);
    }

    const updated = [...attachments, ...newAttachments];
    setAttachments(updated);
    onUpload(updated);
    setIsUploading(false);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    const updated = attachments.filter(a => a.id !== id);
    setAttachments(updated);
    onUpload(updated);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 block px-1">{label}</label>
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed border-white/5 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group shadow-inner relative overflow-hidden",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          multiple={!maxFiles || maxFiles > 1} 
          accept={accept}
        />
        {isUploading ? (
          <div className="relative">
            <Loader2 size={32} className="text-white animate-spin mb-4" />
          </div>
        ) : (
          <div className="relative group-hover:-translate-y-1 transition-transform duration-500">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-zinc-500 group-hover:text-white transition-colors shadow-2xl mb-4 group-hover:border-white/10">
              <Upload size={28} />
            </div>
          </div>
        )}
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] relative group-hover:text-zinc-300 transition-colors">
          {isUploading ? "Processando Terminal..." : "Sincronizar Arquivo Local"}
        </p>
        <p className="text-[9px] text-zinc-700 mt-2 font-bold uppercase tracking-widest relative">PDF, PNG, JPG (Capacidade {maxSize}MB)</p>
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {attachments.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center justify-between p-4 bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl group animate-in fade-in slide-in-from-bottom-4 shadow-xl hover:bg-white/[0.06] hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="shrink-0 p-2 bg-black/40 rounded-xl border border-white/10 text-zinc-500 shadow-inner group-hover:text-white transition-colors">
                  {file.type.includes('image') ? <ImageIcon size={18} /> : 
                   file.type.includes('pdf') ? <FileText size={18} className="text-red-400" /> : 
                   <FileIcon size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-white truncate leading-none mb-1.5 uppercase tracking-widest">{file.name}</p>
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{formatSize(file.size)}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => removeAttachment(file.id)}
                className="p-2 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all scale-0 group-hover:scale-100 shadow-2xl"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
