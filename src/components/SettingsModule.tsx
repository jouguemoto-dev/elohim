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
    <div className="max-w-4xl mx-auto space-y-8 pb-12 px-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Preferências</h2>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-[0.3em] mt-1">Configurações globais</p>
        </div>
        
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-emerald-500/20"
            >
              <CheckCircle2 size={14} />
              Sincronizado
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Identity Section */}
        <section className="bg-zinc-950 rounded-xl p-8 border border-zinc-900 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-zinc-600">
            <Building2 size={18} />
            <h3 className="text-[9px] font-bold uppercase tracking-[0.3em]">Identidade Institucional</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 px-0.5">Designação da Igreja</label>
                <input 
                  required
                  value={settings.name}
                  onChange={e => setSettings({...settings, name: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-sm text-white border border-zinc-800 focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="Nome oficial"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 px-0.5">Localização Física</label>
                <input 
                  value={settings.address}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-sm text-white border border-zinc-800 focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="Endereço completo"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 px-0.5 flex items-center gap-2">
                <ImageIcon size={12} /> Logotipo
              </label>
              <FileUploader 
                onUpload={(files) => {
                  if (files.length > 0) setSettings({...settings, logoUrl: files[0].url});
                }}
                accept="image/*"
              />
              {settings.logoUrl && (
                <div className="mt-4 relative group inline-block">
                  <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                    <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto rounded shadow-xl" referrerPolicy="no-referrer" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setConfirmModal({ isOpen: true, id: 'logo', type: 'logo' })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded shadow-lg scale-0 group-hover:scale-100 transition-all hover:bg-red-600"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Contact & Social Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-zinc-950 rounded-xl p-8 border border-zinc-900 shadow-xl space-y-6">
            <div className="flex items-center gap-3 text-zinc-600">
              <Phone size={18} />
              <h3 className="text-[9px] font-bold uppercase tracking-[0.3em]">Comunicação</h3>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={16} />
                <input 
                  type="email"
                  value={settings.email}
                  onChange={e => setSettings({...settings, email: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-lg text-sm text-white border border-zinc-800 focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="Email oficial"
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={16} />
                <input 
                  type="tel"
                  value={settings.phone}
                  onChange={e => setSettings({...settings, phone: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-lg text-sm text-white border border-zinc-800 focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </section>

          <section className="bg-zinc-950 rounded-xl p-8 border border-zinc-900 shadow-xl space-y-6">
            <div className="flex items-center gap-3 text-zinc-600">
              <Instagram size={18} />
              <h3 className="text-[9px] font-bold uppercase tracking-[0.3em]">Redes Sociais</h3>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={16} />
                <input 
                  value={settings.socialMedia?.instagram}
                  onChange={e => setSettings({...settings, socialMedia: {...settings.socialMedia, instagram: e.target.value}})}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-lg text-sm text-white border border-zinc-800 focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="Instagram"
                />
              </div>
              <div className="relative group">
                <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={16} />
                <input 
                  value={settings.socialMedia?.facebook}
                  onChange={e => setSettings({...settings, socialMedia: {...settings.socialMedia, facebook: e.target.value}})}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-lg text-sm text-white border border-zinc-800 focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="Facebook"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Financial & Announcements */}
        <section className="bg-zinc-950 rounded-xl p-8 border border-zinc-900 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-zinc-600">
            <Wallet size={18} />
            <h3 className="text-[9px] font-bold uppercase tracking-[0.3em]">Operacional & Avisos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 px-0.5 flex items-center gap-2">
                <DollarSign size={12} /> Chave PIX
              </label>
              <input 
                value={settings.pixKey}
                onChange={e => setSettings({...settings, pixKey: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-sm text-white border border-zinc-800 focus:border-zinc-700 outline-none transition-all font-mono placeholder:text-zinc-700"
                placeholder="Identificador PIX"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 px-0.5 flex items-center gap-2">
                <Link size={12} /> URL Pública
              </label>
              <input 
                value={settings.publicUrl}
                onChange={e => setSettings({...settings, publicUrl: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-sm text-white border border-zinc-800 focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-700"
                placeholder="https://sua-igreja.app.run.app"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 px-0.5 flex items-center gap-2">
              <Bell size={12} /> Comunicado de Painel
            </label>
            <input 
              value={settings.announcement}
              onChange={e => setSettings({...settings, announcement: e.target.value})}
              className="w-full px-4 py-3 bg-zinc-900 rounded-lg text-sm text-white border border-zinc-800 focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-700"
              placeholder="Mensagem em destaque"
            />
          </div>
        </section>

        {/* Event Types Section */}
        <section className="bg-zinc-950 rounded-xl p-8 border border-zinc-900 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-zinc-600">
            <Tags size={18} />
            <h3 className="text-[9px] font-bold uppercase tracking-[0.3em]">Taxonomia de Eventos</h3>
          </div>

          <div className="space-y-6">
            <div className="flex gap-2">
              <input 
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-700"
                placeholder="Nova categoria..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEventType())}
              />
              <button 
                type="button"
                onClick={handleAddEventType}
                className="px-6 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-all font-bold text-[10px] uppercase tracking-widest"
              >
                Adicionar
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {eventTypes.map(type => (
                <div 
                  key={type.id} 
                  className="group flex items-center justify-between px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 truncate group-hover:text-white transition-colors">{type.name}</span>
                  <button 
                    type="button"
                    onClick={() => setConfirmModal({ isOpen: true, id: type.id!, type: 'eventType' })}
                    className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={isSaving}
            className="bg-white text-black px-10 py-3 rounded-lg flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin text-black" size={16} /> : <Save size={16} />}
            {isSaving ? 'Salvando...' : 'Salvar Preferências'}
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
