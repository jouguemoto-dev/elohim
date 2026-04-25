import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, Share2, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChurchSettings } from '../types';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  publicId: string;
  settings?: ChurchSettings | null;
}

export default function QRCodeModal({ isOpen, onClose, eventTitle, publicId, settings }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const getBaseUrl = () => {
    if (settings?.publicUrl) {
      return settings.publicUrl.replace(/\/$/, '');
    }
    return window.location.origin;
  };

  const registrationUrl = `${getBaseUrl()}/inscrever/${publicId}`;

  const handlePrint = () => {
    const qrSvg = qrRef.current?.querySelector('svg');
    if (!qrSvg) return;

    // Convert SVG to Data URL for reliability in printing
    const svgData = new XMLSerializer().serializeToString(qrSvg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 1200;
      canvas.height = 1200;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 1200, 1200);
        ctx.drawImage(img, 100, 100, 1000, 1000);
      }
      const dataUrl = canvas.toDataURL('image/png');
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, autorize popups para imprimir o QR Code.');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${eventTitle}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
              body { 
                margin: 0;
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh; 
                font-family: 'Inter', sans-serif;
                background: #fff;
              }
              .card {
                text-align: center;
                border: 4px solid #000;
                padding: 40px;
                border-radius: 40px;
                width: 500px;
              }
              img { width: 400px; height: 400px; display: block; margin: 20px auto; }
              h1 { font-size: 32px; font-weight: 800; margin: 10px 0; text-transform: uppercase; }
              .subtitle { font-size: 14px; color: #666; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
              .url { font-size: 12px; color: #999; margin-top: 20px; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="card">
              <p class="subtitle">Escaneie para se Inscrever</p>
              <h1>${eventTitle}</h1>
              <img src="${dataUrl}" />
              <p class="url">${registrationUrl}</p>
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 1000, 1000);
        ctx.drawImage(img, 50, 50, 900, 900);
      }
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `inscricao_${eventTitle.toLowerCase().replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyLink = async () => {
    if (isCopied) return;
    
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[3.5rem] shadow-3xl overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                  <Share2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight leading-none">Divulgação</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">Acesso Público ao Evento</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-white/5 text-zinc-500 hover:text-white rounded-2xl border border-white/5 transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-10 flex flex-col items-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div ref={qrRef} className="relative p-8 bg-white rounded-[2.5rem] shadow-2xl mb-8 transform group-hover:scale-[1.02] transition-transform duration-500">
                  <QRCodeSVG 
                    value={registrationUrl}
                    size={220}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              <div className="text-center mb-10 w-full">
                <h4 className="text-xl font-black text-white mb-2 tracking-tighter uppercase">{eventTitle}</h4>
                <div className="bg-white/5 border border-white/5 p-3 rounded-2xl">
                  <p className="text-[10px] text-zinc-500 font-mono break-all line-clamp-2 leading-relaxed tracking-tight">
                    {registrationUrl}
                  </p>
                </div>
                {!settings?.publicUrl && (
                  <p className="mt-4 text-[9px] text-zinc-600 font-medium italic">
                    Dica: Configure a "URL Pública" em Ajustes para garantir que o link funcione em qualquer lugar.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={handlePrint}
                  className="group flex items-center justify-center gap-3 py-4.5 bg-white text-black rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-2xl active:scale-95"
                >
                  <Printer size={20} className="group-hover:scale-110 transition-transform" />
                  Imprimir
                </button>
                <button 
                  onClick={handleDownload}
                  className="group flex items-center justify-center gap-3 py-4.5 bg-white/5 text-white border border-white/10 rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all shadow-xl active:scale-95"
                >
                  <Download size={20} className="group-hover:scale-110 transition-transform" />
                  PNG
                </button>
              </div>
              
              <button 
                onClick={handleCopyLink}
                disabled={isCopied}
                className={`mt-8 w-full flex items-center justify-center gap-3 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                  isCopied 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                    : "bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:bg-white/10"
                }`}
              >
                {isCopied ? (
                  <Check size={16} />
                ) : (
                  <Share2 size={16} />
                )}
                {isCopied ? 'Link Copiado!' : 'Copiar Link de Inscrição'}
              </button>
            </div>

            <div className="p-6 bg-white/[0.01] border-t border-white/5 flex flex-col items-center">
               <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-[0.5em] opacity-50">Eclesia Manager System</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
