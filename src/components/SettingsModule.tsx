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
  Link,
  X
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
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12 pb-24 px-6 pt-4">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
           <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-1.5 block">Configuração de Core</span>
           <h2 className="text-3xl font-display font-medium text-white tracking-tight">Preferências</h2>
        </div>
        
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3 bg-white text-black px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white shadow-2xl"
            >
              <CheckCircle2 size={16} />
              Sincronizado
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <form onSubmit={handleSave} className="space-y-12">
        {/* Identity Section */}
        <section className="bg-black rounded-[2.5rem] p-10 border border-zinc-900 shadow-2xl space-y-8">
          <div className="flex items-center gap-4 text-zinc-700">
            <Building2 size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Identidade Institucional</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1">Designação da Igreja</label>
                <input 
                  required
                  value={settings.name}
                  onChange={e => setSettings({...settings, name: e.target.value})}
                  className="w-full px-5 py-4 bg-zinc-950 rounded-2xl text-sm text-white border border-zinc-900 focus:border-white outline-none transition-all placeholder:text-zinc-800"
                  placeholder="Nome oficial"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1">Localização Física</label>
                <input 
                  value={settings.address}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                  className="w-full px-5 py-4 bg-zinc-950 rounded-2xl text-sm text-white border border-zinc-900 focus:border-white outline-none transition-all placeholder:text-zinc-800"
                  placeholder="Endereço completo"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1 flex items-center gap-3">
                <ImageIcon size={14} /> Marca Institucional
              </label>
              <FileUploader 
                onUpload={(files) => {
                  if (files.length > 0) setSettings({...settings, logoUrl: files[0].url});
                }}
                accept="image/*"
              />
              {settings.logoUrl && (
                <div className="mt-6 relative group inline-block">
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-900 shadow-inner">
                    <img src={settings.logoUrl} alt="Logo" className="h-20 w-auto rounded-xl shadow-2xl" referrerPolicy="no-referrer" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setConfirmModal({ isOpen: true, id: 'logo', type: 'logo' })}
                    className="absolute -top-3 -right-3 bg-white text-black p-2 rounded-xl shadow-2xl scale-0 group-hover:scale-100 transition-all hover:bg-zinc-200"
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
          <section className="bg-black rounded-[2.5rem] p-10 border border-zinc-900 shadow-2xl space-y-8">
            <div className="flex items-center gap-4 text-zinc-700">
              <Phone size={20} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Comunicação</h3>
            </div>

            <div className="space-y-5">
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="email"
                  value={settings.email}
                  onChange={e => setSettings({...settings, email: e.target.value})}
                  className="w-full pl-14 pr-5 py-4 bg-zinc-950 rounded-2xl text-sm text-white border border-zinc-900 focus:border-white outline-none transition-all placeholder:text-zinc-800"
                  placeholder="Email oficial"
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type="tel"
                  value={settings.phone}
                  onChange={e => setSettings({...settings, phone: e.target.value})}
                  className="w-full pl-14 pr-5 py-4 bg-zinc-950 rounded-2xl text-sm text-white border border-zinc-900 focus:border-white outline-none transition-all placeholder:text-zinc-800"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </section>

          <section className="bg-black rounded-[2.5rem] p-10 border border-zinc-900 shadow-2xl space-y-8">
            <div className="flex items-center gap-4 text-zinc-700">
              <Instagram size={20} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Redes Sociais</h3>
            </div>

            <div className="space-y-5">
              <div className="relative group">
                <Instagram className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  value={settings.socialMedia?.instagram}
                  onChange={e => setSettings({...settings, socialMedia: {...settings.socialMedia, instagram: e.target.value}})}
                  className="w-full pl-14 pr-5 py-4 bg-zinc-950 rounded-2xl text-sm text-white border border-zinc-900 focus:border-white outline-none transition-all placeholder:text-zinc-800"
                  placeholder="Instagram"
                />
              </div>
              <div className="relative group">
                <Facebook className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-white transition-colors" size={18} />
                <input 
                  value={settings.socialMedia?.facebook}
                  onChange={e => setSettings({...settings, socialMedia: {...settings.socialMedia, facebook: e.target.value}})}
                  className="w-full pl-14 pr-5 py-4 bg-zinc-950 rounded-2xl text-sm text-white border border-zinc-900 focus:border-white outline-none transition-all placeholder:text-zinc-800"
                  placeholder="Facebook"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Financial & Announcements */}
        <section className="bg-black rounded-[2.5rem] p-10 border border-zinc-900 shadow-2xl space-y-8">
          <div className="flex items-center gap-4 text-zinc-700">
            <Wallet size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Operacional & Avisos</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1 flex items-center gap-3">
                <DollarSign size={14} /> Chave PIX
              </label>
              <input 
                value={settings.pixKey}
                onChange={e => setSettings({...settings, pixKey: e.target.value})}
                className="w-full px-5 py-4 bg-zinc-950 rounded-2xl text-sm text-white border border-zinc-900 focus:border-white outline-none transition-all font-mono placeholder:text-zinc-800"
                placeholder="Identificador PIX"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1 flex items-center gap-3">
                <Link size={14} /> URL Pública
              </label>
              <input 
                value={settings.publicUrl}
                onChange={e => setSettings({...settings, publicUrl: e.target.value})}
                className="w-full px-5 py-4 bg-zinc-950 rounded-2xl text-sm text-white border border-zinc-900 focus:border-white outline-none transition-all placeholder:text-zinc-800"
                placeholder="https://sua-igreja.app.run.app"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1 flex items-center gap-3">
              <Bell size={14} /> Comunicado Global
            </label>
            <input 
              value={settings.announcement}
              onChange={e => setSettings({...settings, announcement: e.target.value})}
              className="w-full px-5 py-4 bg-zinc-950 rounded-2xl text-sm text-white border border-zinc-900 focus:border-white outline-none transition-all placeholder:text-zinc-800"
              placeholder="Mensagem em destaque"
            />
          </div>
        </section>

        {/* Event Types Section */}
        <section className="bg-black rounded-[2.5rem] p-10 border border-zinc-900 shadow-2xl space-y-8">
          <div className="flex items-center gap-4 text-zinc-700">
            <Tags size={20} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Taxonomia de Eventos</h3>
          </div>

          <div className="space-y-8">
            <div className="flex gap-4">
              <input 
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="flex-1 px-5 py-4 bg-zinc-950 border border-zinc-900 rounded-2xl text-sm text-white focus:border-white outline-none transition-all placeholder:text-zinc-800"
                placeholder="Nova categoria..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEventType())}
              />
              <button 
                type="button"
                onClick={handleAddEventType}
                className="px-8 py-4 bg-white text-black rounded-2xl hover:bg-zinc-200 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
              >
                Adicionar
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {eventTypes.map(type => (
                <div 
                  key={type.id} 
                  className="group flex items-center justify-between px-4 py-3 bg-zinc-950 rounded-2xl border border-zinc-900 hover:border-white transition-all shadow-inner"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700 truncate group-hover:text-white transition-colors">{type.name}</span>
                  <button 
                    type="button"
                    onClick={() => setConfirmModal({ isOpen: true, id: type.id!, type: 'eventType' })}
                    className="text-zinc-800 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-1.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-12">
          <button 
            type="submit"
            disabled={isSaving}
            className="bg-white text-black px-12 py-5 rounded-[2rem] flex items-center gap-4 font-black text-[11px] uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-2xl disabled:opacity-50 active:scale-95"
          >
            {isSaving ? <Loader2 className="animate-spin text-black" size={20} /> : <Save size={20} />}
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
    </div>
  );
}
