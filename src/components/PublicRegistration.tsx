import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  MapPin, 
  Clock, 
  CreditCard, 
  Users, 
  Calendar,
  AlertTriangle,
  ArrowRight,
  User,
  Phone,
  Droplet,
  FileText,
  ShieldCheck,
  Map,
  X
} from 'lucide-react';
import { churchService } from '../services/churchService';
import { ChurchEvent, Attachment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FileUploader from './FileUploader';
import { cn } from '../lib/utils';

export default function PublicRegistration({ publicId }: { publicId: string }) {
  const [event, setEvent] = useState<ChurchEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registrantName, setRegistrantName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // New logic for minors
  const [birthDate, setBirthDate] = useState<string>('');
  const [isMinor, setIsMinor] = useState(false);
  const [guardianAuth, setGuardianAuth] = useState<Attachment | null>(null);
  const [showModel, setShowModel] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      try {
        const data = await churchService.getEventByPublicId(publicId);
        if (data) {
          setEvent(data);
        } else {
          setError('Evento não encontrado ou link expirado.');
        }
      } catch (e) {
        setError('Ocorreu um erro ao carregar o evento.');
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [publicId]);

  useEffect(() => {
    if (birthDate) {
      const age = differenceInYears(new Date(), new Date(birthDate));
      setIsMinor(age < 18);
    } else {
      setIsMinor(false);
    }
  }, [birthDate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!event) return;

    if (isMinor && !guardianAuth) {
      alert('Para menores de idade, a carta de autorização assinada é obrigatória.');
      return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    
    try {
      const regData = {
        eventId: event.id!,
        name,
        email: (formData.get('email') as string) || '',
        phone: (formData.get('phone') as string) || '',
        cpf: (formData.get('cpf') as string) || '',
        address: (formData.get('address') as string) || '',
        birthDate: (formData.get('birthDate') as string) || '',
        isMinor: isMinor,
        isMember: formData.get('isMember') === 'sim',
        guardianAuthorization: guardianAuth || null,
        emergencyContacts: isMinor ? {
          name1: (formData.get('emergencyName1') as string) || '',
          phone1: (formData.get('emergencyPhone1') as string) || '',
          name2: (formData.get('emergencyName2') as string) || '',
          phone2: (formData.get('emergencyPhone2') as string) || '',
        } : null,
        bloodType: (formData.get('bloodType') as string) || null,
        allergies: (formData.get('allergies') as string) || null,
        observations: (formData.get('observations') as string) || null,
        status: 'pending' as const,
        amountPaid: 0,
        updatedAt: new Date().toISOString(),
      };

      await churchService.addRegistration(regData);
      setRegistrantName(name);
      setSubmitted(true);
    } catch (e: any) {
      console.error("Submission error:", e);
      let errorMsg = 'Verifique sua conexão e tente novamente.';
      if (e.message && e.message.includes('Quota exceeded')) {
        errorMsg = 'Limite de armazenamento excedido. Tente reduzir o tamanho do anexo.';
      } else if (e.message) {
        try {
          const parsed = JSON.parse(e.message);
          errorMsg = parsed.error || errorMsg;
        } catch {
          errorMsg = e.message;
        }
      }
      alert('Erro ao realizar inscrição: ' + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const AuthorizationModel = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-zinc-900 rounded-[3rem] p-10 border border-white/10 shadow-3xl overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/5 text-white rounded-2xl border border-white/10">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Modelo de Autorização</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">Imprima ou transcreva este documento</p>
            </div>
          </div>
          <button 
            onClick={() => setShowModel(false)}
            className="p-3 bg-white/5 text-zinc-500 hover:text-white rounded-2xl border border-white/5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-black/40 p-10 rounded-[2rem] border border-white/5 text-zinc-300 text-xs leading-relaxed space-y-6 font-medium font-serif italic">
          <p className="text-center font-black uppercase text-white tracking-[0.3em] mb-10 not-italic font-sans">TERMO DE AUTORIZAÇÃO DE PARTICIPAÇÃO</p>
          
          <p>
            Eu, ____________________________________________________________________, 
            portador do RG nº _______________________ e CPF nº _______________________, 
            na qualidade de progenitor / responsável legal, AUTORIZO o(a) menor 
            <span className="text-white font-black underline mx-1">{registrantName || '[NOME DO INSCRITO]'}</span>, 
            a participar do evento <span className="text-white font-black mx-1">{event?.title}</span>, 
            a realizar-se na data de <span className="text-white font-black mx-1">{event ? format(new Date(event.startDate), 'dd/MM/yyyy') : '[DATA]'}</span>.
          </p>

          <p>
            Declaro estar ciente da programação e das normas do evento, responsabilizando-me por quaisquer danos diretos 
            ou indiretos que o referido menor venha a causar a terceiros ou ao patrimônio da organização. 
            Autorizo ainda o uso de imagem e voz para fins de divulgação ministerial.
          </p>

          <p className="pt-10 text-center">
            _____________________________________________________<br />
            Assinatura do Responsável Legal
          </p>
          
          <p className="text-center italic opacity-60">
            {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="mt-10 flex gap-4">
          <button 
             onClick={() => window.print()}
             className="flex-1 py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-3"
          >
            <FileText size={18} />
            Imprimir Termo
          </button>
          <button 
             onClick={() => setShowModel(false)}
             className="flex-1 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
          >
            Fechar Janela
          </button>
        </div>
      </motion.div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-r-2 border-white mx-auto mb-6 shadow-2xl"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">Estabelecendo Conexão Segura...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 p-10 rounded-[2.5rem] shadow-2xl border border-white/5 text-center">
          <AlertTriangle size={56} className="text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Falha de Protocolo</h2>
          <p className="text-zinc-500 mb-10 text-xs leading-relaxed uppercase tracking-widest font-bold">{error}</p>
          <a href="/" className="inline-block px-10 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-2xl active:scale-95">Retornar ao Terminal</a>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900 p-12 rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,1)] text-center border border-emerald-500/10 relative overflow-hidden"
        >
          {/* Success Decoration */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-[100px]" />
          
          <div className="relative">
            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl border border-emerald-500/20 shadow-emerald-500/10">
              <CheckCircle2 size={48} />
            </div>
            
            <p className="text-[11px] font-black uppercase tracking-[0.6em] text-emerald-500 mb-6 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">Inscrição Validada</p>
            
            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter leading-tight">Parabéns!</h2>
            
            <p className="text-sm text-zinc-400 mb-10 leading-relaxed font-bold">
               Sua inscrição para o evento <strong className="text-white">{event.title}</strong> foi concluída com sucesso.
            </p>

            <div className="p-8 bg-black/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] mb-12 space-y-4">
               <div>
                  <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-1">Participante</p>
                  <p className="text-lg font-bold text-white tracking-tight">{registrantName}</p>
               </div>
               <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest bg-emerald-500/5 py-2 px-4 rounded-full border border-emerald-500/10 inline-block">
                  Aguardamos você!
               </p>
            </div>

            <button 
              onClick={() => {
                setSubmitted(false);
                setRegistrantName('');
              }}
              className="w-full py-5 bg-emerald-500 text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-emerald-400 transition-all active:scale-[0.98]"
            >
              Realizar Nova Inscrição
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col items-center">
      {/* Dynamic Background Personalization */}
      {event.imageUrl && (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <img 
            src={event.imageUrl} 
            alt="" 
            className="w-full h-full object-cover blur-[100px] scale-125"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      <div className="max-w-5xl w-full py-16 px-6 relative z-10">
        {event.imageUrl ? (
          <div className="mb-12 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 bg-zinc-900 relative group">
            <div className="h-72 sm:h-[450px] relative">
              <img 
                src={event.imageUrl} 
                alt={event.title} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-80"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.parentElement) target.parentElement.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-10 sm:p-16">
                <div className="flex flex-col gap-3">
                  <span className="self-start px-4 py-1.5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-xl shadow-2xl">{event.type}</span>
                  <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">{event.title}</h1>
                  <p className="text-zinc-500 font-black uppercase text-[10px] tracking-[0.4em] flex items-center gap-3 mt-2">
                    <span className="w-12 h-px bg-zinc-800" />
                    Protocolo de Inscrição Oficial
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-black rounded-[2rem] mb-6 shadow-2xl">
              <Calendar size={32} />
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tighter">{event.title}</h1>
            <p className="text-zinc-500 font-black uppercase text-[10px] tracking-[0.4em]">Protocolo de Inscrição Oficial</p>
          </div>
        )}

        {showModel && <AuthorizationModel />}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start">
          {/* Sidebar / Info */}
          <div className="space-y-6">
            <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/5">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-8 border-b border-white/5 pb-4">Parâmetros Detalhados</h3>
               
               <div className="space-y-8">
                 <div className="flex gap-4">
                    <div className="shrink-0 p-3 bg-white/5 text-zinc-500 rounded-2xl border border-white/5"><Clock size={20} /></div>
                    <div>
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-2">Janela de Horário</p>
                      <p className="text-sm font-black text-white tracking-tight">{format(new Date(event.startDate), 'HH:mm')} Horas</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="shrink-0 p-3 bg-white/5 text-zinc-500 rounded-2xl border border-white/5"><MapPin size={20} /></div>
                    <div>
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-2">Coordenada Geográfica</p>
                      <p className="text-sm font-black text-white tracking-tight leading-tight">{event.location}</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="shrink-0 p-3 bg-white text-black rounded-2xl shadow-white/10 shadow-2xl"><CreditCard size={20} /></div>
                    <div>
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-2">Custo Operacional</p>
                      <p className="text-2xl font-black text-white tracking-tighter leading-none">R$ {event.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                 </div>
               </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white text-black shadow-2xl relative overflow-hidden group border border-white/20 hover:bg-zinc-200 transition-all">
               <div className="absolute top-0 right-0 w-40 h-40 bg-black/5 rounded-full -mr-20 -mt-20 blur-3xl opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/40 mb-4">Nota da Organização</p>
               <p className="text-xs font-bold leading-relaxed relative z-10 italic">"{event.description || 'Prepare-se para um momento precioso em comunhão e edificação!'}"</p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-zinc-900/40 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white/5 flex flex-col gap-10">
              <div className="space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 border-b border-white/5 pb-4">Identificação Individual</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">Designação Completa *</label>
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={20} />
                      <input 
                        required name="name" 
                        onChange={(e) => setRegistrantName(e.target.value)}
                        placeholder="Identifique-se conforme documento oficial" 
                        className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-800 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">E-mail de Contato *</label>
                    <div className="relative group">
                      <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={20} />
                      <input 
                        required type="email" name="email" 
                        placeholder="exemplo@email.com" 
                        className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-800 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">CPF *</label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={20} />
                      <input 
                        required name="cpf" 
                        placeholder="000.000.000-00" 
                        className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-800 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">Endereço de Residência *</label>
                  <div className="relative group">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={20} />
                    <input 
                      required name="address" 
                      placeholder="Rua, Número, Bairro, Cidade - Estado" 
                      className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-800 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">Data de Nascimento *</label>
                    <div className="relative group">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={20} />
                      <input 
                        required type="date" name="birthDate" 
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all [color-scheme:dark] font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">Terminal Móvel (WhatsApp) *</label>
                    <div className="relative group">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-white transition-colors" size={20} />
                      <input 
                        required name="phone" 
                        placeholder="(00) 00000-0000" 
                        className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-800 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">Filiado à Instituição?</label>
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                      <label className="flex-1 cursor-pointer">
                        <input type="radio" name="isMember" value="sim" className="peer hidden" defaultChecked />
                        <div className="h-10 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-[0.3em] peer-checked:bg-white peer-checked:text-black text-zinc-600 transition-all">Membro</div>
                      </label>
                      <label className="flex-1 cursor-pointer">
                        <input type="radio" name="isMember" value="nao" className="peer hidden" />
                        <div className="h-10 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-[0.3em] peer-checked:bg-white peer-checked:text-black text-zinc-600 transition-all">Visitante</div>
                      </label>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isMinor && (
                    <motion.div 
                      key="minor-section"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-10 overflow-hidden"
                    >
                      <div className="space-y-6 pt-4">
                        <div className="flex items-center justify-between border-b border-rose-500/20 pb-4">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">Proteção de Menoridade</h4>
                           <AlertTriangle size={14} className="text-rose-500 animate-pulse" />
                        </div>
                        
                        <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-3xl space-y-4">
                           <p className="text-[10px] text-rose-200/60 font-medium leading-relaxed">
                             Identificamos que o participante é menor de idade. Para sua segurança e conformidade legal, é obrigatório o envio da carta de autorização assinada pelo responsável.
                           </p>
                           <button 
                             type="button"
                             onClick={() => setShowModel(true)}
                             className="text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-2 hover:gap-3 transition-all"
                           >
                              Acessar Modelo de Autorização <ArrowRight size={12} />
                           </button>
                        </div>

                        <FileUploader 
                          label="Upload da Autorização Firmada (PDF/JPG)"
                          maxFiles={1}
                          maxSize={0.3}
                          onUpload={(files) => setGuardianAuth(files[0] || null)}
                        />

                        <div className="space-y-8 pt-4">
                          <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">Contatos de Emergência (Requisitado 02)</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 px-1">Nome do Contato 01 *</label>
                                <input required={isMinor} name="emergencyName1" placeholder="Nome Completo" className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20 transition-all font-bold" />
                             </div>
                             <div className="space-y-3">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 px-1">Telefone do Contato 01 *</label>
                                <input required={isMinor} name="emergencyPhone1" placeholder="(00) 00000-0000" className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20 transition-all font-mono font-bold" />
                             </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 px-1">Nome do Contato 02 *</label>
                                <input required={isMinor} name="emergencyName2" placeholder="Nome Completo" className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20 transition-all font-bold" />
                             </div>
                             <div className="space-y-3">
                                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 px-1">Telefone do Contato 02 *</label>
                                <input required={isMinor} name="emergencyPhone2" placeholder="(00) 00000-0000" className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-white/20 transition-all font-mono font-bold" />
                             </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 border-b border-white/5 pb-4">Setor Biomédico & Notas</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                   <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">Tipagem Sanguínea</label>
                    <select 
                      name="bloodType"
                      className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 outline-none focus:ring-2 focus:ring-white/10 transition-all appearance-none"
                    >
                      <option value="" className="bg-zinc-900">Não informado</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                        <option key={t} value={t} className="bg-zinc-900 font-mono">{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">Restrições / Alergias</label>
                    <input 
                      name="allergies" 
                      placeholder="Medicamentos ou substâncias..." 
                      className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all placeholder:text-zinc-800 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 px-1">Dossiê de Observações</label>
                  <textarea 
                    name="observations" 
                    rows={3}
                    placeholder="Informações críticas para salvaguarda e segurança ambiental..." 
                    className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-[2rem] text-sm text-white focus:ring-2 focus:ring-white/10 outline-none transition-all resize-none placeholder:text-zinc-800 font-bold"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button 
                  disabled={isSubmitting}
                  className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-r-2 border-black"></div>
                  ) : (
                    <>
                      Frentar Protocolo de Inscrição
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-2" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
