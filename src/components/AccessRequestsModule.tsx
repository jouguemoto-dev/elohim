import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  Search, 
  RefreshCw,
  Mail,
  User,
  ExternalLink
} from 'lucide-react';
import { churchService, MASTER_ADMIN_EMAIL } from '../services/churchService';
import { AccessRequest } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'react-toastify';
import { auth } from '../lib/firebase';

export default function AccessRequestsModule() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');

  const currentUserEmail = auth.currentUser?.email || '';
  const isMaster = currentUserEmail.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await churchService.getAllRequests();
      setRequests(data || []);
    } catch (e) {
      toast.error('Erro ao carregar solicitações de acesso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleStatusUpdate = async (id: string, email: string, status: 'approved' | 'denied') => {
    try {
      await churchService.updateRequestStatus(id, status, currentUserEmail);
      toast.success(status === 'approved' ? `Acesso aprovado para ${email}` : `Acesso negado para ${email}`);
      loadRequests();
    } catch (e) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isMaster) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center bg-zinc-950 rounded-[2.5rem] border border-zinc-900 border-dashed">
        <ShieldAlert size={48} className="text-zinc-800 mb-4" />
        <h3 className="text-lg font-display font-medium text-white mb-2 tracking-tight">Área Restrita</h3>
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] max-w-xs leading-relaxed">
          Somente o Master Admin ({MASTER_ADMIN_EMAIL}) tem permissão para gerenciar novos acessos ao sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-4xl font-display font-medium text-white tracking-tight leading-none mb-4">Controle de Acesso</h2>
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Gatekeeper Ativo</p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={loadRequests} 
            disabled={loading}
            className="p-3 bg-zinc-950 border border-zinc-900 rounded-2xl text-zinc-600 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Stats/Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={16} />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-4 pl-14 pr-6 text-[11px] font-bold text-white placeholder:text-zinc-800 focus:border-zinc-700 outline-none transition-all"
          />
        </div>

        {['all', 'pending', 'approved', 'denied'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st as any)}
            className={cn(
              "px-6 py-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all",
              statusFilter === st 
                ? "bg-white text-black border-white shadow-xl shadow-white/5" 
                : "bg-zinc-950 border-zinc-900 text-zinc-600 hover:border-zinc-700 hover:text-white"
            )}
          >
            {st === 'all' ? 'Todos' : st === 'pending' ? 'Pendentes' : st === 'approved' ? 'Aprovados' : 'Negados'}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
             <RefreshCw className="text-zinc-900 animate-spin" size={40} />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-zinc-950/50 rounded-[2rem] border border-zinc-900 border-dashed p-20 text-center">
             <Clock size={40} className="text-zinc-900 mx-auto mb-6" />
             <p className="text-zinc-400 font-display font-medium text-lg tracking-tight mb-2">Nenhuma solicitação encontrada</p>
             <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">
               Todas as solicitações de acesso que aguardam aprovação ou já foram processadas aparecerão aqui.
             </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={req.id}
                className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 group hover:border-zinc-800 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner border transition-all",
                    req.status === 'pending' ? "bg-zinc-900 border-zinc-800 text-zinc-600" :
                    req.status === 'approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                    "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  )}>
                    {req.status === 'pending' ? <Clock size={24} /> : 
                     req.status === 'approved' ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-display font-medium text-white tracking-tight">{req.name}</h4>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                        req.status === 'pending' ? "bg-zinc-900 border-zinc-800 text-zinc-600" :
                        req.status === 'approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-500"
                      )}>
                        {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Negado'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                       <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-2">
                         <Mail size={10} /> {req.email}
                       </span>
                       <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest flex items-center gap-2">
                         Solicitado em {new Date(req.requestedAt).toLocaleDateString()} às {new Date(req.requestedAt).toLocaleTimeString()}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(req.id!, req.email, 'approved')}
                        className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-black rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/10"
                      >
                        <UserCheck size={14} />
                        Autorizar
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(req.id!, req.email, 'denied')}
                        className="flex-1 md:flex-none px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-white hover:border-zinc-700 transition-all"
                      >
                        <XCircle size={14} />
                        Negar
                      </button>
                    </>
                  ) : (
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-700 px-6 py-3 bg-zinc-900/40 rounded-2xl border border-zinc-900">
                      Processado por: {req.processedBy === MASTER_ADMIN_EMAIL ? 'Master' : req.processedBy}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
