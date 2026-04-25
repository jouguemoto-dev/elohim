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
    recentEvents: [] as ChurchEvent[],
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
        upcomingEvents: events.filter(e => new Date(e.startDate) >= now).slice(0, 3),
        birthdayMembers
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  const Card = ({ title, value, icon: Icon, onClick, subtitle }: any) => (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      className="bg-zinc-900/40 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] border border-white/5 shadow-2xl flex flex-col md:flex-row md:items-start justify-between cursor-pointer group transition-all hover:bg-white/5 hover:border-white/10"
    >
      <div className="flex-1 min-w-0">
        <p className="text-zinc-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl md:text-3xl font-black text-white tracking-tighter truncate">{value}</h3>
          {subtitle && <span className="hidden sm:inline text-[9px] text-emerald-400 font-bold tracking-tight">{subtitle}</span>}
        </div>
      </div>
      <div className="hidden md:flex p-3 bg-zinc-800/50 rounded-2xl text-zinc-400 transition-all group-hover:bg-white/10 group-hover:text-white group-hover:shadow-lg group-hover:shadow-white/5 shrink-0">
        <Icon size={22} />
      </div>
    </motion.div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-zinc-600 font-bold text-xs uppercase tracking-widest">Iniciando Dashboard...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-2 pb-10">
      {/* Birthday Alerts Banner */}
      {stats.birthdayMembers.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-500/20 rounded-3xl text-emerald-400">
              <Cake size={32} />
            </div>
            <div>
              <h4 className="text-white font-black text-lg md:text-xl tracking-tight">Aniversariantes</h4>
              <p className="text-emerald-400/70 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                {stats.birthdayMembers.length} {stats.birthdayMembers.length === 1 ? 'membro soprando' : 'membros sopram'} velinhas esta semana
              </p>
            </div>
          </div>
          <div className="flex -space-x-4 overflow-hidden p-1">
            {stats.birthdayMembers.slice(0, 5).map((member, index) => (
              <div 
                key={member.id} 
                className="w-12 h-12 rounded-2xl border-4 border-[#050505] bg-zinc-800 flex items-center justify-center text-sm font-black text-emerald-400 overflow-hidden shadow-2xl transition-transform hover:translate-y-[-4px] cursor-help"
                title={`${member.name} - ${format(new Date(member.birthDate!), 'dd/MM')}`}
              >
                {member.photoUrl ? (
                  <img src={member.photoUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  member.name.charAt(0)
                )}
              </div>
            ))}
            {stats.birthdayMembers.length > 5 && (
              <div className="w-12 h-12 rounded-2xl border-4 border-[#050505] bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400 shadow-2xl">
                +{stats.birthdayMembers.length - 5}
              </div>
            )}
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
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col h-[480px]">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h3 className="font-bold text-[11px] text-zinc-400 uppercase tracking-[0.2em]">Recém Integrados</h3>
            <button 
              onClick={() => onNavigate('members')}
              className="text-[10px] font-bold text-zinc-300 hover:text-white transition-colors uppercase tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/5"
            >
              Base Completa
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.02] px-2">
            {stats.recentMembers.length > 0 ? stats.recentMembers.map((member) => {
              const isBirthdaySoon = stats.birthdayMembers.some(bm => bm.id === member.id);
              const isToday = member.birthDate && 
                new Date(member.birthDate).getDate() === new Date().getDate() && 
                new Date(member.birthDate).getMonth() === new Date().getMonth();

              return (
                <div 
                  key={member.id} 
                  className={cn(
                    "p-5 flex items-center gap-5 hover:bg-white/[0.03] transition-all cursor-pointer group rounded-2xl mx-2 my-1",
                    isBirthdaySoon && "bg-emerald-500/5 border border-emerald-500/10"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 overflow-hidden shrink-0 group-hover:bg-zinc-700 transition-all border border-white/5">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={18} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white group-hover:translate-x-1 transition-transform">{member.name}</p>
                      {isBirthdaySoon && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                            isToday ? "bg-emerald-500 text-black" : "bg-emerald-500/20 text-emerald-400"
                          )}
                        >
                          <Cake size={10} />
                          {isToday ? "Hoje!" : "Esta semana"}
                        </motion.div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] text-zinc-500 font-mono tracking-tighter">{member.phone}</p>
                      {member.birthDate && (
                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tight flex items-center gap-1">
                          • {format(new Date(member.birthDate), 'dd MMM', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "text-[9px] font-bold uppercase py-1 px-3 rounded-lg flex items-center gap-2",
                    member.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'
                  )}>
                    <div className={cn("w-1 h-1 rounded-full", member.status === 'active' ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                    {member.status === 'active' ? 'Ligado' : 'Off'}
                  </div>
                </div>
              );
            }) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest italic py-12">Nenhum registro recente</div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col h-[480px]">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h3 className="font-bold text-[11px] text-zinc-400 uppercase tracking-[0.2em]">Próximos Eventos</h3>
            <button 
              onClick={() => onNavigate('events')}
              className="text-[10px] font-bold text-zinc-300 hover:text-white transition-colors uppercase tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/5"
            >
              Ver Tudo
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {stats.upcomingEvents.length > 0 ? stats.upcomingEvents.map((event) => (
              <div key={event.id} className="flex gap-5 p-5 rounded-3xl border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all group">
                <div className="shrink-0 w-12 h-12 flex flex-col items-center justify-center bg-zinc-800 text-zinc-400 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform">
                  <span className="text-[9px] font-bold uppercase leading-none mb-1">{format(new Date(event.startDate), 'MMM', { locale: ptBR })}</span>
                  <span className="text-base font-black text-white">{format(new Date(event.startDate), 'dd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate mb-1">{event.title}</h4>
                  <div className="flex items-center gap-4 text-[10px] text-zinc-500 mt-2 font-medium">
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-zinc-600" /> {format(new Date(event.startDate), 'HH:mm')}</span>
                    <span className="truncate flex items-center gap-1.5"><MapPin size={12} className="text-zinc-600" /> {event.location}</span>
                  </div>
                </div>
                <div className="self-center p-2 rounded-full bg-white/5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight size={14} />
                </div>
              </div>
            )) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest italic">Agenda vazia</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
