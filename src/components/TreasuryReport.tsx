import React from 'react';
import { Registration, ChurchEvent } from '../types';
import { motion } from 'motion/react';
import { 
  Banknote, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TreasuryReportProps {
  registrations: Registration[];
  events: ChurchEvent[];
}

interface EventSummary {
  eventId: string;
  eventName: string;
  paidTotal: number;
  pendingTotal: number;
  paidCount: number;
  pendingCount: number;
  totalCount: number;
}

export default function TreasuryReport({ registrations, events }: TreasuryReportProps) {
  const getEventSummary = (): EventSummary[] => {
    const summaryMap = new Map<string, EventSummary>();

    // Initialize with all events that have registrations
    registrations.forEach(reg => {
      const eventId = reg.eventId;
      if (!summaryMap.has(eventId)) {
        const event = events.find(e => e.id === eventId);
        summaryMap.set(eventId, {
          eventId,
          eventName: event?.title || 'Evento não localizado',
          paidTotal: 0,
          pendingTotal: 0,
          paidCount: 0,
          pendingCount: 0,
          totalCount: 0
        });
      }

      const summary = summaryMap.get(eventId)!;
      summary.totalCount++;
      
      if (reg.status === 'paid') {
        summary.paidTotal += reg.amountPaid;
        summary.paidCount++;
      } else {
        summary.pendingTotal += reg.amountPaid;
        summary.pendingCount++;
      }
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.paidTotal - a.paidTotal);
  };

  const internalSummaries = getEventSummary();
  const grandTotalPaid = internalSummaries.reduce((acc, curr) => acc + curr.paidTotal, 0);
  const grandTotalPending = internalSummaries.reduce((acc, curr) => acc + curr.pendingTotal, 0);

  return (
    <div className="p-10 space-y-12 overflow-y-auto h-full bg-zinc-950/20">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900/50 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-6">Total Arrecadado</p>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-display font-medium text-emerald-500 tracking-tighter">
              R$ {grandTotalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <TrendingUp size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900/50 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-all" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-6">Valores Pendentes</p>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-display font-medium text-amber-500 tracking-tighter">
              R$ {grandTotalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <AlertCircle size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900/50 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-zinc-500/10 transition-all" />
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-6">Taxa de Liquidação</p>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-display font-medium text-white tracking-tighter">
              {grandTotalPaid + grandTotalPending > 0 
                ? Math.round((grandTotalPaid / (grandTotalPaid + grandTotalPending)) * 100) 
                : 0}%
            </h3>
            <div className="p-3 bg-white/5 rounded-2xl text-white">
              <Layers size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Grouped Table */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-xs font-black text-zinc-600 uppercase tracking-[0.4em]">Detalhamento por Projeto</h2>
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900/50 px-4 py-2 rounded-xl">
            <Calendar size={14} className="text-zinc-700" />
            Exercício Atual
          </div>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 border-b border-zinc-900/50">
                <th className="px-10 py-8 text-left">Evento / Projeto</th>
                <th className="px-10 py-8 text-center">Inscrições</th>
                <th className="px-10 py-8 text-right">Total Pago</th>
                <th className="px-10 py-8 text-right">Pendente</th>
                <th className="px-10 py-8 text-right border-l border-zinc-900/50">Liquidação</th>
                <th className="px-10 py-8 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/30">
              {internalSummaries.map((summary, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={summary.eventId}
                  className="group hover:bg-white/[0.02] transition-all"
                >
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-500 border border-zinc-800 transition-transform group-hover:scale-110">
                         <Banknote size={20} />
                      </div>
                      <div>
                        <p className="text-lg font-display font-medium text-white tracking-tight group-hover:text-emerald-400 transition-colors">{summary.eventName}</p>
                        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mt-1">ID CORE: {summary.eventId.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-xl">
                      <span className="text-sm font-display font-medium text-white">{summary.totalCount}</span>
                      <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Registros</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <p className="text-xl font-display font-medium text-emerald-500 tracking-tighter">
                      R$ {summary.paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest mt-1">{summary.paidCount} Pagos</p>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <p className="text-xl font-display font-medium text-amber-600 tracking-tighter">
                      R$ {summary.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[8px] font-black text-amber-900 uppercase tracking-widest mt-1">{summary.pendingCount} Pendentes</p>
                  </td>
                  <td className="px-10 py-8 text-right border-l border-zinc-900/50">
                    <p className="text-lg font-display font-medium text-zinc-300">
                      {summary.paidTotal + summary.pendingTotal > 0 
                        ? Math.round((summary.paidTotal / (summary.paidTotal + summary.pendingTotal)) * 100) 
                        : 0}%
                    </p>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center justify-center">
                      {summary.pendingTotal === 0 && summary.totalCount > 0 ? (
                        <div className="flex items-center gap-2 px-5 py-2 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                          <CheckCircle2 size={12} />
                          Finalizado
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-5 py-2 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 text-[9px] font-black uppercase tracking-widest">
                          <AlertCircle size={12} />
                          Em Aberto
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {internalSummaries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center text-zinc-800 font-black text-[10px] uppercase tracking-[0.4em] italic">
                    Sem dados financeiros consolidados para exibição
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
