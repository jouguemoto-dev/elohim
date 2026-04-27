import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  UserPlus, 
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  MapPin,
  Search,
  Filter,
  Cake
} from 'lucide-react';
import { churchService } from '../services/churchService';
import { Member, ChurchEvent } from '../types';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface DashboardProps {
  onNavigate: (page: any) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeEvents: 0,
    totalInscriptions: 0,
    totalCollected: 0,
    recentMembers: [] as Member[],
    recentRegistrations: [] as any[],
    allEvents: [] as ChurchEvent[],
    upcomingEvents: [] as ChurchEvent[],
    birthdayMembers: [] as Member[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [members, events] = await Promise.all([
        churchService.getMembers(),
        churchService.getEvents()
      ]);

      const now = new Date();
      const activeEvents = events.filter(e => new Date(e.endDate) >= now);
      
      // Calculate total registrations and financial data
      const allRegistrations = await churchService.getAllRegistrations();
      const totalRegs = allRegistrations.length;
      const totalCollected = allRegistrations
        .filter(r => r.status === 'paid')
        .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

      // Filter members with birthdays in the next 7 days
      const birthdayMembers = members.filter(member => {
        if (!member.birthDate) return false;
        
        const birthDate = new Date(member.birthDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Create a date for this year's birthday
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        // If birthday already passed this year, check next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);
        sevenDaysFromNow.setHours(23, 59, 59, 999);
        
        return thisYearBirthday >= today && thisYearBirthday <= sevenDaysFromNow;
      }).sort((a, b) => {
        const dateA = new Date(a.birthDate!);
        const dateB = new Date(b.birthDate!);
        return dateA.getMonth() - dateB.getMonth() || dateA.getDate() - dateB.getDate();
      });

      setStats({
        totalMembers: members.length,
        activeEvents: activeEvents.length,
        totalInscriptions: totalRegs,
        totalCollected: totalCollected,
        recentMembers: members.slice(0, 5),
        recentRegistrations: allRegistrations.slice(0, 5),
        allEvents: events,
        upcomingEvents: events.filter(e => new Date(e.startDate) >= now).slice(0, 3),
        birthdayMembers
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  const Card = ({ title, value, icon: Icon, onClick, subtitle }: any) => (
    <motion.div 
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-black p-6 rounded-3xl border border-zinc-900 flex flex-col justify-between cursor-pointer group transition-all hover:border-zinc-700"
    >
      <div className="flex-1 min-w-0">
        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-display font-medium text-white tracking-tight truncate">{value}</h3>
          {subtitle && <span className="hidden sm:inline text-[9px] text-zinc-500 font-bold tracking-tight">{subtitle}</span>}
        </div>
      </div>
    </motion.div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-zinc-600 font-bold text-xs uppercase tracking-widest">Iniciando Dashboard...</div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8 px-2 pb-10 pt-2">
        {/* Birthday Alerts Banner */}
      {stats.birthdayMembers.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 border border-zinc-900/50 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-500">
              <Cake size={28} />
            </div>
            <div>
              <h4 className="text-white font-display font-medium text-xl tracking-tight leading-tight">Aniversariantes</h4>
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] mt-1.5">
                {stats.birthdayMembers.length} {stats.birthdayMembers.length === 1 ? 'membro' : 'membros'} esta semana
              </p>
            </div>
          </div>
          <div className="flex -space-x-4 overflow-hidden">
            {stats.birthdayMembers.slice(0, 5).map((member, index) => (
              <div 
                key={member.id} 
                className="w-14 h-14 rounded-2xl border-4 border-black bg-zinc-900 flex items-center justify-center text-sm font-black text-white/50 overflow-hidden shadow-xl transition-transform hover:translate-y-[-4px] cursor-help"
                title={`${member.name} - ${format(new Date(member.birthDate!), 'dd/MM')}`}
              >
                {member.photoUrl ? (
                  <img src={member.photoUrl} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" alt="" referrerPolicy="no-referrer" />
                ) : (
                  member.name.charAt(0)
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card 
            title="Membros" 
            value={stats.totalMembers} 
            subtitle="+12"
            icon={Users} 
            onClick={() => onNavigate('members')}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card 
            title="Agenda" 
            value={stats.activeEvents} 
            icon={Calendar} 
            onClick={() => onNavigate('events')}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card 
            title="Inscrições" 
            value={stats.totalInscriptions} 
            icon={Activity} 
            onClick={() => onNavigate('registrations')}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card 
            title="Tesouraria" 
            value={`R$ ${stats.totalCollected.toLocaleString('pt-BR')}`}
            subtitle="Realizado"
            icon={TrendingUp} 
            onClick={() => onNavigate('registrations')}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Members */}
        <div className="bg-black rounded-3xl border border-zinc-900 overflow-hidden flex flex-col h-[520px]">
          <div className="px-8 py-6 border-b border-zinc-900/50 flex items-center justify-between bg-zinc-950/50">
            <div>
               <h3 className="font-display font-medium text-white tracking-tight">Membros Recentes</h3>
               <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-1 block">Fluxo de Registro</span>
            </div>
            <button 
              onClick={() => onNavigate('members')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-widest border border-white/5"
            >
              Base Completa
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900 px-4 py-2">
            {stats.recentMembers.length > 0 ? stats.recentMembers.map((member) => {
              const isBirthdaySoon = stats.birthdayMembers.some(bm => bm.id === member.id);
              return (
                <div 
                  key={member.id} 
                  className={cn(
                    "p-6 flex items-center gap-6 hover:bg-zinc-900/50 transition-all cursor-pointer group rounded-3xl mb-1",
                    isBirthdaySoon && "bg-white/[0.02]"
                  )}
                >
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-600 overflow-hidden shrink-0 group-hover:scale-105 transition-all border border-white/5">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-display font-medium text-zinc-100 group-hover:text-white transition-colors">{member.name}</p>
                    <p className="text-[10px] text-zinc-600 font-mono tracking-tighter mt-1">{member.phone}</p>
                  </div>
                  <div className="text-right">
                     <p className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                        member.status === 'active' ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-zinc-800 text-zinc-600"
                     )}>
                        {member.status === 'active' ? 'Ativo' : 'Inativo'}
                     </p>
                  </div>
                </div>
              );
            }) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px] font-black uppercase tracking-widest italic py-12">Sem registros</div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-black rounded-3xl border border-zinc-900 overflow-hidden flex flex-col h-[520px]">
          <div className="px-8 py-6 border-b border-zinc-900/50 flex items-center justify-between bg-zinc-950/50">
            <div>
               <h3 className="font-display font-medium text-white tracking-tight">Agenda Próxima</h3>
               <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-1 block">Missão e Visão</span>
            </div>
            <button 
              onClick={() => onNavigate('events')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-widest border border-white/5"
            >
              Ver Tudo
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {stats.upcomingEvents.length > 0 ? stats.upcomingEvents.map((event) => (
              <div key={event.id} className="flex gap-6 p-6 rounded-3xl border border-zinc-900 hover:border-zinc-700 bg-zinc-950/30 transition-all group cursor-pointer" onClick={() => onNavigate('events')}>
                <div className="shrink-0 w-14 h-14 flex flex-col items-center justify-center bg-zinc-900 border border-white/5 rounded-2xl group-hover:bg-white/5 transition-colors">
                  <span className="text-[9px] font-black uppercase text-zinc-600 leading-none mb-1.5">{format(new Date(event.startDate), 'MMM', { locale: ptBR })}</span>
                  <span className="text-xl font-display font-medium text-white leading-none">{format(new Date(event.startDate), 'dd')}</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-sm font-display font-medium text-zinc-100 group-hover:text-white transition-colors truncate mb-1.5">{event.title}</h4>
                  <div className="flex items-center gap-4 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Clock size={10} /> {format(new Date(event.startDate), 'HH:mm')}</span>
                    <span className="truncate flex items-center gap-1.5"><MapPin size={10} /> {event.location}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onNavigate('registrations'); }}
                    className="p-3 rounded-xl border border-zinc-900 group-hover:border-zinc-700 bg-black/40 text-zinc-600 hover:text-white transition-all flex items-center gap-2 text-[8px] font-black uppercase tracking-widest"
                  >
                    <Users size={12} />
                    <span>Inscritos</span>
                  </button>
                </div>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px] font-black uppercase tracking-widest italic py-12">Agenda limpa</div>
            )}
          </div>
        </div>

        {/* Recent Registrations Table */}
        <div className="lg:col-span-2 bg-black rounded-3xl border border-zinc-900 overflow-hidden flex flex-col h-[520px]">
          <div className="px-8 py-6 border-b border-zinc-900/50 flex items-center justify-between bg-zinc-950/50">
            <div>
               <h3 className="font-display font-medium text-white tracking-tight">Novas Inscrições</h3>
               <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-1 block">Fluxo de Caixa & Presença</span>
            </div>
            <button 
              onClick={() => onNavigate('registrations')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-widest border border-white/5"
            >
              Ver Painel Fluxo
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-[8px] font-black uppercase tracking-widest text-zinc-700 border-b border-zinc-900">
                  <th className="px-4 py-3 text-left">Participante</th>
                  <th className="px-4 py-3 text-left">Evento</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/10">
                {stats.recentRegistrations.length > 0 ? stats.recentRegistrations.map((reg) => (
                  <tr 
                    key={reg.id} 
                    className="group cursor-pointer hover:bg-white/[0.01] transition-all"
                    onClick={() => onNavigate('registrations')}
                  >
                    <td className="px-4 py-5 text-[11px] font-bold text-zinc-300 group-hover:text-white uppercase tracking-tight">{reg.name}</td>
                    <td className="px-4 py-5 text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-black truncate max-w-[150px]">
                      {stats.allEvents.find(e => e.id === reg.eventId)?.title || 'Evento'}
                    </td>
                    <td className="px-4 py-5 text-right font-mono text-[10px] text-zinc-500">R$ {reg.amountPaid.toFixed(2)}</td>
                    <td className="px-4 py-5 text-right">
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                        reg.status === 'paid' ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20" : "text-amber-500 bg-amber-500/10 border border-amber-500/20"
                      )}>
                        {reg.status === 'paid' ? 'Liquidado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-zinc-800 text-[10px] font-black uppercase tracking-widest italic">Nenhuma inscrição processada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
