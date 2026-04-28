import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Plus, 
  Share2, 
  ExternalLink,
  Users2,
  Trash2,
  Edit,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  Search,
  Clock,
  Printer,
  QrCode,
  ChevronDown,
  Banknote
} from 'lucide-react';
import { churchService } from '../services/churchService';
import { ChurchEvent, Registration, EventType, EventTemplate, ChurchSettings, EventPhase } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FileUploader from './FileUploader';
import { Attachment } from '../types';
import { Copy, Save } from 'lucide-react';

// Reporting libs
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

import ConfirmModal from './ConfirmModal';
import QRCodeModal from './QRCodeModal';

export default function EventsModule() {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'registrations' | 'management'>('details');
  const [paymentMenuId, setPaymentMenuId] = useState<string | null>(null);
  const [eventAttachments, setEventAttachments] = useState<Attachment[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [eventTemplates, setEventTemplates] = useState<EventTemplate[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateRevision, setTemplateRevision] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [eventDateStart, setEventDateStart] = useState('');
  const [eventDateEnd, setEventDateEnd] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [eventPhases, setEventPhases] = useState<EventPhase[]>([]);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
    type: 'event' | 'registration' | 'template';
  }>({ isOpen: false, id: '', type: 'event' });

  useEffect(() => {
    loadEvents();
    loadTemplates();
    loadSettings();
  }, []);

  async function loadSettings() {
    const data = await churchService.getSettings();
    setSettings(data);
  }

  async function loadTemplates() {
    const templates = await churchService.getEventTemplates();
    setEventTemplates(templates || []);
  }

  useEffect(() => {
    if (isEventModalOpen) {
      setErrors({});
    }
  }, [isEventModalOpen]);

  useEffect(() => {
    if (editingEvent) {
      setEventAttachments(editingEvent.attachments || []);
      setEventPhases(editingEvent.phases || []);
    } else {
      setEventAttachments([]);
      setEventPhases([]);
    }
  }, [editingEvent, isEventModalOpen]);

  useEffect(() => {
    if (selectedEvent) {
      loadRegistrations(selectedEvent.id!);
    }
  }, [selectedEvent]);

  async function loadEvents() {
    const [eventsData, typesData] = await Promise.all([
      churchService.getEvents(),
      churchService.getEventTypes()
    ]);
    setEvents(eventsData || []);
    setEventTypes(typesData || []);
    setLoading(false);
  }

  async function loadRegistrations(eventId: string) {
    const data = await churchService.getRegistrations(eventId);
    setRegistrations(data || []);
  }

  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    const formData = new FormData(e.currentTarget);
    
    // Validation
    const newErrors: Record<string, string> = {};
    const title = formData.get('title') as string;
    const type = formData.get('type') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const location = formData.get('location') as string;
    const priceStr = formData.get('price') as string;
    const price = Number(priceStr);

    if (!title?.trim()) newErrors.title = 'O título é obrigatório';
    if (!type?.trim()) newErrors.type = 'A classificação é obrigatória';
    if (!startDate) newErrors.startDate = 'A data de início é obrigatória';
    if (!endDate) newErrors.endDate = 'A data de término é obrigatória';
    if (!location?.trim()) newErrors.location = 'O local é obrigatório';
    
    if (priceStr === '' || isNaN(price)) {
      newErrors.price = 'O preço é obrigatório';
    } else if (price < 0) {
      newErrors.price = 'O preço não pode ser negativo';
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'A data de término deve ser após a data de início';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to top of form to see errors if they exist
      const form = e.currentTarget;
      form.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const eventData: any = {
      title,
      type,
      startDate,
      endDate,
      location,
      description: formData.get('description') as string,
      price,
      maxParticipants: Number(formData.get('maxParticipants')) || undefined,
      pixKey: formData.get('pixKey') as string,
      paymentLink: formData.get('paymentLink') as string,
      imageUrl: formData.get('imageUrl') as string,
      attachments: eventAttachments,
      phases: eventPhases,
      publicId: editingEvent?.publicId || Math.random().toString(36).substring(2, 10),
    };

    // If an image was uploaded, use the first image as the banner if URL is empty
    if (!eventData.imageUrl && eventAttachments.length > 0) {
      const firstImage = eventAttachments.find(a => a.type.includes('image'));
      if (firstImage) {
        eventData.imageUrl = firstImage.url;
      }
    }

    if (editingEvent?.id) {
      await churchService.updateEvent(editingEvent.id, eventData);
    } else {
      await churchService.addEvent(eventData);
    }
    
    setIsEventModalOpen(false);
    setEditingEvent(null);
    loadEvents();
  };

  const handleSaveAsTemplate = async (event: ChurchEvent) => {
    const templateName = prompt('Digite um nome para este template:', `Template: ${event.title}`);
    if (!templateName) return;

    await churchService.addEventTemplate({
      name: templateName,
      title: event.title,
      type: event.type,
      location: event.location,
      description: event.description,
      price: event.price,
      maxParticipants: event.maxParticipants,
      phases: event.phases,
      pixKey: event.pixKey,
      paymentLink: event.paymentLink,
      createdAt: new Date().toISOString()
    });
    
    loadTemplates();
    alert('Template salvo com sucesso!');
  };

  const applyTemplate = (template: EventTemplate) => {
    const form = document.querySelector('form');
    if (!form) return;

    // We can't easily pre-fill form fields with defaultValue using just references if they are already rendered
    // But we can update the state if we were using a controlled form. 
    // Since this component uses a mix, I'll update the form fields directly if they are in the DOM
    // or provide the values to the form somehow if it's opening.
    // Actually, it's better to set some state that the form uses.
    
    setEditingEvent({
      ...editingEvent,
      title: template.title,
      type: template.type,
      location: template.location,
      description: template.description,
      price: template.price,
      maxParticipants: template.maxParticipants,
      phases: template.phases || [],
      pixKey: template.pixKey || '',
      paymentLink: template.paymentLink || '',
      startDate: editingEvent?.startDate || '',
      endDate: editingEvent?.endDate || '',
      publicId: editingEvent?.publicId || Math.random().toString(36).substring(2, 10),
    } as ChurchEvent);
    
    setEventPhases(template.phases || []);
    
    setTemplateRevision(prev => prev + 1);
    setIsTemplateModalOpen(false);
  };

  const handleTogglePayment = async (reg: Registration, method?: 'pix' | 'cash' | 'card') => {
    const newStatus = reg.status === 'paid' && !method ? 'pending' : 'paid';
    const amount = newStatus === 'paid' ? (reg.amountPaid || selectedEvent?.price || 0) : 0;
    
    await churchService.updateRegistration(reg.id!, { 
      status: newStatus, 
      amountPaid: amount,
      paymentMethod: method || (newStatus === 'paid' ? (reg.paymentMethod || 'pix') : undefined)
    });
    
    if (selectedEvent) loadRegistrations(selectedEvent.id!);
    setPaymentMenuId(null);
  };

  const handleUpdateAmount = async (regId: string, amount: number) => {
    await churchService.updateRegistration(regId, { amountPaid: amount });
    loadRegistrations(selectedEvent!.id!);
  };

  const exportEventListExcel = () => {
    const data = events.map(e => ({
      'Título': e.title,
      'Tipo': e.type,
      'Início': format(new Date(e.startDate), 'dd/MM/yyyy HH:mm'),
      'Término': format(new Date(e.endDate), 'dd/MM/yyyy HH:mm'),
      'Local': e.location,
      'Preço': e.price,
      'Participantes Máx.': e.maxParticipants || 'Ilimitado'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista de Eventos");
    XLSX.writeFile(wb, `eventos_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  const exportEventListPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(18);
    doc.text('Cronograma de Eventos', 14, 22);
    doc.setFontSize(10);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

    const tableData = events.map(e => [
      e.title,
      e.type,
      format(new Date(e.startDate), 'dd/MM/yy'),
      e.location,
      `R$ ${e.price.toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 40,
      head: [['Título', 'Tipo', 'Data', 'Local', 'Valor']],
      body: tableData,
    });

    doc.save(`eventos_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
  };

  const exportPDF = () => {
    if (!selectedEvent) return;
    const doc = new jsPDF() as any;
    
    doc.setFontSize(18);
    doc.text(`Lista de Participantes: ${selectedEvent.title}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Data: ${format(new Date(selectedEvent.startDate), 'dd/MM/yyyy HH:mm')}`, 14, 30);
    doc.text(`Total: ${registrations.length} inscritos`, 14, 35);

    const tableData = registrations.sort((a, b) => a.name.localeCompare(b.name)).map(r => [
      r.name,
      r.cpf || '-',
      r.phone,
      r.bloodType || '-',
      r.allergies || '-',
      r.status === 'paid' ? 'Pago' : 'Pendente',
      `R$ ${r.amountPaid.toFixed(2)}`,
      r.registeredAt ? format(new Date(r.registeredAt), 'dd/MM/yy HH:mm') : '-'
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Nome', 'CPF', 'Contato', 'T. Sanguíneo', 'Alergias', 'Pagamento', 'Valor', 'Inscrição']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 8 }
    });

    doc.save(`participantes_${selectedEvent.publicId}.pdf`);
  };

  const exportExcel = () => {
    if (!selectedEvent) return;
    const ws = XLSX.utils.json_to_sheet(registrations.map(r => ({
      'Nome': r.name,
      'Telefone': r.phone,
      'É Membro': r.isMember ? 'Sim' : 'Não',
      'Tipo Sanguíneo': r.bloodType || '',
      'Alergias': r.allergies || '',
      'Status Pagamento': r.status === 'paid' ? 'Pago' : 'Pendente',
      'Valor Pago': r.amountPaid,
      'Data Inscrição': format(new Date(r.registeredAt), 'dd/MM/yyyy HH:mm')
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participantes");
    XLSX.writeFile(wb, `participantes_${selectedEvent.publicId}.xlsx`);
  };

  const copyPublicLink = (pid: string) => {
    const baseUrl = settings?.publicUrl ? settings.publicUrl.replace(/\/$/, '') : window.location.origin;
    const url = `${baseUrl}/inscrever/${pid}`;
    navigator.clipboard.writeText(url);
    alert('Link de inscrição copiado!');
  };

  const handleDeleteEvent = async (id: string) => {
    await churchService.deleteEvent(id);
    setSelectedEvent(null);
    loadEvents();
  };

  const handleDeleteRegistration = async (id: string) => {
    await churchService.deleteRegistration(id);
    if (selectedEvent) loadRegistrations(selectedEvent.id!);
  };

  const totalCollected = registrations.reduce((acc, curr) => acc + curr.amountPaid, 0);

  const filteredEvents = events.filter(event => {
    const matchesType = eventTypeFilter === 'all' || event.type === eventTypeFilter;
    const eventDate = new Date(event.startDate).getTime();
    const start = eventDateStart ? new Date(eventDateStart).getTime() : -Infinity;
    // For end date, we want to include events that start on that day, so we compare start of day
    const end = eventDateEnd ? new Date(eventDateEnd + 'T23:59:59').getTime() : Infinity;
    
    return matchesType && eventDate >= start && eventDate <= end;
  });

  const filteredRegistrations = registrations.filter(reg => 
    reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (reg.cpf && reg.cpf.includes(searchQuery)) ||
    reg.phone.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
        <div>
           <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-1.5 block">Logística & Estratégia</span>
           <h2 className="text-3xl font-display font-medium text-white tracking-tight">Agenda</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportEventListExcel}
            className="group bg-zinc-950/50 border border-zinc-900/50 text-zinc-600 px-4 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all shadow-sm"
            title="Exportar Excel"
          >
            <FileSpreadsheet size={16} />
            <span className="hidden lg:inline">Excel</span>
          </button>
          
          <button 
            onClick={exportEventListPDF}
            className="group bg-zinc-950/50 border border-zinc-900/50 text-zinc-600 px-4 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all shadow-sm"
            title="Relatório PDF"
          >
            <Printer size={16} />
            <span className="hidden lg:inline">PDF</span>
          </button>

          <button 
            onClick={() => { 
              setEditingEvent(null); 
              setTemplateRevision(0);
              setIsEventModalOpen(true); 
            }}
            className="bg-white text-black px-6 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
          >
            <Plus size={16} />
            <span>Novo Projeto</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
        {/* Events List Sidebar */}
        <div className={cn(
          "lg:col-span-1 flex flex-col min-h-0 bg-black border border-zinc-900 rounded-[2rem] overflow-hidden transition-all mx-4 lg:mx-0 shadow-2xl",
          mobileView === 'detail' && "hidden lg:flex"
        )}>
           <div className="px-6 py-5 border-b border-zinc-900/50 bg-zinc-950/50">
             <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4">Agenda Cronológica</h3>
             
             <div className="space-y-3">
               <div>
                 <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block mb-1">Tipo de Evento</label>
                 <select 
                   value={eventTypeFilter}
                   onChange={(e) => setEventTypeFilter(e.target.value)}
                   className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] text-zinc-400 outline-none focus:ring-1 focus:ring-white/10"
                 >
                   <option value="all">Todos os Tipos</option>
                   {eventTypes.map(t => (
                     <option key={t.id} value={t.name}>{t.name}</option>
                   ))}
                 </select>
               </div>
               
               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block mb-1">Início</label>
                   <input 
                     type="date"
                     value={eventDateStart}
                     onChange={(e) => setEventDateStart(e.target.value)}
                     className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2 text-[10px] text-zinc-400 outline-none focus:ring-1 focus:ring-white/10 [color-scheme:dark]"
                   />
                 </div>
                 <div>
                   <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block mb-1">Término</label>
                   <input 
                     type="date"
                     value={eventDateEnd}
                     onChange={(e) => setEventDateEnd(e.target.value)}
                     className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2 text-[10px] text-zinc-400 outline-none focus:ring-1 focus:ring-white/10 [color-scheme:dark]"
                   />
                 </div>
               </div>
               
               {(eventTypeFilter !== 'all' || eventDateStart || eventDateEnd) && (
                 <button 
                   onClick={() => {
                     setEventTypeFilter('all');
                     setEventDateStart('');
                     setEventDateEnd('');
                   }}
                   className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-zinc-700 hover:text-white transition-colors"
                 >
                   Limpar Filtros
                 </button>
               )}
             </div>
           </div>
           <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/30 px-2 pt-2">
             {filteredEvents.length === 0 ? (
               <div className="p-8 text-center text-zinc-800 font-black text-[9px] uppercase tracking-[0.3em] italic py-12 px-10">Agenda limpa no momento</div>
             ) : filteredEvents.map(event => (
               <button
                 key={event.id}
                 onClick={() => { setSelectedEvent(event); setMobileView('detail'); }}
                 className={cn(
                   "w-full text-left p-4 transition-all flex items-start justify-between rounded-2xl mx-0 my-1 group",
                   selectedEvent?.id === event.id ? "bg-zinc-900/50 border border-white/5" : "hover:bg-zinc-900/20 border border-transparent"
                 )}
               >
                 <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-3">
                          <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-700 group-hover:text-zinc-300 transition-colors">{event.type}</span>
                          <span className="text-[8px] font-mono text-zinc-800 tracking-tighter group-hover:text-zinc-500">{format(new Date(event.startDate), 'dd MMM')}</span>
                       </div>
                    </div>
                    <h4 className="text-[11px] font-display font-medium text-zinc-400 group-hover:text-white transition-all truncate">{event.title}</h4>
                 </div>
                 <ChevronRight size={12} className={cn(
                   "transition-all self-center",
                   selectedEvent?.id === event.id ? "text-white translate-x-1" : "text-zinc-800 opacity-0 group-hover:opacity-100"
                 )} />
               </button>
             ))}
           </div>
        </div>

        {/* Event Detail / Registrations */}
        <div className={cn(
          "lg:col-span-3 flex flex-col min-h-0 bg-black border border-zinc-900 rounded-[2.5rem] overflow-hidden transition-all mx-4 lg:mx-0 shadow-2xl",
          mobileView === 'list' && "hidden lg:flex"
        )}>
          {!selectedEvent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 p-12 text-center">
              <div className="w-24 h-24 rounded-[2rem] bg-zinc-950 flex items-center justify-center mb-6 shadow-inner border border-zinc-900">
                <Calendar size={40} className="opacity-20 text-white" />
              </div>
              <p className="font-black text-zinc-800 text-[10px] uppercase tracking-[0.4em]">Selecione um projeto para detalhamento</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <header className="px-8 py-8 border-b border-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-950/50 gap-6">
                <div className="flex items-center gap-6">
                   <button 
                     onClick={() => setMobileView('list')}
                     className="p-3 bg-zinc-900 text-zinc-600 rounded-2xl lg:hidden"
                   >
                     <ChevronRight className="rotate-180" size={18} />
                   </button>
                   <div className="bg-white text-black h-16 w-16 rounded-2xl flex flex-col items-center justify-center shadow-xl shrink-0">
                      <span className="text-[9px] font-black leading-none mb-1.5 uppercase tracking-widest">{format(new Date(selectedEvent.startDate), 'MMM', { locale: ptBR })}</span>
                      <span className="text-2xl font-display font-medium leading-none tracking-tighter">{format(new Date(selectedEvent.startDate), 'dd')}</span>
                   </div>
                   <div className="min-w-0">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-1 block">Projeto Selecionado</span>
                      <h3 className="text-2xl font-display font-medium text-white tracking-tight leading-none truncate">{selectedEvent.title}</h3>
                      <p className="text-[9px] font-mono text-zinc-700 tracking-widest flex items-center gap-2 mt-2 truncate">LOG_ID: {selectedEvent.publicId}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 sm:pb-0">
                   <button 
                     onClick={() => setIsQrModalOpen(true)}
                     className="p-3 bg-white/5 text-zinc-300 rounded-2xl border border-white/5 hover:bg-white/10 transition-all shadow-xl flex items-center justify-center gap-2 shrink-0"
                     title="Gerar QR Code"
                   >
                     <QrCode size={18} />
                   </button>
                   <button 
                     onClick={() => handleSaveAsTemplate(selectedEvent)}
                     className="px-4 py-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-xl flex items-center gap-2 shrink-0 text-[10px] font-black uppercase tracking-widest"
                     title="Salvar Template"
                   >
                     <Save size={16} />
                     <span className="hidden xl:inline">Salvar como Template</span>
                   </button>
                   <button 
                     onClick={() => copyPublicLink(selectedEvent.publicId)}
                     className="px-4 py-2.5 bg-white/5 text-zinc-300 rounded-xl border border-white/5 text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all shadow-xl shrink-0"
                   >
                     Link
                   </button>
                   <button 
                     onClick={() => { 
                       setEditingEvent(selectedEvent); 
                       setTemplateRevision(0);
                       setIsEventModalOpen(true); 
                     }}
                     className="p-3 text-zinc-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all shrink-0"
                   >
                     <Edit size={18} />
                   </button>
                   <button 
                     className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all shrink-0"
                     onClick={() => setConfirmModal({ isOpen: true, id: selectedEvent.id!, type: 'event' })}
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </header>

              <div className="flex h-12 border-b border-white/5 shrink-0 bg-white/[0.01] px-4 gap-1 md:gap-2">
                <button 
                   onClick={() => setActiveTab('details')}
                   className={cn(
                     "flex-1 md:flex-none px-4 md:px-8 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative",
                     activeTab === 'details' ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                   )}
                >
                  Geral
                  {activeTab === 'details' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                </button>
                <button 
                   onClick={() => setActiveTab('management')}
                   className={cn(
                     "flex-1 md:flex-none px-4 md:px-8 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative",
                     activeTab === 'management' ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                   )}
                >
                  Gestão
                  {activeTab === 'management' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                </button>
                <button 
                   onClick={() => setActiveTab('registrations')}
                   className={cn(
                     "flex-1 md:flex-none px-4 md:px-8 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative",
                     activeTab === 'registrations' ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                   )}
                >
                  Inscritos ({registrations.length})
                  {activeTab === 'registrations' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                {activeTab === 'management' ? (
                  <div className="space-y-10 animate-in fade-in duration-500">
                    {/* Management Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-8 bg-zinc-950 border border-zinc-900 rounded-[2rem] shadow-2xl">
                         <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-3">Capacidade Ocupada</p>
                         <div className="flex items-end gap-3 mb-4">
                           <p className="text-4xl font-black text-white tracking-tighter">{registrations.length}</p>
                           <p className="text-sm font-bold text-zinc-700 mb-1">/ {selectedEvent.maxParticipants || '∞'}</p>
                         </div>
                         <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-white transition-all duration-1000" 
                             style={{ width: `${selectedEvent.maxParticipants ? Math.min(100, (registrations.length / selectedEvent.maxParticipants) * 100) : 0}%` }} 
                           />
                         </div>
                      </div>

                      <div className="p-8 bg-zinc-950 border border-zinc-900 rounded-[2rem] shadow-2xl">
                         <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-3">Ticket Médio</p>
                         <p className="text-4xl font-black text-white tracking-tighter">
                           R$ {registrations.length > 0 ? (totalCollected / registrations.length).toFixed(2) : '0.00'}
                         </p>
                      </div>

                      <div className="p-8 bg-zinc-950 border border-zinc-900 rounded-[2rem] shadow-2xl border-l-emerald-500/20 text-right">
                         <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-3">Saldo Realizado</p>
                         <p className="text-4xl font-black text-emerald-400 tracking-tighter">
                           {((totalCollected / (registrations.length * selectedEvent.price || 1)) * 100).toFixed(0)}%
                         </p>
                         <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest mt-2">Arrecadado vs Esperado</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Financial Breakdown */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-4">Detalhamento Financeiro</h4>
                        <div className="space-y-6">
                           <div className="flex justify-between items-center group">
                             <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase tracking-widest font-bold">Total Esperado</span>
                             <span className="text-sm font-mono text-white">R$ {(registrations.length * selectedEvent.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                           </div>
                           <div className="flex justify-between items-center group">
                             <span className="text-xs text-emerald-500/60 group-hover:text-emerald-500 transition-colors uppercase tracking-widest font-bold">Total Recebido</span>
                             <span className="text-sm font-mono text-emerald-400">R$ {totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                           </div>
                           <div className="flex justify-between items-center group">
                             <span className="text-xs text-amber-500/60 group-hover:text-amber-500 transition-colors uppercase tracking-widest font-bold">Pendente</span>
                             <span className="text-sm font-mono text-amber-500">R$ {( (registrations.length * selectedEvent.price) - totalCollected ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                           </div>
                           <div className="pt-6 border-t border-white/5 mt-6">
                             <div className="flex justify-between items-center">
                               <span className="text-xs text-zinc-400 uppercase tracking-widest font-black">Previsão Líquida</span>
                               <span className="text-xl font-display font-medium text-white tracking-tight">R$ {(registrations.length * selectedEvent.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                             </div>
                           </div>
                        </div>
                      </div>

                      {/* Quick Management Actions */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-4">Ações de Gestão</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <button 
                            onClick={() => {
                              setEditingEvent(selectedEvent);
                              setTemplateRevision(0);
                              setIsEventModalOpen(true);
                            }}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <Edit size={18} className="text-zinc-600 group-hover:text-white" />
                              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white">Alterar Informações</span>
                            </div>
                            <ChevronRight size={14} className="text-zinc-800" />
                          </button>
                          
                          <button 
                            onClick={exportPDF}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <Download size={18} className="text-zinc-600 group-hover:text-white" />
                              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white">Relatório Completo (PDF)</span>
                            </div>
                            <ChevronRight size={14} className="text-zinc-800" />
                          </button>

                          <button 
                            onClick={exportExcel}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <FileSpreadsheet size={18} className="text-zinc-600 group-hover:text-white" />
                              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white">Base de Dados (Excel)</span>
                            </div>
                            <ChevronRight size={14} className="text-zinc-800" />
                          </button>

                          <button 
                            onClick={() => setIsQrModalOpen(true)}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <QrCode size={18} className="text-zinc-600 group-hover:text-white" />
                              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white">QR Code de Check-in</span>
                            </div>
                            <ChevronRight size={14} className="text-zinc-800" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'details' ? (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-white/[0.03] border border-white/5 rounded-3xl shadow-2xl group hover:border-white/10 transition-all">
                         <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-3">Custos de Inscrição</p>
                         <p className="text-3xl font-black text-white tracking-tighter">R$ {selectedEvent.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-8 bg-white/[0.03] border border-white/5 rounded-3xl shadow-2xl group hover:border-white/10 transition-all border-l-emerald-500/20">
                         <div className="flex justify-between items-start mb-3">
                           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Arrecadação Total</p>
                           <button 
                             onClick={() => {
                               setEditingEvent(selectedEvent);
                               setTemplateRevision(0);
                               setIsEventModalOpen(true);
                             }}
                             className="p-2 bg-white/5 border border-white/10 rounded-xl text-zinc-600 hover:text-white hover:bg-white/10 transition-all"
                             title="Alterar Informações"
                           >
                             <Edit size={14} />
                           </button>
                         </div>
                         <p className="text-3xl font-black text-emerald-400 tracking-tighter">R$ {totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                      <div>
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-3">Detalhamento</h4>
                        <p className="text-sm text-zinc-400 leading-[1.8] font-medium whitespace-pre-wrap">{selectedEvent.description || 'Nenhum descritivo em anexo.'}</p>
                      </div>

                      {(selectedEvent.pixKey || selectedEvent.paymentLink) && (
                        <div>
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-3">Dados para Pagamento</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedEvent.pixKey && (
                              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl group">
                                <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-3">Chave PIX</p>
                                <div className="flex items-center justify-between">
                                  <code className="text-xs text-white font-mono">{selectedEvent.pixKey}</code>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(selectedEvent.pixKey!);
                                      alert('Chave PIX copiada!');
                                    }}
                                    className="p-2 text-zinc-600 hover:text-white transition-colors"
                                  >
                                    <Copy size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                            {selectedEvent.paymentLink && (
                              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl group">
                                <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-3">Cartão de Crédito</p>
                                <a 
                                  href={selectedEvent.paymentLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between group/link"
                                >
                                  <span className="text-xs text-emerald-400 font-medium italic underline underline-offset-4">Link de Pagamento (InfinitePay)</span>
                                  <ExternalLink size={14} className="text-zinc-600 group-hover/link:text-white" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedEvent.phases && selectedEvent.phases.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-3">Fases do Projeto</h4>
                          <div className="space-y-4">
                            {selectedEvent.phases.map((phase, idx) => (
                              <div key={phase.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-white opacity-20" />
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div>
                                    <h5 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                                      <span className="text-[9px] bg-zinc-800 text-zinc-500 w-5 h-5 rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>
                                      {phase.name}
                                    </h5>
                                    <p className="text-xs text-zinc-500 mb-2">{phase.description}</p>
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                        <Calendar size={12} className="text-zinc-600" />
                                        {format(new Date(phase.startDate), 'dd/MM/yy')}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                        <ChevronRight size={12} className="text-zinc-600" />
                                        {format(new Date(phase.endDate), 'dd/MM/yy')}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                    Fase {idx + 1}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {selectedEvent.imageUrl && (
                      <div className="rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl relative group">
                        <img 
                          src={selectedEvent.imageUrl} 
                          alt="Banner do Evento" 
                          referrerPolicy="no-referrer"
                          className="w-full h-64 object-cover transition-transform group-hover:scale-105 duration-1000"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                           <div className="p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">
                              <p className="text-[10px] font-bold text-white uppercase tracking-widest">Banner Oficial</p>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                       <div className="flex items-center gap-5 p-6 bg-white/[0.02] border border-white/5 rounded-3xl group hover:bg-white/[0.04] transition-all">
                         <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                            <Calendar size={24} />
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mb-1">Janela de Tempo</p>
                            <p className="text-xs text-zinc-400 font-medium">{format(new Date(selectedEvent.startDate), 'dd/MM/yyyy')} — {format(new Date(selectedEvent.endDate), 'dd/MM/yyyy')}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-5 p-6 bg-white/[0.02] border border-white/5 rounded-3xl group hover:bg-white/[0.04] transition-all">
                         <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                            <MapPin size={24} />
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mb-1">Localização</p>
                            <p className="text-xs text-zinc-400 font-medium truncate max-w-[200px]">{selectedEvent.location}</p>
                         </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full space-y-6">
                    <div className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.02] blur-3xl rounded-full -mr-32 -mt-32" />
                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                           <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.4em] mb-4">Volume Financeiro Realizado</p>
                           <div className="flex items-baseline gap-2">
                             <span className="text-zinc-700 text-lg font-display">R$</span>
                             <h3 className="text-5xl font-display font-medium text-white tracking-tighter">
                               {totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                             </h3>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 border-l border-zinc-900 pl-8">
                           <div>
                             <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1.5">Meta Estimada</p>
                             <p className="text-lg font-mono text-zinc-500 tracking-tighter">R$ {(registrations.length * selectedEvent.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           </div>
                           <div>
                             <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1.5">Pendência</p>
                             <p className="text-lg font-mono text-amber-500/60 tracking-tighter">R$ {((registrations.length * selectedEvent.price) - totalCollected).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 font-black">
                      <div className="bg-white/[0.02] border border-emerald-500/10 p-4 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-emerald-500/60 mb-1 relative z-10">Pagos</p>
                        <p className="text-xl md:text-2xl font-black text-white relative z-10">{registrations.filter(r => r.status === 'paid').length}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-amber-500/10 p-4 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-amber-500/60 mb-1 relative z-10">Pendentes</p>
                        <p className="text-xl md:text-2xl font-black text-white relative z-10">{registrations.filter(r => r.status === 'pending').length}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-blue-500/10 p-4 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-blue-500/60 mb-1 relative z-10">Membros</p>
                        <p className="text-xl md:text-2xl font-black text-white relative z-10">{registrations.filter(r => r.isMember).length}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-purple-500/10 p-4 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-purple-500/60 mb-1 relative z-10">Visitantes</p>
                        <p className="text-xl md:text-2xl font-black text-white relative z-10">{registrations.filter(r => !r.isMember).length}</p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/[0.02] p-4 rounded-[2rem] border border-white/5">
                       <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                          <input 
                            placeholder="Pesquisar por nome, CPF ou telefone..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-white/10 transition-all text-white placeholder:text-zinc-600"
                          />
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="h-10 w-px bg-white/5 mx-2 hidden md:block" />
                         <div className="flex gap-2">
                           <button onClick={exportPDF} className="p-3 bg-white/5 border border-white/5 text-zinc-400 rounded-2xl hover:bg-white/10 transition-all hover:text-white shadow-xl group border-l-red-500/20" title="Gerar Dossier PDF">
                             <FileText size={18} className="group-hover:scale-110 transition-transform" />
                           </button>
                           <button onClick={exportExcel} className="p-3 bg-white/5 border border-white/5 text-zinc-400 rounded-2xl hover:bg-white/10 transition-all hover:text-white shadow-xl group border-l-emerald-500/20" title="Exportar para Excel">
                             <FileSpreadsheet size={18} className="group-hover:scale-110 transition-transform" />
                           </button>
                         </div>
                       </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {filteredRegistrations.length === 0 ? (
                        <div className="p-20 text-center text-zinc-600 font-bold text-[10px] uppercase tracking-widest italic py-32 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                          {searchQuery ? 'Nenhum resultado para sua busca' : 'Nenhum integrante confirmado'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {filteredRegistrations.map(reg => (
                            <motion.div 
                              layout
                              key={reg.id} 
                              className="group bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] hover:bg-white/[0.04] hover:border-white/10 transition-all shadow-xl"
                            >
                              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                                <div className="flex items-center gap-5">
                                  <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-800 flex flex-col items-center justify-center text-zinc-500 overflow-hidden relative border border-white/5 shadow-inner">
                                    {reg.bloodType ? (
                                      <div className="text-center">
                                        <p className="text-[7px] font-black leading-none opacity-50 uppercase mb-1">Sangue</p>
                                        <p className="text-lg font-black text-red-500 tracking-tighter">{reg.bloodType}</p>
                                      </div>
                                    ) : (
                                      <Users2 size={28} className="opacity-10" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-3 mb-1.5">
                                      <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{reg.name}</h4>
                                      <span className={cn(
                                        "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                                        reg.isMember ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-zinc-800 text-zinc-500 border border-white/5"
                                      )}>
                                        {reg.isMember ? 'Membro' : 'Visitante'}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono tracking-tighter bg-white/5 px-2 py-0.5 rounded-lg">
                                        <Clock size={12} className="text-zinc-700" />
                                        {reg.registeredAt ? format(new Date(reg.registeredAt), "dd/MM/yy HH:mm") : 'Data N/D'}
                                      </div>
                                      {reg.cpf && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono tracking-tighter bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                          <span className="text-[8px] font-black text-zinc-600 uppercase">CPF</span>
                                          {reg.cpf}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono tracking-tighter bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                          <span className="text-[8px] font-black text-zinc-600 uppercase">Tel</span>
                                          {reg.phone}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-6 xl:justify-end">
                                  <div className="flex flex-col items-end pr-4 border-r border-white/5">
                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1.5">Contribuição</p>
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                      <span className="text-[9px] text-zinc-500 font-black">R$</span>
                                      <input 
                                         type="number"
                                         className="w-20 bg-transparent border-none p-0 text-sm font-black text-white focus:ring-0 text-right font-mono"
                                         defaultValue={reg.amountPaid}
                                         onBlur={(e) => handleUpdateAmount(reg.id!, Number(e.target.value))}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <button 
                                        onClick={() => {
                                          if (reg.status === 'paid') {
                                            handleTogglePayment(reg);
                                          } else {
                                            setPaymentMenuId(paymentMenuId === reg.id ? null : (reg.id || null));
                                          }
                                        }}
                                        className={cn(
                                          "px-6 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center gap-2 active:scale-95",
                                          reg.status === 'paid' 
                                            ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                                            : "bg-white/5 text-zinc-500 border border-white/10 hover:bg-white/10 hover:text-white"
                                        )}
                                      >
                                        {reg.status === 'paid' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                        {reg.status === 'paid' ? 'Liquidado' : 'Aguardando'}
                                        {reg.status === 'pending' && <ChevronDown size={14} className={cn("transition-transform", paymentMenuId === reg.id && "rotate-180")} />}
                                      </button>

                                      <AnimatePresence>
                                        {paymentMenuId === reg.id && (
                                          <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full mb-3 right-0 z-50 bg-zinc-900 border border-white/10 rounded-[1.5rem] shadow-2xl p-2 min-w-[160px] flex flex-col gap-1.5"
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
                                    
                                    <button 
                                      onClick={() => setConfirmModal({ isOpen: true, id: reg.id!, type: 'registration' })}
                                      className="p-3.5 text-zinc-600 hover:text-red-400 rounded-2xl bg-white/5 border border-white/5 hover:bg-red-500/10 transition-all hover:border-red-500/20"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {reg.allergies && (
                                <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-3">
                                  <div className="p-2 bg-amber-500/10 rounded-xl">
                                    <AlertCircle size={14} className="text-amber-500" />
                                  </div>
                                  <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider">Restrições Médicas / Alergias: <span className="text-zinc-400 lowercase italic ml-1 font-medium bg-white/5 px-2 py-0.5 rounded-md">{reg.allergies}</span></p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={async () => {
          if (confirmModal.type === 'event') {
            handleDeleteEvent(confirmModal.id);
          } else if (confirmModal.type === 'template') {
            await churchService.deleteEventTemplate(confirmModal.id);
            loadTemplates();
          } else {
            handleDeleteRegistration(confirmModal.id);
          }
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        title="Confirmar Exclusão"
        message={
          confirmModal.type === 'event' 
            ? "Esta ação removerá o projeto e todos os registros de inscritos vinculados a ele." 
            : confirmModal.type === 'template'
            ? "Esta ação removerá permanentemente este template de evento."
            : "Esta ação removerá permanentemente a participação do indivíduo neste projeto."
        }
      />

      {/* Event Modal */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEventModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {editingEvent ? 'Configurações' : 'Nova Missão'}
                </h3>
                <div className="flex items-center gap-2 md:gap-3">
                  {!editingEvent && (
                    <button 
                      type="button"
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white rounded-xl hover:bg-white/10 transition-all"
                    >
                      <Copy size={14} className="text-zinc-500" />
                      <span className="hidden sm:inline">Templates</span>
                    </button>
                  )}
                  <button onClick={() => setIsEventModalOpen(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form 
                key={`${editingEvent?.id || 'new'}-${templateRevision}`}
                onSubmit={handleSaveEvent} 
                className="p-10 space-y-8 overflow-y-auto max-h-[70vh]"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Título do Projeto *</label>
                    <input 
                      name="title" defaultValue={editingEvent?.title}
                      placeholder="Ex: Conferência Profética 2024" 
                      className={cn(
                        "w-full px-5 py-3.5 bg-white/5 border rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700",
                        errors.title ? "border-red-500/50" : "border-white/5"
                      )}
                    />
                    {errors.title && <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest pl-1">{errors.title}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Classificação *</label>
                    <select 
                      name="type" defaultValue={editingEvent?.type || (eventTypes[0]?.name || '')}
                      className={cn(
                        "w-full px-5 py-3.5 bg-white/5 border rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all",
                        errors.type ? "border-red-500/50" : "border-white/5"
                      )}
                    >
                      {eventTypes.map(t => (
                        <option key={t.id} value={t.name} className="bg-zinc-900">{t.name}</option>
                      ))}
                      {eventTypes.length === 0 && (
                        <option value="" className="bg-zinc-900">Nenhum tipo disponível</option>
                      )}
                    </select>
                    {errors.type && <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest pl-1">{errors.type}</p>}
                    {eventTypes.length === 0 && (
                      <p className="text-[9px] text-amber-400/60 font-bold italic mt-1.5 uppercase tracking-widest pl-1">Vá em Configurações para cadastrar rótulos.</p>
                    )}
                  </div>
                </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Início da Operação *</label>
                     <input 
                       type="datetime-local" name="startDate" 
                       defaultValue={editingEvent?.startDate ? editingEvent.startDate.slice(0, 16) : ''}
                       className={cn(
                         "w-full px-5 py-3.5 bg-white/5 border rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all [color-scheme:dark]",
                         errors.startDate ? "border-red-500/50" : "border-white/5"
                       )}
                     />
                     {errors.startDate && <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest pl-1">{errors.startDate}</p>}
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Finalização *</label>
                     <input 
                       type="datetime-local" name="endDate" 
                       defaultValue={editingEvent?.endDate ? editingEvent.endDate.slice(0, 16) : ''}
                       className={cn(
                         "w-full px-5 py-3.5 bg-white/5 border rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all [color-scheme:dark]",
                         errors.endDate ? "border-red-500/50" : "border-white/5"
                       )}
                     />
                     {errors.endDate && <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest pl-1">{errors.endDate}</p>}
                   </div>
                 </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">QG / Localização Física *</label>
                  <input 
                    name="location" defaultValue={editingEvent?.location}
                    placeholder="Nome do local, templo ou endereço" 
                    className={cn(
                      "w-full px-5 py-3.5 bg-white/5 border rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700",
                      errors.location ? "border-red-500/50" : "border-white/5"
                    )}
                  />
                  {errors.location && <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest pl-1">{errors.location}</p>}
                </div>

                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Custo por Unidade (R$) *</label>
                    <input 
                      type="number" step="0.01" name="price" 
                      defaultValue={editingEvent?.price}
                      className={cn(
                        "w-full px-5 py-3.5 bg-white/5 border rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700",
                        errors.price ? "border-red-500/50" : "border-white/5"
                      )}
                    />
                    {errors.price && <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest pl-1">{errors.price}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Slot Máximo</label>
                    <input 
                      type="number" name="maxParticipants" 
                      defaultValue={editingEvent?.maxParticipants}
                      placeholder="Ilimitado se vazio"
                      className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Capa do Evento (URL)</label>
                  <input 
                    name="imageUrl" defaultValue={editingEvent?.imageUrl}
                    placeholder="https://images.unsplash.com/photo-..." 
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Chave PIX para Inscrição</label>
                    <input 
                      name="pixKey" defaultValue={editingEvent?.pixKey}
                      placeholder="E-mail, CPF, Celular ou Chave Aleatória" 
                      className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Link de Pagamento (InfinitePay / Outros)</label>
                    <input 
                      name="paymentLink" defaultValue={editingEvent?.paymentLink}
                      placeholder="https://pay.infinitepay.io/..." 
                      className="w-full px-5 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Descritivo Detalhado</label>
                  <textarea 
                    name="description" defaultValue={editingEvent?.description}
                    rows={4}
                    placeholder="Objetivo, público-alvo, recomendações..."
                    className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all resize-none placeholder:text-zinc-700"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Fases do Cronograma</label>
                    <button 
                      type="button"
                      onClick={() => setEventPhases([...eventPhases, { id: Date.now().toString(), name: '', description: '', startDate: '', endDate: '' }])}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Nova Fase
                    </button>
                  </div>

                  <div className="space-y-4">
                    {eventPhases.map((phase, index) => (
                      <div key={phase.id} className="p-6 bg-zinc-950 border border-white/5 rounded-3xl space-y-4 relative group">
                        <button 
                          type="button"
                          onClick={() => setEventPhases(eventPhases.filter(p => p.id !== phase.id))}
                          className="absolute top-4 right-4 p-2 text-zinc-700 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 px-1">Nome da Fase {index + 1}</label>
                            <input 
                              value={phase.name}
                              onChange={(e) => {
                                const newPhases = [...eventPhases];
                                newPhases[index].name = e.target.value;
                                setEventPhases(newPhases);
                              }}
                              placeholder="Ex: Inscrições, Workshop, etc"
                              className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-white/10 transition-all"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 px-1">Início</label>
                              <input 
                                type="date"
                                value={phase.startDate}
                                onChange={(e) => {
                                  const newPhases = [...eventPhases];
                                  newPhases[index].startDate = e.target.value;
                                  setEventPhases(newPhases);
                                }}
                                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs text-white outline-none [color-scheme:dark]"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 px-1">Término</label>
                              <input 
                                type="date"
                                value={phase.endDate}
                                onChange={(e) => {
                                  const newPhases = [...eventPhases];
                                  newPhases[index].endDate = e.target.value;
                                  setEventPhases(newPhases);
                                }}
                                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs text-white outline-none [color-scheme:dark]"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 px-1">Descrição Curta</label>
                          <input 
                            value={phase.description}
                            onChange={(e) => {
                              const newPhases = [...eventPhases];
                              newPhases[index].description = e.target.value;
                              setEventPhases(newPhases);
                            }}
                            placeholder="Breve resumo das atividades desta fase..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-white/10 transition-all"
                          />
                        </div>
                      </div>
                    ))}
                    {eventPhases.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-3xl text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                        Nenhuma fase estruturada para este projeto
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <FileUploader 
                    existingAttachments={eventAttachments}
                    onUpload={(files) => setEventAttachments(files)}
                    label="Arquivos Suplementares (Fotos, Documentos, etc)"
                  />
                </div>

                <div className="flex justify-end gap-4 mt-12 bg-white/[0.01] p-6 -mx-10 border-t border-white/5">
                   <button 
                    type="button" 
                    onClick={() => setIsEventModalOpen(false)}
                    className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit" 
                    className="px-12 py-3 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-zinc-200 transition-all active:scale-95"
                  >
                    Finalizar Estrutura
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedEvent && (
        <QRCodeModal 
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          eventTitle={selectedEvent.title}
          publicId={selectedEvent.publicId}
          settings={settings}
        />
      )}

      {/* Template Selection Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTemplateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Templates de Evento</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Selecione um modelo pré-definido</p>
                </div>
                <button 
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-3 bg-white/5 text-zinc-500 hover:text-white rounded-2xl border border-white/5 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                {eventTemplates.length === 0 ? (
                  <div className="p-12 text-center text-zinc-600 font-bold text-[10px] uppercase tracking-widest italic py-20 border-2 border-dashed border-white/5 rounded-[2rem]">
                    Nenhum template salvo ainda.
                  </div>
                ) : eventTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="w-full text-left p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.05] hover:border-white/10 transition-all group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{template.name}</h4>
                       <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-zinc-800 rounded-lg text-zinc-500">{template.type}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium truncate mb-4">{template.description || 'Sem descrição'}</p>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                          <MapPin size={12} className="text-zinc-600" />
                          {template.location}
                       </div>
                       <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                          <CreditCard size={12} className="text-zinc-600" />
                          R$ {template.price.toFixed(2)}
                       </div>
                    </div>
                    
                    <div className="absolute right-6 bottom-4 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                       <CheckCircle2 size={24} className="text-emerald-500/20" />
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({ isOpen: true, id: template.id!, type: 'template' });
                      }}
                      className="absolute top-6 right-6 p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </button>
                ))}
              </div>

              <div className="p-8 bg-white/[0.01] border-t border-white/5 flex flex-col items-center">
                 <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.5em]">Eclesia Manager System</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
