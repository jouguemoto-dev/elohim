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
  ChevronDown
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
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
  }>({ isOpen: false, id: '' });

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
    return matchesSearch && matchesEvent && matchesStatus;
  });

  const totalCollected = filteredRegistrations
    .filter(r => r.status === 'paid')
    .reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

  const handleTogglePayment = async (reg: Registration) => {
    const newStatus = reg.status === 'paid' ? 'pending' : 'paid';
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
       amountPaid: newAmount
    });
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

      await churchService.addRegistration({
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
        amountPaid: status === 'paid' ? (Number(formData.get('amountPaid')) || event?.price || 0) : 0,
      });
      
      setIsModalOpen(false);
      setBirthDate('');
      loadData();
    } catch (error) {
      console.error(error);
      alert('Erro ao adicionar inscrição manual.');
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

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Tesouraria</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em]">Gestão financeira</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="group bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all shadow-sm"
            title="Exportar Excel"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden lg:inline">Excel</span>
          </button>
          
          <button 
            onClick={exportToPDF}
            className="group bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all shadow-sm"
            title="Relatório PDF"
          >
            <Printer size={14} />
            <span className="hidden lg:inline">PDF</span>
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-black px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg"
          >
            <UserPlus size={14} />
            <span>Inserir Inscrição</span>
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-900 shadow-xl transition-all">
          <p className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.2em] mb-4">Participantes</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white tracking-tight">{filteredRegistrations.length}</h3>
            <div className="p-2 bg-zinc-900 rounded border border-zinc-800 text-zinc-700">
               <Users2 size={18} />
            </div>
          </div>
        </div>
        <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-900 shadow-xl transition-all">
          <p className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.2em] mb-4">Pagos</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-emerald-500 tracking-tight">
               {filteredRegistrations.filter(r => r.status === 'paid').length}
            </h3>
            <div className="p-2 bg-zinc-900 rounded border border-zinc-800 text-zinc-700">
               <CheckCircle2 size={18} />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-xl border border-white text-black transition-all">
          <p className="text-black/40 text-[9px] font-bold uppercase tracking-[0.2em] mb-4">Arrecadado</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold tracking-tight">R$ {totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <div className="p-2 bg-black/5 rounded text-black/10">
               <DollarSign size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="relative flex-1 flex items-center bg-zinc-900 px-4 py-3 rounded-lg border border-zinc-800 group">
          <Search className="text-zinc-700 mr-3 group-focus-within:text-white transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="bg-transparent border-none text-[10px] uppercase font-bold tracking-widest w-full outline-none text-white placeholder:text-zinc-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
             <select 
               value={eventFilter}
               onChange={(e) => setEventFilter(e.target.value)}
               className="w-full sm:min-w-[200px] bg-zinc-900 border border-zinc-800 text-[9px] font-bold uppercase tracking-widest px-4 py-3 rounded-lg text-zinc-500 focus:text-white outline-none hover:bg-zinc-800 transition-all appearance-none cursor-pointer"
             >
               <option value="all" className="bg-zinc-950">Todos os Eventos</option>
               {events.map(event => (
                 <option key={event.id} value={event.id} className="bg-zinc-950">{event.title}</option>
               ))}
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none group-hover:text-zinc-500 transition-colors" size={14} />
          </div>

          <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex">
             {[
               { id: 'all', label: 'Tudo' },
               { id: 'paid', label: 'Liquidado' },
               { id: 'pending', label: 'Pendente' }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setStatusFilter(tab.id as any)}
                 className={cn(
                   "px-4 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all",
                   statusFilter === tab.id ? "bg-white text-black shadow-lg" : "text-zinc-600 hover:text-zinc-300"
                 )}
               >
                 {tab.label}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden bg-zinc-950 border border-zinc-900 rounded-xl shadow-xl flex flex-col">
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-zinc-600 font-bold text-[10px] uppercase tracking-widest">Sincronizando banco de dados...</div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-600 font-bold text-[10px] uppercase tracking-widest italic py-20 text-center">Nenhum registro encontrado</div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead className="bg-[#050505]/40 backdrop-blur-lg sticky top-0 z-10">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Candidato</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Destinação</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] text-center">Status Venda</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] text-right">Montante</th>
                      <th className="px-8 py-5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] text-right">Operações</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="group">
                        <td className="px-8 py-4 bg-white/[0.02] rounded-l-2xl border-y border-l border-white/5 transition-colors group-hover:bg-white/[0.04]">
                          <div>
                            <p className="font-bold text-white leading-tight group-hover:translate-x-1 transition-transform">{reg.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1 tracking-tighter">{reg.phone}</p>
                          </div>
                        </td>
                        <td className="px-8 py-4 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.04] transition-colors">
                          <div className="flex items-center gap-3">
                            <Calendar size={14} className="text-zinc-600" />
                            <span className="font-medium text-zinc-300 transition-colors group-hover:text-white">{getEventName(reg.eventId)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.04] text-center transition-colors">
                          <button 
                            onClick={() => handleTogglePayment(reg)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95",
                              reg.status === 'paid' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border border-transparent"
                            )}
                          >
                            {reg.status === 'paid' ? 'Pago' : 'Pendente'}
                          </button>
                        </td>
                        <td className="px-8 py-4 bg-white/[0.02] border-y border-white/5 group-hover:bg-white/[0.04] text-right transition-colors font-mono">
                           <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] text-zinc-600 font-black">R$</span>
                              <input 
                                 type="number"
                                 className="w-20 bg-transparent border-none p-0 text-sm font-black text-white focus:ring-0 text-right outline-none"
                                 defaultValue={reg.amountPaid}
                                 onBlur={(e) => handleUpdateAmount(reg.id!, Number(e.target.value))}
                              />
                           </div>
                        </td>
                        <td className="px-8 py-4 bg-white/[0.02] rounded-r-2xl border-y border-r border-white/5 group-hover:bg-white/[0.04] text-right transition-colors">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setConfirmModal({ isOpen: true, id: reg.id! })}
                              className="p-3 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="lg:hidden space-y-4">
                {filteredRegistrations.map((reg) => (
                  <div key={reg.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-white leading-tight truncate">{reg.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1 tracking-widest uppercase">{reg.phone}</p>
                      </div>
                      <button 
                        onClick={() => handleTogglePayment(reg)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                          reg.status === 'paid' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border border-transparent"
                        )}
                      >
                        {reg.status === 'paid' ? 'Pago' : 'Pendente'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Evento</p>
                          <p className="text-[10px] text-white font-bold truncate">{getEventName(reg.eventId)}</p>
                       </div>
                       <div className="space-y-1 text-right">
                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Valor</p>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] text-zinc-700 font-black">R$</span>
                            <input 
                               type="number"
                               className="w-16 bg-transparent border-none p-0 text-xs font-black text-white focus:ring-0 text-right outline-none"
                               defaultValue={reg.amountPaid}
                               onBlur={(e) => handleUpdateAmount(reg.id!, Number(e.target.value))}
                            />
                          </div>
                       </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-white/5">
                      <button 
                        onClick={() => setConfirmModal({ isOpen: true, id: reg.id! })}
                        className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
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
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">Manual Entry</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-500 transition-colors">
                  <X size={20} />
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
                          placeholder="Rua, Número, Bairro..."
                          className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Membro?</label>
                          <select name="isMember" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all">
                            <option value="sim" className="bg-zinc-900 text-white">Sim</option>
                            <option value="nao" className="bg-zinc-900 text-white">Não</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Liquidação</label>
                          <select name="status" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all">
                            <option value="pending" className="bg-zinc-900 text-white">Pendente</option>
                            <option value="paid" className="bg-zinc-900 text-white">Liquidado</option>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                        <div className="space-y-4">
                          <input required={isMinor} name="emergencyName1" placeholder="Nome do Responsável 1" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white" />
                          <input required={isMinor} name="emergencyPhone1" placeholder="WhatsApp do Responsável 1" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white" />
                        </div>
                        <div className="space-y-4">
                          <input required={isMinor} name="emergencyName2" placeholder="Nome do Responsável 2" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white" />
                          <input required={isMinor} name="emergencyPhone2" placeholder="WhatsApp do Responsável 2" className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white" />
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
