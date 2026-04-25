import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Instagram, 
  Facebook, 
  Youtube, 
  Wallet,
  Bell,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
  Tags,
  Link
} from 'lucide-react';
import { churchService } from '../services/churchService';
import { ChurchSettings, EventType } from '../types';
import FileUploader from './FileUploader';
import { motion, AnimatePresence } from 'motion/react';

import ConfirmModal from './ConfirmModal';

export default function SettingsModule() {
  const [settings, setSettings] = useState<ChurchSettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    socialMedia: {
      instagram: '',
      facebook: '',
      youtube: ''
    },
    pixKey: '',
    announcement: '',
    publicUrl: ''
  });
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [newType, setNewType] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
    type: 'eventType' | 'logo';
  }>({ isOpen: false, id: '', type: 'eventType' });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const [data, types] = await Promise.all([
      churchService.getSettings(),
      churchService.getEventTypes()
    ]);
    
    if (data) {
      setSettings({
        ...data,
        socialMedia: {
          instagram: data.socialMedia?.instagram || '',
          facebook: data.socialMedia?.facebook || '',
          youtube: data.socialMedia?.youtube || ''
        }
      });
    }
    
    setEventTypes(types || []);
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await churchService.updateSettings(settings);
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddEventType = async () => {
    if (!newType.trim()) return;
    await churchService.addEventType(newType.trim());
    setNewType('');
    const types = await churchService.getEventTypes();
    setEventTypes(types || []);
  };

  const handleDeleteEventType = async (id: string) => {
    await churchService.deleteEventType(id);
    const types = await churchService.getEventTypes();
    setEventTypes(types || []);
  };

  const handleRemoveLogo = () => {
    setSettings({...settings, logoUrl: ''});
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-12 px-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Preferências do Sistema</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Configurações globais e identidade visual</p>
        </div>
        
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-2xl"
            >
              <CheckCircle2 size={16} />
              Sincronizado com Sucesso
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <form onSubmit={handleSave} className="space-y-10">
        {/* Identity Section */}
        <section className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center gap-3 text-zinc-500">
            <Building2 size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Identidade Institucional</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Designação da Igreja</label>
                <input 
                  required
                  value={settings.name}
                  onChange={e => setSettings({...settings, name: e.target.value})}
                  className="w-full px-5 py-4 bg-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none border border-white/5 transition-all placeholder:text-zinc-700"
                  placeholder="Nome oficial da congregação"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1">Localização Física</label>
                <input 
                  value={settings.address}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                  className="w-full px-5 py-4 bg-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none border border-white/5 transition-all placeholder:text-zinc-700"
                  placeholder="Endereço operacional completo"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1 flex items-center gap-2">
                <ImageIcon size={14} /> Brasão / Logotipo
              </label>
              <FileUploader 
                onUpload={(files) => {
                  if (files.length > 0) setSettings({...settings, logoUrl: files[0].url});
                }}
                accept="image/*"
              />
              {settings.logoUrl && (
                <div className="mt-4 relative group inline-block">
                  <div className="p-2 bg-white/5 rounded-2xl border border-white/10">
                    <img src={settings.logoUrl} alt="Logo" className="h-20 w-auto rounded-xl shadow-2xl" referrerPolicy="no-referrer" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setConfirmModal({ isOpen: true, id: 'logo', type: 'logo' })}
                    className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-xl shadow-2xl scale-0 group-hover:scale-100 transition-all hover:bg-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Contact & Social Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <section className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center gap-3 text-zinc-500">
              <Phone size={20} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Comunicação</h3>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="email"
                  value={settings.email}
                  onChange={e => setSettings({...settings, email: e.target.value})}
                  className="w-full pl-14 pr-5 py-4 bg-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none border border-white/5 transition-all placeholder:text-zinc-700"
                  placeholder="Canal de email oficial"
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="tel"
                  value={settings.phone}
                  onChange={e => setSettings({...settings, phone: e.target.value})}
                  className="w-full pl-14 pr-5 py-4 bg-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none border border-white/5 transition-all placeholder:text-zinc-700"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl space-y-8">
            <div className="flex items-center gap-3 text-zinc-500">
              <Instagram size={20} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Ambiente Digital</h3>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <Instagram className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  value={settings.socialMedia?.instagram}
                  onChange={e => setSettings({...settings, socialMedia: {...settings.socialMedia, instagram: e.target.value}})}
                  className="w-full pl-14 pr-5 py-4 bg-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none border border-white/5 transition-all placeholder:text-zinc-700"
                  placeholder="ID do Instagram"
                />
              </div>
              <div className="relative group">
                <Facebook className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  value={settings.socialMedia?.facebook}
                  onChange={e => setSettings({...settings, socialMedia: {...settings.socialMedia, facebook: e.target.value}})}
                  className="w-full pl-14 pr-5 py-4 bg-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none border border-white/5 transition-all placeholder:text-zinc-700"
                  placeholder="Link do Facebook"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Financial & Announcements */}
        <section className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center gap-3 text-zinc-500">
            <Wallet size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Operacional & Avisos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1 flex items-center gap-2">
                <DollarSign size={14} /> Chave PIX Ativa
              </label>
              <input 
                value={settings.pixKey}
                onChange={e => setSettings({...settings, pixKey: e.target.value})}
                className="w-full px-5 py-4 bg-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none border border-white/5 transition-all font-mono placeholder:text-zinc-700"
                placeholder="Identificador PIX para doações"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1 flex items-center gap-2">
                <Link size={14} /> URL Pública do Aplicativo
              </label>
              <input 
                value={settings.publicUrl}
                onChange={e => setSettings({...settings, publicUrl: e.target.value})}
                className="w-full px-5 py-4 bg-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none border border-white/5 transition-all placeholder:text-zinc-700"
                placeholder="https://sua-igreja.app.run.app"
              />
              <p className="text-[9px] text-zinc-600 px-1 font-medium italic">Configure aqui o link (URL) que aparece no navegador. Isso garante que os QR Codes funcionem corretamente para todos.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 px-1 flex items-center gap-2">
              <Bell size={14} /> Comunicado de Painel (Home)
            </label>
            <input 
              value={settings.announcement}
              onChange={e => setSettings({...settings, announcement: e.target.value})}
              className="w-full px-5 py-4 bg-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none border border-white/5 transition-all placeholder:text-zinc-700"
              placeholder="Mensagem em destaque no dashboard"
            />
          </div>
        </section>

        {/* Event Types Section */}
        <section className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl space-y-8">
          <div className="flex items-center gap-3 text-zinc-500">
            <Tags size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Taxonomia de Eventos</h3>
          </div>

          <div className="space-y-8">
            <div className="flex gap-4">
              <input 
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="flex-1 px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-700"
                placeholder="Classificação de novo programa (ex: Culto, Seminário...)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEventType())}
              />
              <button 
                type="button"
                onClick={handleAddEventType}
                className="p-4 bg-white text-black rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 px-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <Plus size={18} />
                Expandir
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {eventTypes.map(type => (
                <div 
                  key={type.id} 
                  className="group flex items-center justify-between px-5 py-3 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all shadow-xl"
                >
                  <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400 truncate group-hover:text-white transition-colors">{type.name}</span>
                  <button 
                    type="button"
                    onClick={() => setConfirmModal({ isOpen: true, id: type.id!, type: 'eventType' })}
                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {eventTypes.length === 0 && (
                <p className="col-span-full text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center py-8 border-2 border-dashed border-white/5 rounded-[2rem]">Protocolo de categorias vazio.</p>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            disabled={isSaving}
            className="bg-white text-black px-12 py-5 rounded-[2rem] flex items-center gap-4 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin text-black" size={20} /> : <Save size={20} />}
            {isSaving ? 'Processando...' : 'Efetivar Alterações'}
          </button>
        </div>
      </form>
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          if (confirmModal.type === 'logo') {
            handleRemoveLogo();
          } else {
            handleDeleteEventType(confirmModal.id);
          }
        }}
        title="Confirmar Remoção"
        message={confirmModal.type === 'logo' 
          ? "Deseja remover a imagem do logotipo da instituição? As alterações só serão efetivadas ao salvar as preferências." 
          : "Remover esta categoria não afetará eventos passados, mas ela deixará de estar disponível para novas missões."}
      />
    </div>
  );
}
