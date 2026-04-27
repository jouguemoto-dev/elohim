import React, { useState, useEffect } from 'react';
import { 
  Users2, 
  Search, 
  Filter, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  X,
  UserPlus,
  Printer,
  FileText,
  ChevronDown,
  Banknote,
  LayoutGrid, 
  List as ListIcon,
  Cake,
  User,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Users,
  BarChart3
} from 'lucide-react';
import { churchService } from '../services/churchService';
import { Registration, ChurchEvent } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import ConfirmModal from './ConfirmModal';
import RegistrationReport from './RegistrationReport';

const isBirthdayUpcoming = (birthDate: string | undefined) => {
  if (!birthDate) return false;
  try {
    const today = new Date();
    const [year, month, day] = birthDate.split('-').map(Number);
    // Note: month from birthDate string is 1-indexed, JS Date month is 0-indexed
    const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
    
    // Set hours to 0 to compare days only
    today.setHours(0, 0, 0, 0);
    birthdayThisYear.setHours(0, 0, 0, 0);

    const diffTime = birthdayThisYear.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 7) return true;
    
    // Check if birthday just passed in late Dec and today is late Dec (next year's birthday is close)
    const birthdayNextYear = new Date(today.getFullYear() + 1, month - 1, day);
    birthdayNextYear.setHours(0, 0, 0, 0);
    const diffTimeNext = birthdayNextYear.getTime() - today.getTime();
    const diffDaysNext = Math.ceil(diffTimeNext / (1000 * 60 * 60 * 24));
    
    return diffDaysNext >= 0 && diffDaysNext <= 7;
  } catch (e) {
    return false;
  }
};

export default function RegistrationsModule() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'charts' | 'xls'>('table');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Registration | 'eventName'; direction: 'asc' | 'desc' }>({ key: 'registeredAt', direction: 'desc' });
  const [memberFilter, setMemberFilter] = useState<'all' | 'member' | 'non-member'>('all');
  const [ageFilter, setAgeFilter] = useState<'all' | 'minor' | 'adult'>('all');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [paymentMenuId, setPaymentMenuId] = useState<string | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
  }>({ isOpen: false, id: '' });

  const [editingReg, setEditingReg] = useState<Registration | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [regsData, eventsData] = await Promise.all([
      churchService.getAllRegistrations(),
      churchService.getEvents()
    ]);
    setRegistrations(regsData || []);
    setEvents(eventsData || []);
    setLoading(false);
  }

  const getEventName = (eventId: string) => {
    return events.find(e => e.id === eventId)?.title || 'Evento Excluído';
  };

  const filteredRegistrations = registrations.filter(reg => {
    const eventName = getEventName(reg.eventId).toLowerCase();
    const name = reg.name || '';
    const phone = reg.phone || '';
    const cpf = reg.cpf || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          phone.includes(searchTerm) ||
                          cpf.includes(searchTerm) ||
                          eventName.includes(searchTerm.toLowerCase());
    const matchesEvent = eventFilter === 'all' || reg.eventId === eventFilter;
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    const matchesMember = memberFilter === 'all' || (memberFilter === 'member' && reg.isMember) || (memberFilter === 'non-member' && !reg.isMember);
    const matchesAge = ageFilter === 'all' || (ageFilter === 'minor' && reg.isMinor) || (ageFilter === 'adult' && !reg.isMinor);
    
    return matchesSearch && matchesEvent && matchesStatus && matchesMember && matchesAge;
  }).sort((a, b) => {
    let aValue: any = sortConfig.key === 'eventName' ? getEventName(a.eventId) : (a as any)[sortConfig.key];
    let bValue: any = sortConfig.key === 'eventName' ? getEventName(b.eventId) : (b as any)[sortConfig.key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalCollected = filteredRegistrations
    .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

  const groupedData = React.useMemo(() => {
    const data: Array<{
      event: ChurchEvent | { id: string; title: string; price: number };
      regs: Registration[];
      totalCollected: number;
      totalPending: number;
      count: number;
    }> = [];

    events.forEach(event => {
      const regs = filteredRegistrations.filter(r => r.eventId === event.id);
      if (regs.length > 0) {
        const eventCollected = regs
          .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
        const totalExpected = regs.length * event.price;
        const totalPending = totalExpected - eventCollected;

        data.push({
          event,
          regs,
          totalCollected: eventCollected,
          totalPending: Math.max(0, totalPending),
          count: regs.length
        });
      }
    });

    const orphans = filteredRegistrations.filter(r => !events.find(e => e.id === r.eventId));
    if (orphans.length > 0) {
      const orphanCollected = orphans
        .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
      data.push({
        event: { id: 'orphaned', title: 'Evento Excluído / Outros', price: 0 },
        regs: orphans,
        totalCollected: orphanCollected,
        totalPending: 0,
        count: orphans.length
      });
    }

    return data;
  }, [filteredRegistrations, events]);

  const handleTogglePayment = async (reg: Registration, method?: Registration['paymentMethod']) => {
    const newStatus = reg.status === 'paid' && !method ? 'pending' : 'paid';
    
    // If marking as paid, default to event price if not set
    let newAmount = reg.amountPaid;
    if (newStatus === 'paid' && !newAmount) {
      const event = events.find(e => e.id === reg.eventId);
      newAmount = event?.price || 0;
    } else if (newStatus === 'pending') {
      newAmount = 0;
    }
    
    await churchService.updateRegistration(reg.id!, { 
       status: newStatus,
       amountPaid: newAmount,
       paymentMethod: method || (newStatus === 'paid' ? 'pix' : undefined)
    });
    setPaymentMenuId(null);
    loadData();
  };

  const handleUpdateAmount = async (id: string, amount: number) => {
    await churchService.updateRegistration(id, { amountPaid: amount });
    loadData();
  };

  const handleDelete = async (id: string) => {
    await churchService.deleteRegistration(id);
    loadData();
  };

  const [birthDate, setBirthDate] = useState<string>('');
  const [isMinor, setIsMinor] = useState(false);

  useEffect(() => {
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      setIsMinor(age < 18);
    } else {
      setIsMinor(false);
    }
  }, [birthDate]);

  const handleAddManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const eventId = formData.get('eventId') as string;
      const status = formData.get('status') as 'paid' | 'pending';
      const event = events.find(e => e.id === eventId);

      const registrationData: Partial<Registration> = {
        eventId,
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        cpf: formData.get('cpf') as string,
        address: formData.get('address') as string,
        birthDate: formData.get('birthDate') as string,
        isMinor,
        emergencyContacts: isMinor ? {
          name1: formData.get('emergencyName1') as string,
          phone1: formData.get('emergencyPhone1') as string,
          name2: formData.get('emergencyName2') as string,
          phone2: formData.get('emergencyPhone2') as string,
        } : undefined,
        isMember: formData.get('isMember') === 'sim',
        status,
        amountPaid: Number(formData.get('amountPaid')) || 0,
        paymentMethod: status === 'paid' ? (formData.get('paymentMethod') as any) : undefined
      };

      if (editingReg) {
        await churchService.updateRegistration(editingReg.id!, registrationData);
      } else {
        await churchService.addRegistration(registrationData as any);
      }
      
      setIsModalOpen(false);
      setEditingReg(null);
      setBirthDate('');
      loadData();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToExcel = () => {
    const data = filteredRegistrations.map(reg => ({
      'Nome': reg.name,
      'Telefone': reg.phone,
      'Evento': getEventName(reg.eventId),
      'Membro': reg.isMember ? 'Sim' : 'Não',
      'Status': reg.status === 'paid' ? 'Pago' : 'Pendente',
      'Valor Pago': reg.amountPaid,
      'Data Inscrição': reg.registeredAt ? format(new Date(reg.registeredAt), 'dd/MM/yyyy HH:mm') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inscritos");
    XLSX.writeFile(wb, `inscritos_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(18);
    doc.text('Relatório Financeiro de Inscritos', 14, 22);
    doc.setFontSize(10);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
    doc.text(`Total Inscritos: ${filteredRegistrations.length}`, 14, 35);
    doc.text(`Total Arrecadado: R$ ${totalCollected.toLocaleString('pt-BR')}`, 14, 40);

    const tableData = filteredRegistrations.map(reg => [
      reg.name,
      getEventName(reg.eventId),
      reg.registeredAt ? format(new Date(reg.registeredAt), 'dd/MM/yyyy HH:mm') : '-',
      reg.status === 'paid' ? 'Pago' : 'Pendente',
      `R$ ${reg.amountPaid.toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Nome', 'Evento', 'Data Inscrição', 'Status', 'Valor']],
      body: tableData,
    });

    doc.save(`inscritos_financeiro_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
  };

  const requestSort = (key: keyof Registration | 'eventName') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }: { column: keyof Registration | 'eventName' }) => {
    if (sortConfig.key !== column) return <ChevronDown size={10} className="ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronDown size={10} className="ml-1 rotate-180 text-white" /> : 
      <ChevronDown size={10} className="ml-1 text-white" />;
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6">
        <div className="space-y-1">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <Users2 size={16} />
              </div>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Data Core — Inscrições</span>
           </div>
           <h2 className="text-4xl font-display font-medium text-white tracking-tight">Fluxo de Inscritos</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-900/50">
            <button 
              onClick={exportToExcel}
              className="p-2.5 text-zinc-600 hover:text-white transition-all"
              title="Exportar Excel"
            >
              <FileSpreadsheet size={20} />
            </button>
            <button 
              onClick={exportToPDF}
              className="p-2.5 text-zinc-600 hover:text-white transition-all border-l border-zinc-900"
              title="Relatório PDF"
            >
              <Printer size={20} />
            </button>
          </div>

          <button 
            onClick={() => { setEditingReg(null); setIsModalOpen(true); }}
            className="bg-white text-black px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
          >
            <UserPlus size={18} />
            <span>Novo Registro</span>
          </button>
        </div>
      </header>

      {/* Stats Summary - Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-6">
        <div className="md:col-span-2 bg-zinc-950/50 p-10 rounded-[2.5rem] border border-zinc-900/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] blur-3xl rounded-full -mr-32 -mt-32" />
          <div className="relative z-10">
            <p className="text-zinc-600 text-[8px] font-black uppercase tracking-[0.4em] mb-6">Volume Total Arrecadado</p>
            <div className="flex items-baseline gap-2">
              <span className="text-zinc-700 text-lg font-display">R$</span>
              <h3 className="text-5xl font-display font-medium text-white tracking-tighter">
                {totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="mt-8 flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-zinc-800 uppercase tracking-widest mb-1">Taxa de Liquidação</span>
                <span className="text-emerald-500 font-display font-medium">
                  {registrations.length > 0 
                    ? Math.round((registrations.filter(r => r.status === 'paid').length / registrations.length) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="w-px h-8 bg-zinc-900" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-zinc-800 uppercase tracking-widest mb-1">Média por Inscrito</span>
                <span className="text-zinc-400 font-display font-medium">
                  R$ {registrations.length > 0 
                    ? (totalCollected / registrations.length).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) 
                    : 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/50 p-10 rounded-[2.5rem] border border-zinc-900/50 group relative overflow-hidden">
          <div className="absolute inset-0 bg-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-zinc-600 text-[8px] font-black uppercase tracking-[0.4em] mb-6">Participantes</p>
          <div className="flex items-center justify-between">
            <h3 className="text-5xl font-display font-medium text-white tracking-tighter">{filteredRegistrations.length}</h3>
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700 group-hover:text-white group-hover:bg-zinc-800 transition-all">
               <Users2 size={24} />
            </div>
          </div>
          <p className="text-[9px] text-zinc-600 font-black tracking-widest uppercase mt-6">Fluxo Ativo de Dados</p>
        </div>

        <div className="bg-zinc-950/50 p-10 rounded-[2.5rem] border border-zinc-900/50 group relative overflow-hidden">
          <p className="text-zinc-600 text-[8px] font-black uppercase tracking-[0.4em] mb-6">Liquidados</p>
          <div className="flex items-center justify-between">
            <h3 className="text-5xl font-display font-medium text-emerald-500 tracking-tighter">
               {filteredRegistrations.filter(r => r.status === 'paid').length}
            </h3>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
               <CheckCircle2 size={24} />
            </div>
          </div>
          <p className="text-[9px] text-zinc-600 font-black tracking-widest uppercase mt-6">{filteredRegistrations.filter(r => r.status === 'pending').length} Pendentes</p>
        </div>
      </div>

      {/* Filters & Control Center */}
      <div className="mx-6 flex flex-col gap-4">
        <div className="bg-zinc-950 p-6 rounded-[2.5rem] border border-zinc-900/50 flex flex-col lg:flex-row gap-6 items-stretch shadow-2xl">
          <div className="relative flex-1 flex items-center bg-black/40 px-6 py-4 rounded-2xl border border-zinc-900 focus-within:border-zinc-500 transition-all group">
            <Search className="text-zinc-800 mr-4 group-focus-within:text-white transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, cpf ou whatsapp..." 
              className="bg-transparent border-none text-xs font-medium w-full outline-none text-white placeholder:text-zinc-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-zinc-700 hover:text-white p-1">
                <X size={14} />
              </button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group">
               <select 
                 value={eventFilter}
                 onChange={(e) => setEventFilter(e.target.value)}
                 className="w-full sm:min-w-[220px] bg-black/40 border border-zinc-900 text-[9px] font-black uppercase tracking-[0.2em] px-6 py-4 rounded-2xl text-zinc-500 focus:text-white outline-none hover:bg-zinc-900 transition-all appearance-none cursor-pointer"
               >
                 <option value="all" className="bg-zinc-950">Todos os Eventos</option>
                 {events.map(event => (
                   <option key={event.id} value={event.id} className="bg-zinc-950">{event.title}</option>
                 ))}
               </select>
               <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-800 pointer-events-none group-hover:text-zinc-400 transition-colors" size={16} />
            </div>

            <div className="bg-black/40 p-1.5 rounded-2xl border border-zinc-900 flex">
               {[
                 { id: 'all', label: 'Tudo' },
                 { id: 'paid', label: 'Liquidados' },
                 { id: 'pending', label: 'Pendentes' }
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setStatusFilter(tab.id as any)}
                   className={cn(
                     "px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                     statusFilter === tab.id ? "bg-white text-black shadow-xl" : "text-zinc-700 hover:text-zinc-300"
                   )}
                 >
                   {tab.label}
                 </button>
               ))}
            </div>

            <div className="hidden sm:flex bg-black/40 p-1.5 rounded-2xl border border-zinc-900 shadow-inner">
               <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    viewMode === 'table' ? "bg-white text-black shadow-xl" : "text-zinc-700 hover:text-white"
                  )}
                  title="Tabela de Fluxo"
               >
                  <ListIcon size={18} />
               </button>
               <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-white text-black shadow-xl" : "text-zinc-700 hover:text-white"
                  )}
                  title="Visão de Cards"
               >
                  <LayoutGrid size={18} />
               </button>
               <button
                  onClick={() => setViewMode('charts')}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    viewMode === 'charts' ? "bg-white text-black shadow-xl" : "text-zinc-700 hover:text-white"
                  )}
                  title="Relatório Visual"
               >
                  <BarChart3 size={18} />
               </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 px-6 pb-2">
          <div className="flex items-center gap-4">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700">Participação:</span>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'member', label: 'Membros' },
                { id: 'non-member', label: 'Visitantes' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setMemberFilter(opt.id as any)}
                  className={cn(
                    "text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg border transition-all",
                    memberFilter === opt.id 
                      ? "bg-zinc-800 text-white border-zinc-700 shadow-lg" 
                      : "text-zinc-700 border-transparent hover:text-zinc-400"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-4 bg-zinc-900 hidden md:block" />

          <div className="flex items-center gap-4">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700">Target Audit:</span>
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'Fluxo Total' },
                { id: 'minor', label: 'Menores de Idade' },
                { id: 'adult', label: 'Adultos' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAgeFilter(opt.id as any)}
                  className={cn(
                    "text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg border transition-all",
                    ageFilter === opt.id 
                      ? "bg-zinc-800 text-white border-zinc-700 shadow-lg" 
                      : "text-zinc-700 border-transparent hover:text-zinc-400"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden bg-black border border-zinc-900 rounded-[2.5rem] shadow-2xl flex flex-col mx-4">
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-zinc-800 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Sincronizando Core Financeiro...</div>
          ) : viewMode === 'charts' ? (
            <RegistrationReport registrations={filteredRegistrations} events={events} />
          ) : filteredRegistrations.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-800 mb-6 border border-zinc-800/50">
                <Search size={32} />
              </div>
              <p className="text-zinc-400 font-display font-medium text-lg tracking-tight mb-2">Nenhum registro localizado no sistema</p>
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] max-w-xs leading-relaxed">
                Verifique se os termos de busca ou filtros de evento estão ocultando os dados.
              </p>
              {(searchTerm || eventFilter !== 'all' || statusFilter !== 'all' || memberFilter !== 'all' || ageFilter !== 'all') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setEventFilter('all');
                    setStatusFilter('all');
                    setMemberFilter('all');
                    setAgeFilter('all');
                  }}
                  className="mt-6 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden lg:block overflow-hidden flex-1">
                {viewMode === 'table' ? (
                  <div className="h-full flex flex-col">
                    <div className="bg-zinc-950/80 sticky top-0 z-20 border-y border-zinc-900/50 backdrop-blur-md">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">
                            <th className="px-8 py-6 text-left border-r border-zinc-900/50 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('name')}>
                              <div className="flex items-center gap-2">
                                Participante <SortIcon column="name" />
                              </div>
                            </th>
                            <th className="px-8 py-6 text-left border-r border-zinc-900/50 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('eventName')}>
                              <div className="flex items-center gap-2">
                                Destino / Evento <SortIcon column="eventName" />
                              </div>
                            </th>
                            <th className="px-8 py-6 text-left border-r border-zinc-900/50 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('phone')}>
                              <div className="flex items-center gap-2">
                                Contato <SortIcon column="phone" />
                              </div>
                            </th>
                            <th className="px-8 py-6 text-center border-r border-zinc-900/50 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('status')}>
                              <div className="flex items-center justify-center gap-2">
                                Status <SortIcon column="status" />
                              </div>
                            </th>
                            <th className="px-8 py-6 text-right border-r border-zinc-900/50 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('amountPaid')}>
                              <div className="flex items-center justify-end gap-2">
                                Valor <SortIcon column="amountPaid" />
                              </div>
                            </th>
                            <th className="px-8 py-6 text-right w-32">Ações</th>
                          </tr>
                        </thead>
                      </table>
                    </div>

                    <div className="flex-1">
                      <table className="w-full border-collapse">
                        <tbody className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          {filteredRegistrations.map((reg) => (
                            <tr 
                              key={reg.id} 
                              className="hover:bg-white/[0.02] border-b border-zinc-900 transition-all group cursor-pointer"
                              onClick={() => { setSelectedReg(reg); setIsDetailOpen(true); }}
                            >
                              <td className="px-8 py-5 border-r border-zinc-900/50 font-display text-xs text-white normal-case tracking-tight w-[25%]">
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                                    reg.isMinor ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                                  )}>
                                    {reg.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      {reg.name}
                                      {isBirthdayUpcoming(reg.birthDate) && (
                                        <Cake size={12} className="text-rose-400 animate-pulse" />
                                      )}
                                    </div>
                                    {reg.isMinor && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest mt-1">Dependente / Menor</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-5 border-r border-zinc-900/50 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                <div className="flex flex-col gap-1">
                                  <span className="truncate max-w-[200px]">{getEventName(reg.eventId)}</span>
                                  {reg.isMember && <span className="text-[7px] text-zinc-700 font-black tracking-[0.2em]">Membro Efetivo</span>}
                                </div>
                              </td>
                              <td className="px-8 py-5 border-r border-zinc-900/50 font-mono text-[9px] text-zinc-600">{reg.phone}</td>
                              <td className="px-8 py-5 border-r border-zinc-900/50 text-center">
                                <div className="flex flex-col items-center gap-2 relative" onClick={e => e.stopPropagation()}>
                                  <button 
                                    onClick={() => {
                                      if (reg.status === 'paid') {
                                        handleTogglePayment(reg);
                                      } else {
                                        setPaymentMenuId(paymentMenuId === reg.id ? null : (reg.id || null));
                                      }
                                    }}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all active:scale-95 flex items-center gap-2 mx-auto",
                                      reg.status === 'paid' 
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                        : "bg-zinc-950 text-zinc-700 border-zinc-900 hover:text-zinc-300"
                                    )}
                                  >
                                    {reg.status === 'paid' ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse" />}
                                    {reg.status === 'paid' ? 'Liquidado' : 'Aguardando'}
                                    {reg.status === 'pending' && <ChevronDown size={10} className={cn("transition-transform", paymentMenuId === reg.id && "rotate-180")} />}
                                  </button>

                                  <AnimatePresence>
                                    {paymentMenuId === reg.id && (
                                      <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full mt-2 z-50 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 min-w-[160px] flex flex-col gap-1"
                                      >
                                        <p className="text-[7px] font-black text-zinc-700 uppercase tracking-widest p-2 border-b border-white/5 mb-1 text-left">Confirmar Recebimento</p>
                                        {[
                                          { id: 'pix', label: 'Via PIX', icon: Search, color: 'text-emerald-400' },
                                          { id: 'cash', label: 'Em Dinheiro', icon: Banknote, color: 'text-amber-400' },
                                          { id: 'card', label: 'Cartão', icon: CreditCard, color: 'text-blue-400' }
                                        ].map((method) => (
                                          <button
                                            key={method.id}
                                            onClick={() => handleTogglePayment(reg, method.id as any)}
                                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all group/item text-left"
                                          >
                                            <method.icon size={12} className={method.color} />
                                            <span className="text-[9px] font-bold text-zinc-500 group-hover/item:text-white uppercase tracking-widest">{method.label}</span>
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </td>
                              <td className="px-8 py-5 border-r border-zinc-900/50 text-right group-hover:bg-white/[0.01] transition-colors" onClick={e => e.stopPropagation()}>
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] text-zinc-800 font-bold">R$</span>
                                    <input 
                                      type="number"
                                      className="w-20 bg-transparent border-none p-0 text-sm font-display font-medium text-white focus:ring-0 text-right outline-none tracking-tight"
                                      defaultValue={reg.amountPaid}
                                      onBlur={(e) => handleUpdateAmount(reg.id!, Number(e.target.value))}
                                    />
                                  </div>
                                  {reg.paymentMethod && <span className="text-[7px] text-zinc-700 font-black uppercase tracking-widest">{reg.paymentMethod}</span>}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-right w-32">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={(e) => { e.stopPropagation(); setSelectedReg(reg); setIsDetailOpen(true); }} className="p-2 text-zinc-700 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"><FileText size={16} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setEditingReg(reg); setBirthDate(reg.birthDate || ''); setIsModalOpen(true); }} className="p-2 text-zinc-700 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"><Edit2 size={16} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, id: reg.id! }); }} className="p-2 text-zinc-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-10 overflow-y-auto">
                    {filteredRegistrations.map((reg) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={reg.id} 
                        className="bg-zinc-950/40 border border-zinc-900 rounded-[2.5rem] p-10 hover:border-zinc-700 transition-all cursor-pointer group relative overflow-hidden flex flex-col gap-10"
                        onClick={() => { setSelectedReg(reg); setIsDetailOpen(true); }}
                      >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.01] blur-3xl rounded-full -mr-32 -mt-32" />
                        
                        <div className="flex items-start justify-between relative z-10">
                          <div className="flex items-center gap-5">
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-black shadow-2xl",
                              reg.isMinor ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-zinc-900 text-zinc-600 border border-zinc-800"
                            )}>
                              {reg.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                               <h4 className="font-display font-medium text-white text-xl tracking-tight flex items-center gap-2">
                                 {reg.name}
                                 {isBirthdayUpcoming(reg.birthDate) && <Cake size={16} className="text-rose-400 animate-bounce" />}
                               </h4>
                               <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-[0.2em] mt-1.5 truncate max-w-[180px]">{getEventName(reg.eventId)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, id: reg.id! }); }}
                               className="p-3 text-zinc-900 hover:text-rose-500 rounded-2xl transition-all opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-rose-500/10"
                             >
                               <Trash2 size={18} />
                             </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-8 border-y border-zinc-900 relative z-10">
                           <div className="space-y-2 relative">
                              <p className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.4em]">Audit Loop</p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (reg.status === 'paid') {
                                    handleTogglePayment(reg);
                                  } else {
                                    setPaymentMenuId(paymentMenuId === reg.id ? null : (reg.id || null));
                                  }
                                }}
                                className={cn(
                                  "inline-flex items-center gap-3 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95",
                                  reg.status === 'paid' ? "bg-emerald-500 text-black border-emerald-500 shadow-xl" : "bg-zinc-900 text-zinc-700 border-zinc-800 hover:text-zinc-300"
                                )}
                              >
                                {reg.status === 'paid' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                {reg.status === 'paid' ? 'Liquidado' : 'Audit Pendente'}
                                {reg.status === 'pending' && <ChevronDown size={10} className={cn("transition-transform", paymentMenuId === reg.id && "rotate-180")} />}
                              </button>

                              <AnimatePresence>
                                {paymentMenuId === reg.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full mb-4 left-0 z-50 bg-black border border-zinc-900 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] p-2 min-w-[200px] flex flex-col gap-1.5"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest p-3 border-b border-white/5 mb-1.5">Meio de Recebimento</p>
                                    {[
                                      { id: 'pix', label: 'Via PIX', icon: Search, color: 'text-emerald-400' },
                                      { id: 'cash', label: 'Em Dinheiro', icon: Banknote, color: 'text-amber-400' },
                                      { id: 'card', label: 'Via Cartão', icon: CreditCard, color: 'text-blue-400' }
                                    ].map((method) => (
                                      <button
                                        key={method.id}
                                        onClick={() => handleTogglePayment(reg, method.id as any)}
                                        className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-2xl transition-all group/item text-left"
                                      >
                                        <method.icon size={14} className={method.color} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover/item:text-white leading-none">{method.label}</span>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                           </div>
                           <div className="text-right space-y-2">
                              <p className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.4em]">Montante</p>
                              <p className="text-2xl font-display font-medium text-white tracking-tighter">R$ {reg.amountPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between relative z-10 mt-auto">
                            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600 bg-black/40 px-4 py-2.5 rounded-2xl border border-zinc-900">
                               <Search size={14} className="text-zinc-800" />
                               {reg.phone}
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingReg(reg); setBirthDate(reg.birthDate || ''); setIsModalOpen(true); }}
                              className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest rounded-2xl hover:bg-white hover:text-black transition-all active:scale-95 flex items-center gap-2"
                            >
                               <Edit2 size={14} />
                               Editar
                            </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Mobile View */}
              <div className="lg:hidden space-y-6 px-4 py-8 overflow-y-auto">
                {filteredRegistrations.map((reg) => (
                  <div 
                    key={reg.id} 
                    className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-8 space-y-8 relative overflow-hidden group active:bg-zinc-900/50 transition-all"
                    onClick={() => { setSelectedReg(reg); setIsDetailOpen(true); }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black",
                          reg.isMinor ? "bg-rose-500/10 text-rose-500" : "bg-zinc-900 text-zinc-700 border border-zinc-800"
                        )}>
                          {reg.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display font-medium text-white text-lg tracking-tight truncate max-w-[150px]">{reg.name}</h4>
                          <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-widest mt-1 truncate">{getEventName(reg.eventId)}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all shrink-0",
                        reg.status === 'paid' ? "bg-emerald-500 text-black border-emerald-500" : "bg-black text-zinc-700 border-zinc-900"
                      )}>
                        {reg.status === 'paid' ? 'Pago' : 'Pendente'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-6 border-y border-zinc-900/50">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-800">Contato</p>
                          <p className="text-xs text-zinc-400 font-mono tracking-tighter italic">{reg.phone}</p>
                       </div>
                       <div className="space-y-1 text-right">
                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-800">Valor</p>
                          <p className="text-lg font-display font-medium text-white tracking-tighter">R$ {reg.amountPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                    </div>

                    <div className="flex items-center justify-between">
                       <p className="text-[8px] text-zinc-800 font-black uppercase tracking-widest">
                          {reg.registeredAt ? format(new Date(reg.registeredAt), 'dd MMM yyyy') : '-'}
                       </p>
                       <div className="flex gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, id: reg.id! }); }}
                            className="p-3 text-zinc-700 hover:text-rose-500 transition-all"
                          >
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="px-6 md:px-10 py-5 bg-white/[0.02] border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
           {filteredRegistrations.length} registros ativos
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: '' })}
        onConfirm={() => handleDelete(confirmModal.id)}
        title="Confirmar Exclusão"
        message="Esta operação removerá permanentemente o registro de inscrição e seu histórico financeiro do sistema."
      />

      {/* Registration Detail Panel */}
      <AnimatePresence>
        {isDetailOpen && selectedReg && (
          <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-900 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col pointer-events-auto"
            >
              <div className="p-10 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50 backdrop-blur-xl">
                 <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner border",
                      selectedReg.isMinor ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-zinc-900 text-zinc-700 border-zinc-800"
                    )}>
                      {selectedReg.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-medium text-white tracking-tight leading-tight">{selectedReg.name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Master Audit ID: {selectedReg.id?.substring(0, 8)}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          selectedReg.status === 'paid' ? "text-emerald-500" : "text-amber-500"
                        )}>{selectedReg.status === 'paid' ? 'Liquidado' : 'Audit Pendente'}</span>
                      </div>
                    </div>
                 </div>
                 <button onClick={() => setIsDetailOpen(false)} className="p-3 bg-zinc-900 text-zinc-500 hover:text-white rounded-2xl border border-zinc-800 transition-all hover:scale-105">
                   <X size={20} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-16 custom-scrollbar scroll-p-10">
                 {/* Basic Info */}
                 <div className="space-y-8">
                    <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                       <User size={14} className="text-zinc-700" />
                       <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em]">Identificação Registro</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-800 tracking-widest mb-2">CPF Registro</p>
                          <p className="text-sm font-mono text-white tracking-tighter">{selectedReg.cpf || 'PENDENTE'}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-800 tracking-widest mb-2">Data de Nascimento</p>
                          <p className="text-sm font-display text-white">
                             {selectedReg.birthDate ? format(new Date(selectedReg.birthDate), 'dd/MM/yyyy') : '-'}
                             {selectedReg.isMinor && <span className="ml-3 text-[9px] text-rose-500 font-black uppercase tracking-[0.2em] opacity-80">(ID Menor)</span>}
                          </p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-800 tracking-widest mb-2">Contato WhatsApp</p>
                          <p className="text-sm font-mono text-emerald-400 tracking-tighter">{selectedReg.phone || '-'}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-800 tracking-widest mb-2">Fator Sanguíneo</p>
                          <p className="text-sm font-bold text-zinc-300">{selectedReg.bloodType || 'N/A'}</p>
                       </div>
                    </div>
                 </div>

                 {/* Extra Health Info */}
                 <div className="space-y-8">
                    <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                       <AlertCircle size={14} className="text-zinc-700" />
                       <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em]">Protocolos de Saúde</h4>
                    </div>
                    <div className="space-y-8">
                       <div className="bg-zinc-900/30 rounded-3xl p-6 border border-zinc-900">
                          <p className="text-[9px] font-black uppercase text-zinc-800 tracking-widest mb-3">Histórico de Alergias</p>
                          <p className="text-xs text-zinc-400 leading-relaxed italic">
                            {selectedReg.allergies || 'Nenhuma ocorrência reportada no ato da inscrição.'}
                          </p>
                       </div>
                       <div className="bg-zinc-900/30 rounded-3xl p-6 border border-zinc-900">
                          <p className="text-[9px] font-black uppercase text-zinc-800 tracking-widest mb-3">Notas de Observação</p>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {selectedReg.observations || 'Sem observações suplementares para este registro.'}
                          </p>
                       </div>
                    </div>
                 </div>

                 {/* Address */}
                 <div className="space-y-8">
                    <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                       <MapPin size={14} className="text-zinc-700" />
                       <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em]">Local de Residência</h4>
                    </div>
                    <div className="bg-zinc-900/20 p-8 rounded-3xl border border-zinc-900/50">
                       <p className="text-sm text-zinc-500 leading-relaxed font-mono italic">
                          {selectedReg.address || 'Logradouro não informado pelo participante.'}
                       </p>
                    </div>
                  </div>
               </div>

               <div className="p-10 border-t border-zinc-900 bg-zinc-950 flex flex-col gap-8">
                  <div className="flex items-center justify-between">
                     <div>
                        <p className="text-[9px] font-black uppercase text-zinc-800 tracking-widest mb-2">Liquidação Financeira</p>
                        <div className="flex items-center gap-4">
                           <p className="text-3xl font-display font-medium text-white tracking-tighter">R$ {selectedReg.amountPaid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           {selectedReg.status === 'paid' && (
                              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                {selectedReg.paymentMethod || 'QUITADO'}
                              </span>
                           )}
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] font-black uppercase text-zinc-800 tracking-widest mb-2">Sincronizado</p>
                        <p className="text-[10px] text-zinc-600 font-mono italic">{selectedReg.registeredAt ? format(new Date(selectedReg.registeredAt), 'dd/MM/yyyy HH:mm') : '-'}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <button 
                       onClick={() => { setEditingReg(selectedReg); setBirthDate(selectedReg.birthDate || ''); setIsModalOpen(true); }}
                       className="flex items-center justify-center gap-3 px-8 py-5 bg-zinc-900 border border-zinc-800 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:border-zinc-500 transition-all active:scale-95"
                     >
                       <Edit2 size={16} />
                       Alterar Registro
                     </button>
                     <button 
                       onClick={() => window.print()} 
                       className="flex items-center justify-center gap-3 px-8 py-5 bg-white text-black rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
                     >
                       <Printer size={16} />
                       Gerar PDF
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Registration Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-950 border border-zinc-900 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
            >
              <div className="p-10 md:p-12 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/50 backdrop-blur-xl">
                <div>
                   <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] mb-3 block">Sistema de Registro de Fluxo — Terminal Audit</span>
                   <h3 className="text-3xl md:text-4xl font-display font-medium text-white tracking-tighter">
                     {editingReg ? 'Atualização de Registro' : 'Nova Entrada Manual'}
                   </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-4 bg-zinc-900 text-zinc-600 hover:text-white rounded-[1.5rem] border border-zinc-800 transition-all hover:scale-105">
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleAddManual} className="flex-1 overflow-y-auto p-10 md:p-16 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
                  <div className="space-y-16">
                    <div className="space-y-10">
                      <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                        <FileText size={14} className="text-zinc-700" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600">Base Context</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">Selecione o Projeto Auditado</label>
                          <select 
                            required
                            name="eventId"
                            defaultValue={editingReg?.eventId}
                            className="w-full h-16 px-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-white focus:border-white transition-all outline-none appearance-none cursor-pointer"
                          >
                            <option value="" className="bg-zinc-950">Destinação — Selecionar</option>
                            {events.map(event => (
                              <option key={event.id} value={event.id} className="bg-zinc-950">{event.title} (TX: R$ {event.price.toLocaleString('pt-BR')})</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">Status Nominal</label>
                            <select 
                              name="status"
                              defaultValue={editingReg?.status || 'pending'}
                              className="w-full h-16 px-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-white focus:border-white transition-all outline-none appearance-none cursor-pointer"
                            >
                              <option value="pending" className="bg-zinc-950">AGUARDANDO</option>
                              <option value="paid" className="bg-zinc-950">LIQUIDADO</option>
                            </select>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">Valor Auditado</label>
                            <div className="relative group">
                               <input 
                                 required
                                 type="number"
                                 name="amountPaid"
                                 defaultValue={editingReg?.amountPaid || 0}
                                 className="w-full h-16 pl-12 pr-6 bg-zinc-900 rounded-2xl border border-zinc-800 text-lg font-mono text-white focus:border-emerald-500 transition-all outline-none"
                               />
                               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-800 group-focus-within:text-emerald-500 transition-colors">R$</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                        <User size={14} className="text-zinc-700" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600">User Identification</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">Nome Completo do Portador</label>
                          <input 
                            required
                            name="name"
                            defaultValue={editingReg?.name}
                            placeholder="Ex: ARTHUR MORGAN"
                            className="w-full h-16 px-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-white focus:bg-zinc-800/50 focus:border-white transition-all outline-none placeholder:text-zinc-800"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                           <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">CPF (Audit Path)</label>
                             <input 
                               name="cpf"
                               defaultValue={editingReg?.cpf}
                               placeholder="000.000.000-00"
                               className="w-full h-16 px-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-mono text-white focus:border-white outline-none"
                             />
                           </div>
                           <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">Nascimento</label>
                             <input 
                               required
                               type="date"
                               value={birthDate}
                               onChange={(e) => setBirthDate(e.target.value)}
                               className="w-full h-16 px-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-zinc-500 focus:text-white transition-all outline-none"
                             />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                           <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">Fone Sincronizado</label>
                             <input 
                               required
                               name="phone"
                               defaultValue={editingReg?.phone}
                               placeholder="(00) 0 0000-0000"
                               className="w-full h-16 px-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-mono text-white focus:border-white outline-none"
                             />
                           </div>
                           <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">Fator RH / Sanguíneo</label>
                             <input 
                               name="bloodType"
                               defaultValue={editingReg?.bloodType}
                               placeholder="O+"
                               className="w-full h-16 px-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-center font-bold text-white focus:border-white outline-none"
                             />
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-16">
                    <div className="space-y-10">
                      <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                        <AlertTriangle size={14} className="text-zinc-700" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600">Health Protocol</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">Alergias e Restrições</label>
                          <textarea 
                            name="allergies"
                            defaultValue={editingReg?.allergies}
                            className="w-full p-8 bg-zinc-900 border border-zinc-800 rounded-[2rem] text-sm text-zinc-400 focus:border-zinc-500 outline-none h-40 resize-none transition-all placeholder:text-zinc-800"
                            placeholder="Descreva quaisquer alergias ou restrições alimentares..."
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 px-1">Notas Administrativas</label>
                          <textarea 
                            name="observations"
                            defaultValue={editingReg?.observations}
                            className="w-full p-8 bg-zinc-900 border border-zinc-800 rounded-[2rem] text-sm text-zinc-400 focus:border-zinc-500 outline-none h-40 resize-none transition-all placeholder:text-zinc-800"
                            placeholder="Notas internas ou observações importantes..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-10">
                       <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                        <ShieldCheck size={14} className="text-zinc-700" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600">Security Layers</h4>
                      </div>
                      
                      <div className="space-y-8">
                        <div className="flex items-center justify-between bg-zinc-900/50 p-8 rounded-[2rem] border border-zinc-900">
                           <div>
                              <p className="text-sm font-display font-medium text-white mb-1">Membro Efetivo</p>
                              <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest leading-loose">Registrado como parte do corpo ativo da organização.</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                             <input type="checkbox" name="isMember" defaultChecked={editingReg?.isMember} className="sr-only peer" />
                             <div className="w-14 h-8 bg-black peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-zinc-800 peer-checked:after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-zinc-700 border border-zinc-900"></div>
                           </label>
                        </div>

                        <div className="flex items-center justify-between bg-zinc-900/50 p-8 rounded-[2rem] border border-zinc-900 group">
                           <div>
                              <p className="text-sm font-display font-medium text-white mb-1">Audit Menor — {isMinor ? 'Ativado' : 'Desativado'}</p>
                              <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest leading-loose">Identificação de portador abaixo de 18 anos de idade.</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                             <input type="checkbox" name="isMinor" disabled className="sr-only peer" checked={isMinor} />
                             <div className={cn(
                               "w-14 h-8 rounded-full border transition-all",
                               isMinor ? "bg-rose-500 border-rose-500" : "bg-black border-zinc-900 opacity-50"
                             )}>
                               <div className={cn(
                                 "w-6 h-6 rounded-full bg-white absolute top-[4px] left-[4px] transition-transform",
                                 isMinor && "translate-x-6"
                               )} />
                             </div>
                           </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isMinor && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-10"
                    >
                      <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                        <Users size={14} className="text-zinc-700" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600">Guardian Data</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ring-1 ring-rose-500/10 p-10 rounded-[2.5rem] bg-rose-500/[0.02]">
                        <div className="space-y-4">
                          <input required={isMinor} name="emergencyName1" defaultValue={editingReg?.emergencyContacts?.name1} placeholder="Audit: Nome do Responsável 1" className="w-full h-16 px-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-white outline-none focus:border-rose-500/50 placeholder:text-zinc-800" />
                          <input required={isMinor} name="emergencyPhone1" defaultValue={editingReg?.emergencyContacts?.phone1} placeholder="Audit: WhatsApp Responsável 1" className="w-full h-16 px-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-mono text-white outline-none focus:border-rose-500/50 placeholder:text-zinc-800" />
                        </div>
                        <div className="space-y-4">
                          <input required={isMinor} name="emergencyName2" defaultValue={editingReg?.emergencyContacts?.name2} placeholder="Audit: Nome do Responsável 2" className="w-full h-16 px-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-white outline-none focus:border-rose-500/50 placeholder:text-zinc-800" />
                          <input required={isMinor} name="emergencyPhone2" defaultValue={editingReg?.emergencyContacts?.phone2} placeholder="Audit: WhatsApp Responsável 2" className="w-full h-16 px-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-mono text-white outline-none focus:border-rose-500/50 placeholder:text-zinc-800" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-24 p-12 bg-zinc-900/30 rounded-[3rem] border border-zinc-900/50 flex flex-col md:flex-row justify-end items-center gap-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="w-full md:w-auto px-10 py-5 text-[11px] font-black text-zinc-600 hover:text-white rounded-[1.5rem] transition-all uppercase tracking-[0.3em]"
                  >
                    Descartar Operação
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full md:w-auto px-16 py-6 bg-white text-black rounded-[1.5rem] text-[11px] font-black shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:bg-zinc-200 transition-all active:scale-95 uppercase tracking-[0.3em] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sync Flux...' : 'Validar & Gravar Registro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
