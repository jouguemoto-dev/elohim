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
  Cake
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
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'xls'>('xls');
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
    const name = reg.name || '';
    const phone = reg.phone || '';
    const cpf = reg.cpf || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          phone.includes(searchTerm) ||
                          cpf.includes(searchTerm);
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
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
        <div>
           <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-1.5 block">Audit & Liquidação</span>
           <h2 className="text-3xl font-display font-medium text-white tracking-tight">Tesouraria</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportToExcel}
            className="group bg-zinc-950/50 border border-zinc-900/50 text-zinc-600 px-4 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all shadow-sm"
            title="Exportar Excel"
          >
            <FileSpreadsheet size={16} />
            <span className="hidden lg:inline">Excel</span>
          </button>
          
          <button 
            onClick={exportToPDF}
            className="group bg-zinc-950/50 border border-zinc-900/50 text-zinc-600 px-4 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all shadow-sm"
            title="Relatório PDF"
          >
            <Printer size={16} />
            <span className="hidden lg:inline">PDF</span>
          </button>

          <button 
            onClick={() => { setEditingReg(null); setIsModalOpen(true); }}
            className="bg-white text-black px-6 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
          >
            <UserPlus size={16} />
            <span>Inserir Registro</span>
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 px-4">
        <div className="bg-black p-8 rounded-3xl border border-zinc-900/50 shadow-2xl transition-all group hover:border-zinc-700">
          <p className="text-zinc-700 text-[8px] font-black uppercase tracking-[0.4em] mb-4">Métrica — Participantes</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-display font-medium text-white tracking-tight">{filteredRegistrations.length}</h3>
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-900 text-zinc-800 group-hover:text-zinc-500 transition-colors">
               <Users2 size={24} />
            </div>
          </div>
        </div>
        <div className="bg-black p-8 rounded-3xl border border-zinc-900/50 shadow-2xl transition-all group hover:border-zinc-700">
          <p className="text-zinc-700 text-[8px] font-black uppercase tracking-[0.4em] mb-4">Métrica — Liquidado</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-display font-medium text-white tracking-tight">
               {filteredRegistrations.filter(r => r.status === 'paid').length}
            </h3>
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-900 text-zinc-800 group-hover:text-zinc-500 transition-colors">
               <CheckCircle2 size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-white text-black transition-all active:scale-[0.98]">
          <p className="text-black/40 text-[8px] font-black uppercase tracking-[0.4em] mb-4">Capital — Arrecadado</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-display font-medium tracking-tight">R$ {totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <div className="p-4 bg-black/5 rounded-2xl text-black/10">
               <DollarSign size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-4 flex flex-col gap-4">
        <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-900/50 flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="relative flex-1 flex items-center bg-transparent px-4 py-3 rounded-2xl border border-zinc-800 focus-within:border-white transition-all group">
            <Search className="text-zinc-700 mr-4 group-focus-within:text-white transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="PESQUISAR FLUXO..." 
              className="bg-transparent border-none text-[10px] uppercase font-black tracking-[0.2em] w-full outline-none text-white placeholder:text-zinc-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group">
               <select 
                 value={eventFilter}
                 onChange={(e) => setEventFilter(e.target.value)}
                 className="w-full sm:min-w-[200px] bg-zinc-900/50 border border-zinc-800 text-[9px] font-black uppercase tracking-widest px-5 py-4 rounded-2xl text-zinc-600 focus:text-white outline-none hover:bg-zinc-900 transition-all appearance-none cursor-pointer"
               >
                 <option value="all" className="bg-zinc-950">Todos os Eventos</option>
                 {events.map(event => (
                   <option key={event.id} value={event.id} className="bg-zinc-950">{event.title}</option>
                 ))}
               </select>
               <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none group-hover:text-zinc-500 transition-colors" size={16} />
            </div>

            <div className="bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800 flex">
               {[
                 { id: 'all', label: 'Tudo' },
                 { id: 'paid', label: 'Liquidado' },
                 { id: 'pending', label: 'Pendente' }
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setStatusFilter(tab.id as any)}
                   className={cn(
                     "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                     statusFilter === tab.id ? "bg-white text-black shadow-xl" : "text-zinc-700 hover:text-zinc-300"
                   )}
                 >
                   {tab.label}
                 </button>
               ))}
            </div>

            <div className="hidden sm:flex bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800">
               <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    viewMode === 'table' ? "bg-white text-black shadow-xl" : "text-zinc-600 hover:text-white"
                  )}
                  title="Visualização em Tabela"
               >
                  <ListIcon size={16} />
               </button>
               <button
                  onClick={() => setViewMode('xls')}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    viewMode === 'xls' ? "bg-white text-black shadow-xl" : "text-zinc-600 hover:text-white"
                  )}
                  title="Visualização XLS"
               >
                  <FileText size={16} />
               </button>
               <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-white text-black shadow-xl" : "text-zinc-600 hover:text-white"
                  )}
                  title="Visualização em Grade"
               >
                  <LayoutGrid size={16} />
               </button>
            </div>
          </div>
        </div>

        {/* Sub Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-black/40 p-4 rounded-2xl border border-zinc-900/40">
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Participantes:</span>
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
              {['all', 'member', 'non-member'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setMemberFilter(opt as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                    memberFilter === opt ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {opt === 'all' ? 'Todos' : opt === 'member' ? 'Membros' : 'Visitantes'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-zinc-900 pl-4">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Faixa Etária:</span>
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
              {['all', 'minor', 'adult'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setAgeFilter(opt as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                    ageFilter === opt ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {opt === 'all' ? 'Todos' : opt === 'minor' ? 'Menores' : 'Adultos'}
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
          ) : filteredRegistrations.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-800 font-black text-[10px] uppercase tracking-[0.3em] italic py-20 text-center">Nenhum registro localizado no fluxo</div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden lg:block">
                {viewMode === 'xls' ? (
                  <div className="space-y-8 p-4">
                    {groupedData.map((group) => (
                      <div key={group.event.id} className="bg-zinc-950/30 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
                        <div className="bg-zinc-900/50 p-6 flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 gap-4">
                          <div>
                             <h4 className="text-sm font-display font-medium text-white uppercase tracking-wider">{group.event.title}</h4>
                             <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-1">Sumário do Bloco</p>
                          </div>
                          <div className="flex items-center gap-8">
                             <div className="text-right">
                                <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">Total Coletado</p>
                                <p className="text-base font-display font-medium text-white">R$ {group.totalCollected.toLocaleString('pt-BR')}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[8px] font-black text-rose-500/40 uppercase tracking-widest mb-1">Pendente</p>
                                <p className="text-base font-display font-medium text-rose-500">R$ {group.totalPending.toLocaleString('pt-BR')}</p>
                             </div>
                             <div className="text-right bg-white/5 px-4 py-2 rounded-xl">
                                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Inscritos</p>
                                <p className="text-base font-display font-medium text-white">{group.count}</p>
                             </div>
                          </div>
                        </div>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-black/20 text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700">
                              <th className="px-6 py-4 text-left border-b border-r border-zinc-900/50">Nome</th>
                              <th className="px-6 py-4 text-left border-b border-r border-zinc-900/50">WhatsApp</th>
                              <th className="px-6 py-4 text-center border-b border-r border-zinc-900/50">Status</th>
                              <th className="px-6 py-4 text-right border-b border-r border-zinc-900/50">Valor</th>
                              <th className="px-6 py-4 text-center border-b border-r border-zinc-900/50">Meio</th>
                              <th className="px-6 py-4 text-right border-b">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                            {group.regs.map((reg) => (
                              <tr key={reg.id} className="hover:bg-white/5 border-b border-zinc-900/30 transition-all group">
                                <td className="px-6 py-3 border-r border-zinc-900/30 font-display text-xs text-white normal-case tracking-tight">
                                  <div className="flex items-center gap-2">
                                    {reg.name}
                                    {isBirthdayUpcoming(reg.birthDate) && (
                                      <Cake size={14} className="text-rose-400 animate-pulse" />
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3 border-r border-zinc-900/30 font-mono text-[9px] text-zinc-600">{reg.phone}</td>
                                <td className="px-6 py-3 border-r border-zinc-900/30 text-center">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                                    reg.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                  )}>
                                    {reg.status === 'paid' ? 'Liquidado' : 'Pendente'}
                                  </span>
                                </td>
                                <td className="px-6 py-3 border-r border-zinc-900/30 text-right text-white">R$ {reg.amountPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-3 border-r border-zinc-900/30 text-center text-[9px]">
                                  {reg.paymentMethod || '-'}
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setSelectedReg(reg); setIsDetailOpen(true); }} className="p-1 hover:text-white"><FileText size={12} /></button>
                                    <button onClick={() => { setEditingReg(reg); setBirthDate(reg.birthDate || ''); setIsModalOpen(true); }} className="p-1 hover:text-white"><Edit2 size={12} /></button>
                                    <button onClick={() => setConfirmModal({ isOpen: true, id: reg.id! })} className="p-1 hover:text-rose-500"><Trash2 size={12} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ) : viewMode === 'table' ? (
                  <div className="space-y-12">
                    {groupedData.map((group) => (
                      <div key={group.event.id} className="group/section">
                        {/* Event Summary Header */}
                        <div className="px-8 py-6 bg-zinc-950 border-y border-zinc-900/50 flex flex-wrap items-center justify-between gap-6 hover:bg-zinc-900/20 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-700">
                              <Calendar size={24} />
                            </div>
                            <div>
                               <h3 className="text-lg font-display font-medium text-white tracking-tight">{group.event.title}</h3>
                               <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Sumário Financeiro do Evento</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-12">
                            <div className="text-right">
                               <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1.5">Total Inscritos</p>
                               <p className="text-2xl font-display font-medium text-white leading-none">{group.count}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest mb-1.5">Total Liquidado</p>
                               <p className="text-2xl font-display font-medium text-emerald-500 leading-none">R$ {group.totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="text-right border-l border-zinc-900 pl-12">
                               <p className="text-[8px] font-black text-rose-900 uppercase tracking-widest mb-1.5">Pendente Estimado</p>
                               <p className="text-2xl font-display font-medium text-rose-500 leading-none">R$ {group.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        </div>

                        <table className="w-full border-separate border-spacing-0">
                          <thead className="sticky top-0 z-20 bg-zinc-950">
                            <tr className="text-zinc-700">
                              <th 
                                onClick={() => requestSort('name')}
                                className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-left border-b border-r border-zinc-900/50 cursor-pointer hover:bg-zinc-900/30 transition-colors"
                              >
                                <div className="flex items-center">
                                  Participante
                                  <SortIcon column="name" />
                                </div>
                              </th>
                              <th 
                                onClick={() => requestSort('eventName')}
                                className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-left border-b border-r border-zinc-900/50 cursor-pointer hover:bg-zinc-900/30 transition-colors"
                              >
                                <div className="flex items-center">
                                  Evento / Destino
                                  <SortIcon column="eventName" />
                                </div>
                              </th>
                              <th 
                                onClick={() => requestSort('status')}
                                className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-center border-b border-r border-zinc-900/50 cursor-pointer hover:bg-zinc-900/30 transition-colors"
                              >
                                <div className="flex items-center justify-center">
                                  Status Audit
                                  <SortIcon column="status" />
                                </div>
                              </th>
                              <th 
                                onClick={() => requestSort('amountPaid')}
                                className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-right border-b border-r border-zinc-900/50 cursor-pointer hover:bg-zinc-900/30 transition-colors"
                              >
                                <div className="flex items-center justify-end">
                                  Valor Registrado
                                  <SortIcon column="amountPaid" />
                                </div>
                              </th>
                              <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-right border-b border-zinc-900/50 w-24">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            {group.regs.map((reg) => (
                              <tr 
                                key={reg.id} 
                                className="group border-b border-zinc-900/30 hover:bg-zinc-900/20 transition-all cursor-pointer"
                                onClick={() => { setSelectedReg(reg); setIsDetailOpen(true); }}
                              >
                                <td className="px-6 py-5 border-r border-zinc-900/20">
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black shrink-0 shadow-inner",
                                      reg.isMinor ? "bg-white/10 text-white border border-white/20" : "bg-zinc-950 text-zinc-700 border border-zinc-900"
                                    )}>
                                      {reg.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <p className="font-display font-medium text-zinc-200 group-hover:text-white transition-colors truncate max-w-[200px] leading-none">{reg.name}</p>
                                          {isBirthdayUpcoming(reg.birthDate) && (
                                            <Cake size={14} className="text-rose-400 animate-pulse" title="Aniversariante da Semana!" />
                                          )}
                                        </div>
                                        {reg.isMinor && (
                                          <span className="px-2 py-0.5 bg-white/5 text-white text-[7px] font-black uppercase tracking-widest rounded-lg border border-white/10">Menor</span>
                                        )}
                                      </div>
                                      <p className="text-[8px] text-zinc-700 font-black mt-1 tracking-widest uppercase">{reg.phone}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5 border-r border-zinc-900/20">
                                  <div className="flex flex-col">
                                    <span className="font-display font-medium text-zinc-500 group-hover:text-zinc-200 transition-colors truncate max-w-[250px]">{getEventName(reg.eventId)}</span>
                                     {reg.registeredAt && (
                                       <span className="text-[8px] text-zinc-800 font-black uppercase mt-1 tracking-widest">
                                         {format(new Date(reg.registeredAt), 'dd MMM yyyy')}
                                       </span>
                                     )}
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-center border-r border-zinc-900/20 relative">
                                  <div className="flex flex-col items-center gap-2">
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
                                        "group relative px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 border flex items-center gap-2",
                                        reg.status === 'paid' 
                                          ? "bg-white text-black border-white shadow-xl" 
                                          : "bg-zinc-950 text-zinc-700 border-zinc-900 hover:text-zinc-300 hover:border-zinc-700 shadow-inner"
                                      )}
                                    >
                                      {reg.status === 'paid' ? (
                                        <>
                                          <CheckCircle2 size={12} />
                                          <span>Liquidado</span>
                                        </>
                                      ) : (
                                        <>
                                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse" />
                                          <span>Aguardando</span>
                                        </>
                                      )}
                                      {reg.status === 'pending' && <ChevronDown size={10} className={cn("transition-transform", paymentMenuId === reg.id && "rotate-180")} />}
                                    </button>

                                    {reg.status === 'paid' && reg.paymentMethod && (
                                      <div className="flex items-center gap-1 text-[7px] font-black text-zinc-600 uppercase tracking-tighter opacity-50">
                                        {reg.paymentMethod === 'pix' && <div className="flex items-center gap-1"><Search size={8} /> PIX</div>}
                                        {reg.paymentMethod === 'cash' && <div className="flex items-center gap-1"><Banknote size={8} /> Dinheiro</div>}
                                        {reg.paymentMethod === 'card' && <div className="flex items-center gap-1"><CreditCard size={8} /> Cartão</div>}
                                      </div>
                                    )}

                                    {/* Payment Method Menu */}
                                    <AnimatePresence>
                                      {paymentMenuId === reg.id && (
                                        <motion.div 
                                          initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                          className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[140px] flex flex-col gap-1"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest p-2 border-b border-white/5 mb-1">Meio de Recebimento</p>
                                          {[
                                            { id: 'pix', label: 'PIX', icon: Search, color: 'text-emerald-400 bg-emerald-400/10' },
                                            { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'text-amber-400 bg-amber-400/10' },
                                            { id: 'card', label: 'Cartão', icon: CreditCard, color: 'text-blue-400 bg-blue-400/10' }
                                          ].map((method) => (
                                            <button
                                              key={method.id}
                                              onClick={() => handleTogglePayment(reg, method.id as any)}
                                              className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors group/item"
                                            >
                                              <div className={cn("p-1.5 rounded-md", method.color)}>
                                                <method.icon size={12} />
                                              </div>
                                              <span className="text-[10px] font-bold text-zinc-400 group-hover/item:text-white">{method.label}</span>
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </td>
                                <td className="px-6 py-4 border-r border-zinc-900/30 text-right">
                                   <div className="inline-flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md border border-zinc-900/50 group-hover:border-zinc-700 transition-all" onClick={e => e.stopPropagation()}>
                                      <span className="text-[8px] text-zinc-700 font-bold">R$</span>
                                      <input 
                                         type="number"
                                         className="w-16 bg-transparent border-none p-0 text-xs font-bold text-white focus:ring-0 text-right outline-none"
                                         defaultValue={reg.amountPaid}
                                         onBlur={(e) => handleUpdateAmount(reg.id!, Number(e.target.value))}
                                      />
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setSelectedReg(reg); setIsDetailOpen(true); }}
                                      className="p-1.5 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
                                      title="Ver Detalhes"
                                    >
                                      <FileText size={14} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setEditingReg(reg); setBirthDate(reg.birthDate || ''); setIsModalOpen(true); }}
                                      className="p-1.5 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
                                      title="Editar"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, id: reg.id! }); }}
                                      className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                                      title="Remover"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-16 p-8">
                    {groupedData.map((group) => (
                      <div key={group.event.id} className="space-y-8">
                        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group/header">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] blur-3xl rounded-full -mr-32 -mt-32" />
                          <div className="relative z-10 flex items-center gap-6">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center text-zinc-700 border border-zinc-800 transition-transform group-hover/header:rotate-12">
                              <Calendar size={32} />
                            </div>
                            <div>
                              <h3 className="text-2xl font-display font-medium text-white tracking-tight uppercase">{group.event.title}</h3>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="px-3 py-1 bg-white/5 text-zinc-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{group.count} Inscritos</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-800" />
                                <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">R$ {group.totalCollected.toLocaleString('pt-BR')} Arrecadado</span>
                              </div>
                            </div>
                          </div>

                          <div className="relative z-10 flex items-center gap-12 bg-black/40 px-8 py-4 rounded-3xl border border-zinc-900">
                             <div className="text-right">
                                <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">Expectativa</p>
                                <p className="text-xl font-display font-medium text-white">R$ {(group.count * group.event.price).toLocaleString('pt-BR')}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[8px] font-black text-rose-500/40 uppercase tracking-widest mb-1">Pendente</p>
                                <p className="text-xl font-display font-medium text-rose-500">R$ {group.totalPending.toLocaleString('pt-BR')}</p>
                             </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {group.regs.map((reg) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={reg.id} 
                              className="bg-zinc-950/50 border border-zinc-900 rounded-[2.5rem] p-8 hover:border-zinc-500 transition-all cursor-pointer group flex flex-col gap-8 shadow-2xl relative overflow-hidden"
                              onClick={() => { setSelectedReg(reg); setIsDetailOpen(true); }}
                            >
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/10 transition-colors" />
                              
                              <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-5">
                                  <div className={cn(
                                    "w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-sm font-black shadow-2xl transition-transform group-hover:scale-110",
                                    reg.isMinor ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                                  )}>
                                    {reg.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                     <div className="flex items-center gap-3">
                                      <h4 className="font-display font-medium text-white text-lg truncate max-w-[150px] leading-tight flex items-center gap-2">
                                        {reg.name}
                                        {isBirthdayUpcoming(reg.birthDate) && (
                                          <Cake size={16} className="text-rose-400 animate-bounce shrink-0" />
                                        )}
                                      </h4>
                                      {reg.isMinor && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" title="Menor de idade" />}
                                     </div>
                                     <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                       <Calendar size={10} className="text-zinc-800" />
                                       {getEventName(reg.eventId)}
                                     </p>
                                  </div>
                                </div>
                                
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, id: reg.id! }); }}
                                  className="p-3 text-zinc-900 hover:text-red-500 rounded-2xl transition-all opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-red-500/10"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <div className="flex items-center justify-between py-6 border-y border-zinc-900/50 relative z-10">
                                 <div className="space-y-2 relative">
                                    <p className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em]">Status Audit</p>
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
                                        "inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95",
                                        reg.status === 'paid' ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "bg-zinc-900 text-zinc-700 border-zinc-800 hover:text-zinc-300"
                                      )}
                                    >
                                      {reg.status === 'paid' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                      {reg.status === 'paid' ? 'Liquidado' : 'Pendente'}
                                      {reg.status === 'pending' && <ChevronDown size={10} className={cn("transition-transform ml-1", paymentMenuId === reg.id && "rotate-180")} />}
                                    </button>

                                    <AnimatePresence>
                                      {paymentMenuId === reg.id && (
                                        <motion.div 
                                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                          className="absolute bottom-full mb-3 left-0 z-50 bg-zinc-900 border border-white/10 rounded-[1.5rem] shadow-2xl p-2 min-w-[160px] flex flex-col gap-1.5"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest p-3 border-b border-white/5 mb-1.5">Meio de Liquidação</p>
                                          {[
                                            { id: 'pix', label: 'PIX', icon: Search, color: 'text-emerald-400 bg-emerald-400/10' },
                                            { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'text-amber-400 bg-amber-400/10' },
                                            { id: 'card', label: 'Cartão', icon: CreditCard, color: 'text-blue-400 bg-blue-400/10' }
                                          ].map((method) => (
                                            <button
                                              key={method.id}
                                              onClick={() => handleTogglePayment(reg, method.id as any)}
                                              className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-2xl transition-all group/item"
                                            >
                                              <div className={cn("p-2 rounded-xl", method.color)}>
                                                <method.icon size={14} />
                                              </div>
                                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover/item:text-white">{method.label}</span>
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                 </div>
                                 <div className="text-right space-y-2">
                                    <p className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em]">Montante</p>
                                    <div className="inline-flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 group-hover:border-zinc-500 transition-all shadow-inner" onClick={e => e.stopPropagation()}>
                                      <span className="text-[10px] text-zinc-700 font-black">R$</span>
                                      <input 
                                         type="number"
                                         className="w-24 bg-transparent border-none p-0 text-xl font-display font-medium text-white focus:ring-0 text-right outline-none tracking-tighter"
                                         defaultValue={reg.amountPaid}
                                         onBlur={(e) => handleUpdateAmount(reg.id!, Number(e.target.value))}
                                      />
                                   </div>
                                 </div>
                              </div>

                              <div className="flex items-center justify-between relative z-10">
                                  <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 bg-black/40 px-4 py-2 rounded-2xl border border-zinc-900">
                                     <Search size={14} className="text-zinc-800" />
                                     {reg.phone}
                                  </div>
                                  <button 
                                    className="px-6 py-3 bg-zinc-900 hover:bg-white hover:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-800 hover:border-white active:scale-95 flex items-center gap-2"
                                  >
                                     <Plus size={14} />
                                     Detalhes
                                  </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile View */}
              <div className="lg:hidden space-y-4 px-6 py-6">
                {viewMode === 'xls' ? (
                  <div className="space-y-3">
                    {filteredRegistrations.map((reg) => (
                      <div key={reg.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-900 flex items-center justify-between gap-4" onClick={() => { setSelectedReg(reg); setIsDetailOpen(true); }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <p className="text-white text-xs font-bold truncate">{reg.name}</p>
                            {isBirthdayUpcoming(reg.birthDate) && (
                              <Cake size={10} className="text-rose-400 shrink-0" />
                            )}
                          </div>
                          <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-0.5 truncate">{getEventName(reg.eventId)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white text-xs font-display">R$ {reg.amountPaid.toLocaleString('pt-BR')}</p>
                          <span className={cn(
                             "text-[7px] font-black uppercase tracking-tighter",
                             reg.status === 'paid' ? "text-emerald-500" : "text-amber-500"
                          )}>
                             {reg.status === 'paid' ? 'PAGO' : 'PEND'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : groupedData.map((group) => (
                  <div key={group.event.id} className="space-y-6">
                    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 shadow-xl">
                       <h3 className="text-lg font-display font-medium text-white mb-4 uppercase">{group.event.title}</h3>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 p-3 rounded-2xl">
                             <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Inscritos</p>
                             <p className="text-xl font-display font-medium text-white">{group.count}</p>
                          </div>
                          <div className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10">
                             <p className="text-[8px] font-black text-emerald-900 uppercase tracking-widest mb-1">Liquidado</p>
                             <p className="text-xl font-display font-medium text-emerald-500">R$ {group.totalCollected.toLocaleString('pt-BR')}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                      {group.regs.map((reg) => (
                        <div key={reg.id} className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-6 space-y-6" onClick={() => { setSelectedReg(reg); setIsDetailOpen(true); }}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner",
                                reg.isMinor ? "bg-white/10 text-white border border-white/20" : "bg-zinc-950 text-zinc-700 border border-zinc-900"
                              )}>
                                {reg.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <p className="font-display font-medium text-white text-base leading-tight truncate">{reg.name}</p>
                                  {isBirthdayUpcoming(reg.birthDate) && (
                                    <Cake size={14} className="text-rose-400 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[9px] text-zinc-700 font-black mt-1 tracking-widest uppercase">{getEventName(reg.eventId)}</p>
                              </div>
                            </div>
                            <div className={cn(
                              "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all shrink-0",
                              reg.status === 'paid' ? "bg-white text-black border-white" : "bg-black text-zinc-700 border-zinc-900"
                            )}>
                              {reg.status === 'paid' ? 'Pago' : 'Pendente'}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6 py-4 border-y border-zinc-900/50">
                             <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Contato</p>
                                <p className="text-xs text-zinc-400 font-mono italic">{reg.phone}</p>
                             </div>
                             <div className="space-y-1 text-right">
                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Valor</p>
                                <p className="text-sm font-display font-medium text-white">R$ {reg.amountPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                             </div>
                          </div>

                          <div className="flex items-center justify-between">
                             <p className="text-[8px] text-zinc-800 font-black uppercase tracking-widest">
                                {reg.registeredAt ? format(new Date(reg.registeredAt), 'dd MMM yyyy') : '-'}
                             </p>
                             <div className="flex gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setEditingReg(reg); setBirthDate(reg.birthDate || ''); setIsModalOpen(true); }}
                                  className="p-3 bg-zinc-950/50 text-zinc-800 hover:text-white rounded-2xl transition-colors border border-zinc-900"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, id: reg.id! }); }}
                                  className="p-3 bg-zinc-950/50 text-zinc-800 hover:text-red-400 rounded-2xl transition-colors border border-zinc-900"
                                  title="Remover"
                                >
                                  <Trash2 size={14} />
                                </button>
                             </div>
                          </div>
                        </div>
                      ))}
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
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-zinc-950 border-l border-white/5 shadow-2xl flex flex-col pointer-events-auto"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                 <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black",
                      selectedReg.isMinor ? "bg-rose-500/10 text-rose-500" : "bg-white/5 text-zinc-500"
                    )}>
                      {selectedReg.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight leading-tight">{selectedReg.name}</h3>
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Detalhes do Registro</p>
                    </div>
                 </div>
                 <button onClick={() => setIsDetailOpen(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-500 transition-colors">
                   <X size={20} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12 pb-24">
                 {/* Basic Info */}
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Identificação Principal</h4>
                    <div className="grid grid-cols-2 gap-8">
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-700 tracking-widest mb-1.5">CPF</p>
                          <p className="text-sm font-bold text-zinc-300 font-mono">{selectedReg.cpf || '-'}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-700 tracking-widest mb-1.5">Nascimento</p>
                          <p className="text-sm font-bold text-zinc-300">
                             {selectedReg.birthDate ? format(new Date(selectedReg.birthDate), 'dd/MM/yyyy') : '-'}
                             {selectedReg.isMinor && <span className="ml-2 text-[10px] text-rose-500 font-black text-shadow-sm">(Menor de Idade)</span>}
                          </p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-700 tracking-widest mb-1.5">WhatsApp</p>
                          <p className="text-sm font-bold text-emerald-500 font-mono">{selectedReg.phone || '-'}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-700 tracking-widest mb-1.5">Tipo Sanguíneo</p>
                          <p className="text-sm font-bold text-zinc-300">{selectedReg.bloodType || 'Não informado'}</p>
                       </div>
                    </div>
                 </div>

                 {/* Extra Health Info */}
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Saúde & Alergias</h4>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-700 tracking-widest mb-1.5">Alergias</p>
                          <p className="text-sm text-zinc-400 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5 italic">
                            {selectedReg.allergies || 'Nenhuma alergia relatada'}
                          </p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black uppercase text-zinc-700 tracking-widest mb-1.5">Observações Adicionais</p>
                          <p className="text-sm text-zinc-400 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                            {selectedReg.observations || 'Sem observações extras'}
                          </p>
                       </div>
                    </div>
                 </div>

                 {/* Guardian Info if Minor */}
                 {selectedReg.isMinor && selectedReg.emergencyContacts && (
                   <div className="space-y-6">
                      <h4 className="text-[10px] font-bold text-rose-500/50 uppercase tracking-[0.3em] border-b border-rose-500/10 pb-2">Contatos de Emergência</h4>
                      <div className="space-y-4">
                         <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <p className="text-[8px] font-black uppercase text-rose-500/40 tracking-widest mb-1">Responsável 1</p>
                                  <p className="text-sm font-bold text-zinc-300">{selectedReg.emergencyContacts.name1}</p>
                                  <p className="text-xs font-mono text-rose-400/60 mt-0.5">{selectedReg.emergencyContacts.phone1}</p>
                               </div>
                               <div>
                                  <p className="text-[8px] font-black uppercase text-rose-500/40 tracking-widest mb-1">Responsável 2</p>
                                  <p className="text-sm font-bold text-zinc-300">{selectedReg.emergencyContacts.name2}</p>
                                  <p className="text-xs font-mono text-rose-400/60 mt-0.5">{selectedReg.emergencyContacts.phone2}</p>
                               </div>
                            </div>
                         </div>

                         {selectedReg.guardianAuthorization && (
                           <div className="flex flex-col gap-3">
                              <p className="text-[9px] font-black uppercase text-zinc-700 tracking-widest">Documentação Anexa</p>
                              <a 
                                href={selectedReg.guardianAuthorization.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-4 bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition-colors group"
                              >
                                 <div className="p-3 bg-zinc-900 rounded-xl text-zinc-600 transition-colors group-hover:text-emerald-500">
                                    <Download size={20} />
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-white">Autorização Firmada</p>
                                    <p className="text-[10px] text-zinc-600 font-mono mt-0.5">Versão digital anexada</p>
                                 </div>
                              </a>
                           </div>
                         )}
                      </div>
                   </div>
                 )}

                 {/* Address */}
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Endereço de Residência</h4>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                       <p className="text-sm text-zinc-400 leading-relaxed font-mono">
                          {selectedReg.address || 'Não informado'}
                       </p>
                    </div>
                  </div>
               </div>

               <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                     <button 
                       onClick={() => { setEditingReg(selectedReg); setBirthDate(selectedReg.birthDate || ''); setIsModalOpen(true); }}
                       className="px-6 py-4 bg-zinc-900 border border-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl flex items-center gap-3"
                     >
                       <Edit2 size={16} />
                       Editar
                     </button>
                     <button 
                       onClick={() => window.print()} 
                       className="px-6 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl flex items-center gap-3"
                     >
                       <Printer size={16} />
                       Imprimir
                     </button>
                  </div>
                  <div className="text-right">
                     <p className="text-[9px] font-black uppercase text-zinc-700 tracking-widest mb-1.5">Liquidado em conta</p>
                     <div className="flex items-center gap-3">
                        <p className="text-xl font-black text-white">R$ {selectedReg.amountPaid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        {selectedReg.status === 'paid' && selectedReg.paymentMethod && (
                           <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                             {selectedReg.paymentMethod}
                           </span>
                        )}
                     </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Registration Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] bg-zinc-900 border border-white/10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 md:p-10 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                <div>
                   <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-1.5 block">Audit System — Nova Entrada</span>
                   <h3 className="text-2xl md:text-3xl font-display font-medium text-white tracking-tight">
                     {editingReg ? 'Editar Registro' : 'Inserir Registro'}
                   </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-500 transition-colors shadow-inner">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddManual} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 md:gap-x-16 gap-y-10 md:gap-y-12">
                  <div className="space-y-8">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 border-b border-white/5 pb-3">Informações de Base</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Projeto Alvo</label>
                        <select 
                          required
                          name="eventId"
                          defaultValue={editingReg?.eventId}
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all"
                        >
                          <option value="" className="bg-zinc-900">Selecione uma destinação</option>
                          {events.map(event => (
                            <option key={event.id} value={event.id} className="bg-zinc-900">{event.title} (R$ {event.price.toLocaleString('pt-BR')})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Nome Completo</label>
                        <input 
                          required
                          name="name"
                          type="text"
                          defaultValue={editingReg?.name}
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">WhatsApp</label>
                          <input 
                            required
                            name="phone"
                            type="tel"
                            defaultValue={editingReg?.phone}
                            placeholder="(00) 00000-0000"
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Nascimento</label>
                          <input 
                            required
                            name="birthDate"
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white [color-scheme:dark] focus:ring-2 focus:ring-white/10 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">CPF</label>
                        <input 
                          required
                          name="cpf"
                          defaultValue={editingReg?.cpf}
                          placeholder="000.000.000-00"
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 border-b border-white/5 pb-3">Localização & Status</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Endereço</label>
                        <input 
                          required
                          name="address"
                          defaultValue={editingReg?.address}
                          placeholder="Rua, Número, Bairro..."
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Membro?</label>
                          <select name="isMember" defaultValue={editingReg?.isMember ? 'sim' : 'nao'} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all appearance-none cursor-pointer">
                            <option value="sim" className="bg-zinc-900 text-white">Sim</option>
                            <option value="nao" className="bg-zinc-900 text-white">Não</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Liquidação</label>
                          <select name="status" defaultValue={editingReg?.status} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all appearance-none cursor-pointer">
                            <option value="pending" className="bg-zinc-950 text-white">Pendente</option>
                            <option value="paid" className="bg-zinc-950 text-white">Liquidado</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Valor Pago (R$)</label>
                           <input 
                              name="amountPaid"
                              type="number"
                              step="0.01"
                              defaultValue={editingReg?.amountPaid}
                              placeholder="0,00"
                              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                           />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Meio de Recebimento</label>
                          <select name="paymentMethod" defaultValue={editingReg?.paymentMethod || 'pix'} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all appearance-none cursor-pointer">
                            <option value="pix" className="bg-zinc-950 text-white">PIX</option>
                            <option value="cash" className="bg-zinc-950 text-white">Dinheiro</option>
                            <option value="card" className="bg-zinc-950 text-white">Cartão</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isMinor && (
                    <motion.div 
                      key="minor-data"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-8 pt-8 border-t border-white/5"
                    >
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-400">Responsáveis Legais</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 mt-6">
                        <div className="space-y-4">
                          <input required={isMinor} name="emergencyName1" defaultValue={editingReg?.emergencyContacts?.name1} placeholder="Nome do Responsável 1" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-white/20" />
                          <input required={isMinor} name="emergencyPhone1" defaultValue={editingReg?.emergencyContacts?.phone1} placeholder="WhatsApp do Responsável 1" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-white/20" />
                        </div>
                        <div className="space-y-4">
                          <input required={isMinor} name="emergencyName2" defaultValue={editingReg?.emergencyContacts?.name2} placeholder="Nome do Responsável 2" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-white/20" />
                          <input required={isMinor} name="emergencyPhone2" defaultValue={editingReg?.emergencyContacts?.phone2} placeholder="WhatsApp do Responsável 2" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-white/20" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-12 md:mt-16 flex flex-col sm:flex-row justify-end gap-3 sm:gap-5 p-6 sticky bottom-0 bg-zinc-900/80 backdrop-blur-xl border-t border-white/5 -mx-6 md:-mx-10 px-6 md:px-10">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="order-2 sm:order-1 px-8 py-4 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all uppercase tracking-widest"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="order-1 sm:order-2 px-12 py-4 bg-white text-black rounded-2xl text-xs font-black shadow-2xl hover:bg-zinc-200 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-50"
                  >
                    {isSubmitting ? 'Gravando...' : 'Finalizar Registro'}
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
