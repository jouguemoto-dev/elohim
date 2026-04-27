import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  ChevronRight, 
  Copy, 
  Check,
  MessageSquareText,
  Activity,
  AlertCircle
} from 'lucide-react';
import { askAi, getSystemPrompt } from '../services/geminiService';
import { cn } from '../lib/utils';

interface AiAssistantProps {
  contextData?: any;
}

export function AiAssistant({ contextData }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: 'Olá! Sou seu assistente Master Audit. Como posso ajudar com os dados de inscrição hoje?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await askAi(userMsg, contextData);
      setMessages(prev => [...prev, { role: 'ai', content: response || 'Não obtive resposta.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Erro ao processar sua solicitação. Verifique sua conexão.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(getSystemPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-white text-black rounded-full shadow-[0_20px_50px_rgba(255,255,255,0.2)] flex items-center justify-center z-40 group overflow-hidden border border-white/20"
      >
        <motion.div
           animate={{ rotate: [0, 10, -10, 0] }}
           transition={{ duration: 4, repeat: Infinity }}
        >
          <Sparkles size={28} />
        </motion.div>
        
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-end p-4 md:p-8">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-md h-[700px] max-h-[85vh] bg-zinc-950 border border-zinc-900 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,1)] flex flex-col pointer-events-auto overflow-hidden"
            >
              {/* Header */}
              <div className="p-8 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shadow-inner">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-medium text-white tracking-tight">Master Audit AI</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ativo & Sincronizado</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-3 bg-zinc-900 text-zinc-600 hover:text-white rounded-2xl border border-zinc-800 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* System Prompt Info - Special Request from User */}
              <div className="px-8 py-4 bg-zinc-900/30 border-b border-zinc-900 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <AlertCircle size={14} className="text-zinc-700" />
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Prompt do Sistema</span>
                 </div>
                 <button 
                   onClick={copyPrompt}
                   className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[9px] font-bold text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                 >
                   {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                   {copied ? 'Copiado' : 'Copiar Definição'}
                 </button>
              </div>

              {/* Messages Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth custom-scrollbar">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-5 rounded-3xl text-sm leading-relaxed border shadow-xl relative overflow-hidden",
                      msg.role === 'user' 
                        ? "bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tr-none" 
                        : "bg-white/5 border-white/5 text-zinc-300 rounded-tl-none"
                    )}>
                      {msg.content}
                      {msg.role === 'ai' && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20" />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-3 px-2">
                      {msg.role === 'user' ? 'Você' : 'Analista IA'}
                    </span>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex flex-col items-start max-w-[85%]">
                    <div className="bg-white/5 border border-white/5 p-5 rounded-3xl rounded-tl-none flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      </div>
                      <span className="text-xs font-bold text-zinc-700 italic">Processando fluxo...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-8 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-xl">
                 <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 pl-6 focus-within:border-zinc-500 transition-all shadow-inner">
                    <input 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Analise as pendências financeiras..."
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-800 h-10"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isLoading}
                      className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl"
                    >
                      <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
