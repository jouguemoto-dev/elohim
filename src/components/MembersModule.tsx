import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Info,
  X,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Droplet,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
  Upload,
  Cake
} from 'lucide-react';
import { churchService } from '../services/churchService';
import { Member } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import FileUploader from './FileUploader';
import { Attachment } from '../types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import ConfirmModal from './ConfirmModal';

export default function MembersModule() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [joinDateStart, setJoinDateStart] = useState('');
  const [joinDateEnd, setJoinDateEnd] = useState('');
  const [birthDateStart, setBirthDateStart] = useState('');
  const [birthDateEnd, setBirthDateEnd] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberAttachments, setMemberAttachments] = useState<Attachment[]>([]);
  const [memberPhotoUrl, setMemberPhotoUrl] = useState<string | undefined>(undefined);
  const [phoneValue, setPhoneValue] = useState('');
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({ isOpen: false, id: '', name: '' });

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (editingMember) {
      setMemberAttachments(editingMember.attachments || []);
      setMemberPhotoUrl(editingMember.photoUrl);
      setPhoneValue(editingMember.phone || '');
    } else {
      setMemberAttachments([]);
      setMemberPhotoUrl(undefined);
      setPhoneValue('');
    }
  }, [editingMember, isModalOpen]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4,5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    }
    
    setPhoneValue(value);
  };

  async function loadMembers() {
    setLoading(true);
    const data = await churchService.getMembers();
    setMembers(data || []);
    setLoading(false);
  }

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    
    const matchesJoinDate = (!joinDateStart || (m.joinDate && m.joinDate >= joinDateStart)) && 
                            (!joinDateEnd || (m.joinDate && m.joinDate <= joinDateEnd));
    
    const matchesBirthDate = (!birthDateStart || (m.birthDate && m.birthDate >= birthDateStart)) && 
                             (!birthDateEnd || (m.birthDate && m.birthDate <= birthDateEnd));

    return matchesSearch && matchesStatus && matchesJoinDate && matchesBirthDate;
  });

  const handleDelete = async (id: string) => {
    await churchService.deleteMember(id);
    loadMembers();
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const memberData: any = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      birthDate: formData.get('birthDate') as string,
      joinDate: formData.get('joinDate') as string,
      isBaptized: formData.get('isBaptized') === 'on',
      baptismDate: formData.get('baptismDate') as string,
      bloodType: formData.get('bloodType') as string,
      allergies: formData.get('allergies') as string,
      observations: formData.get('observations') as string,
      status: formData.get('status') as 'active' | 'inactive',
      attachments: memberAttachments,
      photoUrl: memberPhotoUrl
    };

    if (editingMember?.id) {
      await churchService.updateMember(editingMember.id, memberData);
    } else {
      await churchService.addMember(memberData);
    }
    
    setIsModalOpen(false);
    setEditingMember(null);
    loadMembers();
  };

  const exportToExcel = () => {
    const data = filteredMembers.map(m => ({
      'Nome': m.name,
      'Telefone': m.phone,
      'Email': m.email || '-',
      'Endereço': m.address || '-',
      'Nascimento': m.birthDate || '-',
      'Entrada': m.joinDate || '-',
      'Batizado': m.isBaptized ? 'Sim' : 'Não',
      'Tipo Sanguíneo': m.bloodType || '-',
      'Status': m.status === 'active' ? 'Ativo' : 'Inativo'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Membros");
    XLSX.writeFile(wb, `membros_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(18);
    doc.text('Relatório de Membros', 14, 22);
    doc.setFontSize(10);
    doc.text(`Data de geração: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
    doc.text(`Total de registros: ${filteredMembers.length}`, 14, 35);

    const tableData = filteredMembers.map(m => [
      m.name,
      m.phone,
      m.isBaptized ? 'Sim' : 'Não',
      m.bloodType || '-',
      m.status === 'active' ? 'Ativo' : 'Inativo'
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Nome', 'Telefone', 'Batizado', 'T. Sang.', 'Status']],
      body: tableData,
    });

    doc.save(`membros_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (confirm(`Deseja importar ${data.length} membros?`)) {
          for (const row of data) {
            await churchService.addMember({
              name: row['Nome'] || row['nome'] || 'Novo Membro',
              phone: row['Telefone'] || row['telefone'] || row['celular'] || '-',
              email: row['Email'] || row['email'] || '',
              status: 'active',
              isBaptized: false
            });
          }
          alert('Importação concluída!');
          loadMembers();
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao importar arquivo. Verifique se o formato está correto (Nome, Telefone).');
      }
    };
    reader.readAsBinaryString(file);
  };

  const isBirthdayNextWeek = (birthDate?: string) => {
    if (!birthDate) return false;
    const today = new Date();
    const [year, month, day] = birthDate.split('-').map(Number);
    const birth = new Date(today.getFullYear(), month - 1, day);
    
    // If birthday already happened this year, check next year
    if (birth < today) {
      birth.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = birth.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays <= 7;
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
        <div>
           <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-1.5 block">Gestão Estratégica</span>
           <h2 className="text-3xl font-display font-medium text-white tracking-tight">Membros</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
           <div className="relative">
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
              id="member-import" 
              onChange={handleImport}
            />
            <button 
              onClick={() => document.getElementById('member-import')?.click()}
              className="bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all shadow-sm"
              title="Importar Membros"
            >
              <Upload size={14} />
              <span className="hidden lg:inline">Importar</span>
            </button>
          </div>

          <button 
            onClick={exportToExcel}
            className="bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all shadow-sm"
            title="Exportar Excel"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden lg:inline">Excel</span>
          </button>
          
          <button 
            onClick={exportToPDF}
            className="bg-zinc-900 border border-zinc-800 text-zinc-500 px-3 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all shadow-sm"
            title="Imprimir"
          >
            <Printer size={14} />
            <span className="hidden lg:inline">PDF</span>
          </button>

          <button 
            onClick={() => { setEditingMember(null); setIsModalOpen(true); }}
            className="bg-white text-black px-6 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
          >
            <Plus size={16} />
            <span>Novo Registro</span>
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="mx-4 bg-zinc-950 p-6 rounded-3xl border border-zinc-900/50 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full flex items-center bg-transparent px-4 py-3 rounded-2xl border border-zinc-800 focus-within:border-white transition-all">
            <Search className="text-zinc-600 mr-3" size={16} />
            <input 
              type="text" 
              placeholder="PESQUISAR BASE..." 
              className="bg-transparent border-none text-[10px] uppercase font-black tracking-[0.2em] w-full outline-none text-white placeholder:text-zinc-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center bg-zinc-900/50 rounded-2xl p-1 border border-zinc-800">
              {(['all', 'active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    statusFilter === s ? "bg-white text-black shadow-lg" : "text-zinc-600 hover:text-zinc-300"
                  )}
                >
                  {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : 'Inativos'}
                </button>
              ))}
            </div>
          </div>
        </div>
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "p-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
                showAdvancedFilters ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10"
              )}
            >
              <Filter size={16} />
              <span className="hidden sm:inline">Filtros</span>
            </button>


        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/5 pt-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">Entrada (Início)</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-white/10"
                    value={joinDateStart}
                    onChange={(e) => setJoinDateStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">Entrada (Fim)</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-white/10"
                    value={joinDateEnd}
                    onChange={(e) => setJoinDateEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">Nascimento (Início)</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-white/10"
                    value={birthDateStart}
                    onChange={(e) => setBirthDateStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">Nascimento (Fim)</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-white/10"
                    value={birthDateEnd}
                    onChange={(e) => setBirthDateEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setJoinDateStart('');
                    setJoinDateEnd('');
                    setBirthDateStart('');
                    setBirthDateEnd('');
                  }}
                  className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] hover:text-red-300 transition-colors"
                >
                  Limpar Todos os Filtros
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden bg-black border border-zinc-900 rounded-[2.5rem] shadow-2xl flex flex-col mx-4">
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-zinc-700 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Sincronizando Core...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-800 font-black text-[10px] uppercase tracking-[0.3em] italic py-20">Nenhum registro localizado</div>
          ) : (
            <table className="w-full border-separate border-spacing-y-2 px-8">
              <thead>
                <tr className="text-zinc-700">
                  <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-left">Identificação</th>
                  <th className="hidden md:table-cell px-6 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-left">Contato</th>
                  <th className="hidden sm:table-cell px-6 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-center">Status</th>
                  <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-right">Controles</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="group">
                    <td className="px-6 py-5 bg-zinc-900/30 rounded-l-3xl border-y border-l border-zinc-900/50 group-hover:bg-zinc-900/50 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center text-zinc-700 overflow-hidden shrink-0 border border-white/5 shadow-inner group-hover:scale-105 transition-transform">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="font-black text-xs">{member.name.substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-display font-medium text-zinc-100 group-hover:text-white transition-all text-base">{member.name}</p>
                            {isBirthdayNextWeek(member.birthDate) && (
                              <Cake size={14} className="text-amber-400 animate-bounce" title="Aniversário em breve!" />
                            )}
                          </div>
                          <p className="text-[8px] text-zinc-700 font-black mt-1 tracking-[0.2em] uppercase">Membro Base</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-5 bg-zinc-900/30 border-y border-zinc-900/50 group-hover:bg-zinc-900/50 transition-all font-mono text-zinc-500 text-xs">
                      {member.phone}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-5 bg-zinc-900/30 border-y border-zinc-900/50 group-hover:bg-zinc-900/50 text-center transition-all">
                      <span className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                        member.status === 'active' 
                          ? "bg-white/5 text-white border-white/10" 
                          : "bg-zinc-950 text-zinc-700 border-zinc-900"
                      )}>
                        <div className={cn("w-1 h-1 rounded-full", member.status === 'active' ? "bg-white animate-pulse" : "bg-zinc-800")} />
                        {member.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-5 bg-zinc-900/30 rounded-r-3xl border-y border-r border-zinc-900/50 group-hover:bg-zinc-900/50 text-right transition-all">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                           onClick={() => { setEditingMember(member); setIsModalOpen(true); }}
                           className="p-3 text-zinc-600 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                           title="Editar Perfil"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setConfirmModal({ isOpen: true, id: member.id!, name: member.name })}
                          className="p-3 text-zinc-800 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"
                          title="Remover Registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-10 py-5 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] bg-white/[0.02]">
          {filteredMembers.length} registros no sistema
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          if (confirmModal.id) {
            handleDelete(confirmModal.id);
          }
        }}
        title="Confirmar Exclusão"
        message={`Deseja realmente excluir o cadastro de ${confirmModal.name}? Esta ação é técnica e irreversível. Todos os dados e anexos serão permanentemente eliminados.`}
      />

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] bg-zinc-900 border border-white/10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {editingMember ? 'Detalhes' : 'Novo Cadastro'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 md:gap-x-16 gap-y-10 md:gap-y-12">
                  {/* Basic Info */}
                  <div className="space-y-8">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 border-b border-white/5 pb-3">Informações de Base</h4>
                    
                    <div className="flex flex-col items-center gap-6 py-4">
                       <div className="w-32 h-32 rounded-[2rem] bg-zinc-800 border border-white/5 flex items-center justify-center overflow-hidden relative group shadow-2xl">
                          {memberPhotoUrl ? (
                            <img src={memberPhotoUrl} alt="Foto do Membro" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Users className="text-zinc-700" size={48} />
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <span className="text-[10px] text-white font-bold uppercase tracking-widest">Atualizar Foto</span>
                          </div>
                       </div>
                       <div className="w-full max-w-[240px]">
                          <FileUploader 
                            existingAttachments={memberPhotoUrl ? [{ 
                              id: 'profile-photo',
                              name: 'Foto de Perfil', 
                              url: memberPhotoUrl, 
                              type: 'image/jpeg',
                              size: 0,
                              uploadedAt: new Date().toISOString()
                            }] : []}
                            onUpload={(files) => {
                              if (files.length > 0) {
                                setMemberPhotoUrl(files[0].url);
                              } else {
                                setMemberPhotoUrl(undefined);
                              }
                            }}
                            label="Mudar Fotografia"
                            maxFiles={1}
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Nome Completo</label>
                      <input 
                        required 
                        name="name" 
                        defaultValue={editingMember?.name}
                        placeholder="Ex: João Silva" 
                        className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Telefone Principal</label>
                        <input 
                          required 
                          name="phone" 
                          value={phoneValue}
                          onChange={handlePhoneChange}
                          placeholder="(00) 00000-0000" 
                          pattern="\(\d{2}\) \d{4,5}-\d{4}"
                          title="Formato esperado: (00) 00000-0000 ou (00) 0000-0000"
                          className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Endereço de Email</label>
                        <input 
                          name="email" 
                          type="email"
                          defaultValue={editingMember?.email}
                          placeholder="email@exemplo.com" 
                          className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Endereço Residencial</label>
                      <textarea 
                        name="address" 
                        defaultValue={editingMember?.address}
                        rows={3}
                        placeholder="Rua, Número, Bairro, Cidade..." 
                        className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all resize-none placeholder:text-zinc-700"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Nascimento</label>
                        <input 
                          name="birthDate" 
                          type="date"
                          defaultValue={editingMember?.birthDate}
                          className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Estado Civil/Status</label>
                        <select 
                          name="status"
                          defaultValue={editingMember?.status || 'active'}
                          className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all"
                        >
                          <option value="active" className="bg-zinc-900">Ativo</option>
                          <option value="inactive" className="bg-zinc-900">Inativo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Church & Health Info */}
                  <div className="space-y-8">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 border-b border-white/5 pb-3">Dados Eclesiásticos</h4>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Data de Membresia</label>
                        <input 
                          name="joinDate" 
                          type="date"
                          defaultValue={editingMember?.joinDate}
                          className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Tipo Sanguíneo</label>
                        <select 
                          name="bloodType"
                          defaultValue={editingMember?.bloodType || ''}
                          className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all"
                        >
                          <option value="" className="bg-zinc-900">Não informado</option>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                            <option key={t} value={t} className="bg-zinc-900">{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                          <Droplet className={cn(editingMember?.isBaptized ? "text-blue-400" : "text-zinc-600")} size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-widest">Confissão de Fé</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Batizado(a) nas águas?</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        name="isBaptized"
                        defaultChecked={editingMember?.isBaptized}
                        className="w-6 h-6 rounded-xl accent-white bg-zinc-800 border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Restrições ou Alergias</label>
                      <input 
                        name="allergies" 
                        defaultValue={editingMember?.allergies}
                        placeholder="Ex: Medicamentos, Alimentos..." 
                        className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Observações</label>
                      <textarea 
                        name="observations" 
                        defaultValue={editingMember?.observations}
                        rows={4}
                        placeholder="Notas adicionais sobre o membro..." 
                        className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all resize-none placeholder:text-zinc-700"
                      />
                    </div>

                    <div className="pt-6">
                      <FileUploader 
                        existingAttachments={memberAttachments}
                        onUpload={(files) => setMemberAttachments(files)}
                        label="Dossier Digital (Anexos)"
                      />
                    </div>
                  </div>
                </div>

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
                    className="order-1 sm:order-2 px-12 py-4 bg-white text-black rounded-2xl text-xs font-black shadow-2xl hover:bg-zinc-200 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Finalizar Registro
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
