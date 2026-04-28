import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Plus, 
  Search, 
  LogOut, 
  Settings, 
  Menu, 
  X,
  CreditCard,
  Download,
  FileText,
  UserPlus,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { churchService } from './services/churchService';
import { ChurchSettings } from './types';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { differenceInHours, parseISO, isAfter } from 'date-fns';

// Modules
import Dashboard from './components/Dashboard';
import MembersModule from './components/MembersModule';
import EventsModule from './components/EventsModule';
import RegistrationsModule from './components/RegistrationsModule';
import SettingsModule from './components/SettingsModule';
import PublicRegistration from './components/PublicRegistration';
import AccessRequestsModule from './components/AccessRequestsModule';
import { AiAssistant } from './components/AiAssistant';

type Page = 'dashboard' | 'members' | 'events' | 'registrations' | 'settings' | 'access' | 'public-form';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessStatus, setAccessStatus] = useState<'loading' | 'approved' | 'pending' | 'denied' | 'none'>('loading');
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [settings, setSettings] = useState<ChurchSettings | null>(null);
  const [hasCheckedUpcoming, setHasCheckedUpcoming] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && !isSidebarOpen) setIsSidebarOpen(true);
      if (mobile && isSidebarOpen) setIsSidebarOpen(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Handle routing for public registration form
  const path = window.location.pathname;
  const pathSegments = path.split('/').filter(Boolean);
  const isPublicUrl = pathSegments[0] === 'inscrever';
  const eventPublicId = isPublicUrl ? pathSegments[1] : null;

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoginError(null);
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError("O popup de login foi bloqueado pelo seu navegador. Por favor, autorize popups ou abra o app em uma nova aba.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError("O login foi cancelado.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("Este domínio não está autorizado no Firebase. Acesse o Console do Firebase, vá em Autenticação > Configurações > Domínios Autorizados e adicione o domínio atual.");
      } else {
        setLoginError("Erro ao fazer login: " + (error.message || "Tente abrir em uma nova aba."));
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setAccessStatus('loading');
        try {
          const { status } = await churchService.checkAccess(u.email || '');
          setAccessStatus(status);
          
          if (status === 'none') {
            await churchService.requestAccess(u.email || '', u.displayName || 'Admin');
            setAccessStatus('pending');
          }
          
          if (status === 'approved') {
            const churchSettings = await churchService.getSettings();
            setSettings(churchSettings);

            // Seed requested event "Reunião Geral" if it doesn't exist
            const events = await churchService.getEvents();
            if (!events.some(e => e.title === 'Reunião Geral')) {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(19, 0, 0, 0);
              const tomorrowEnd = new Date(tomorrow);
              tomorrowEnd.setHours(21, 0, 0, 0);

              await churchService.addEvent({
                title: 'Reunião Geral',
                type: 'Culto',
                startDate: tomorrow.toISOString(),
                endDate: tomorrowEnd.toISOString(),
                location: 'Templo Principal',
                description: 'Reunião geral da igreja desenvolvida via solicitação IA.',
                price: 0,
                publicId: 'reuniao-geral-' + Math.random().toString(36).substring(2, 7)
              });
            }

            // Seed "Oficina" event type if it doesn't exist
            const eventTypes = await churchService.getEventTypes();
            if (!eventTypes.some(t => t.name === 'Oficina')) {
              await churchService.addEventType('Oficina');
            }
            
            // Only check upcoming events if we haven't already this session
            if (!hasCheckedUpcoming && events.length > 0) {
              const now = new Date();
              events.forEach(event => {
                const eventDate = parseISO(event.startDate);
                const hoursDiff = differenceInHours(eventDate, now);
                
                if (hoursDiff > 0 && hoursDiff <= 24 && isAfter(eventDate, now)) {
                  toast.info(
                    <div className="flex flex-col gap-1">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#050505]">Evento Próximo!</p>
                      <p className="text-sm font-black text-black">{event.title}</p>
                      <p className="text-[10px] text-zinc-500 font-medium">Inicia em aproximadamente {hoursDiff} horas.</p>
                      <button 
                        onClick={() => {
                          setActivePage('events');
                          toast.dismiss();
                        }}
                        className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors text-left"
                      >
                        Ver detalhes do evento →
                      </button>
                    </div>,
                    {
                      position: "top-right",
                      autoClose: 10000,
                      hideProgressBar: false,
                      closeOnClick: false,
                      pauseOnHover: true,
                      draggable: true,
                      style: {
                        borderRadius: '1.5rem',
                        background: 'white',
                        border: '1px solid rgba(0,0,0,0.05)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                      }
                    }
                  );
                }
              });
              setHasCheckedUpcoming(true);
            }
          }
        } catch (e) {
          console.error('Error during access check:', e);
          setAccessStatus('none');
        }
      } else {
        setAccessStatus('none');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [hasCheckedUpcoming]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050505] gap-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <div className="absolute inset-0 animate-pulse bg-white/5 blur-xl rounded-full"></div>
        </div>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] animate-pulse">Autenticando Camada de Segurança...</p>
      </div>
    );
  }

  // Gated Access Screen
  if (user && accessStatus !== 'approved' && !isPublicUrl) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-6 bg-black">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-12 text-center bg-zinc-950 rounded-[3rem] border border-zinc-900 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-amber-500/5 blur-[80px]" />
          
          <div className={cn(
            "mb-12 inline-flex items-center justify-center w-24 h-24 rounded-[2rem] border relative z-10 p-6 shadow-3xl transition-all duration-1000",
            accessStatus === 'pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse" : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          )}>
            {accessStatus === 'pending' ? <ShieldAlert size={40} /> : <X size={40} />}
          </div>

          <h1 className="text-3xl font-display font-medium mb-4 tracking-tight text-white">
            {accessStatus === 'pending' ? 'Solicitação em Análise' : 'Acesso Não Autorizado'}
          </h1>
          
          <p className="text-zinc-500 mb-12 font-sans text-sm leading-relaxed max-w-xs mx-auto">
            {accessStatus === 'pending' 
              ? `Olá ${user.displayName || 'usuário'}, sua solicitação foi enviada automaticamente para JOUGUEMOTO@GMAIL.COM. Por favor, aguarde a liberação do seu acesso.`
              : `Lamentamos, mas seu acesso ao painel Master Audit foi negado pelo administrador.`}
          </p>

          <div className="flex flex-col gap-4">
             <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-900 flex items-center justify-between">
                <div className="text-left">
                   <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest mb-1">Status do Registro</p>
                   <p className="text-[10px] font-mono font-bold text-zinc-400">{user.email}</p>
                </div>
                <div className={cn(
                   "w-2 h-2 rounded-full",
                   accessStatus === 'pending' ? "bg-amber-500" : "bg-rose-500"
                )} />
             </div>

             <button 
               onClick={logout}
               className="w-full py-4 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
             >
               Sair da Conta
             </button>
          </div>

          <div className="mt-12 pt-10 border-t border-zinc-900/50">
            <p className="text-[9px] text-zinc-800 font-black uppercase tracking-[0.4em] mb-4">Master Audit Security Gate</p>
            <ShieldCheck size={16} className="text-zinc-900 mx-auto" />
          </div>
        </motion.div>
      </div>
    );
  }

  // If it's a public registration link, don't show admin shell
  if (isPublicUrl && eventPublicId) {
    return <PublicRegistration publicId={eventPublicId} />;
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm p-10 text-center bg-zinc-900/50 backdrop-blur-xl rounded-[2.5rem] border border-zinc-800 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-24 bg-blue-500/10 blur-[60px]" />
          
          <div className="mb-10 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-zinc-800 border border-zinc-700 text-white shadow-2xl relative z-10 p-4">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} className="w-full h-full object-cover rounded-xl" alt="Logo" referrerPolicy="no-referrer" />
            ) : (
              <Users size={32} />
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">{settings?.name || 'Eclesia Manager'}</h1>
          <p className="text-zinc-500 mb-10 font-sans text-[10px] tracking-[0.2em] uppercase font-bold">Sistema de Gestão Eclesiástica</p>
          
          <button 
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-xl active:scale-95 group"
          >
            <Users size={18} className="group-hover:scale-110 transition-transform" />
            <span>Acessar Painel Admin</span>
          </button>
          
          {loginError && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold leading-relaxed text-left">
              {loginError}
            </div>
          )}
          
          <div className="mt-16 pt-8 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-loose">© 2026 Eclesia System<br/>Todos os direitos reservados.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: Page }) => (
      <button
      onClick={() => {
        setActivePage(id);
        if (isMobile) setIsSidebarOpen(false);
      }}
      className={cn(
        "flex items-center justify-between w-full px-6 py-3 transition-all font-sans text-[10px] font-bold uppercase tracking-[0.2em] group relative",
        activePage === id 
          ? "text-white" 
          : "text-zinc-600 hover:text-zinc-300"
      )}
    >
      <div className="flex items-center gap-4">
        <Icon size={14} className={cn("transition-transform", activePage === id && "scale-110")} />
        <span>{label}</span>
      </div>
      {activePage === id && (
         <motion.div layoutId="nav-pill" className="absolute left-0 w-1 h-4 bg-white rounded-r-full" />
      )}
    </button>
  );

  const BottomNavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: Page }) => (
    <button
      onClick={() => setActivePage(id)}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all",
        activePage === id ? "text-white" : "text-zinc-500"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all",
        activePage === id ? "bg-white/10" : "bg-transparent"
      )}>
        <Icon size={20} />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="h-screen flex bg-black overflow-hidden font-sans selection:bg-white selection:text-black relative">
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isMobile ? (isSidebarOpen ? '80%' : 0) : (isSidebarOpen ? 260 : 0), 
          opacity: isSidebarOpen ? 1 : (isMobile ? 0 : 1),
          x: isMobile && !isSidebarOpen ? '-100%' : 0
        }}
        className={cn(
          "bg-black border-r border-zinc-900/50 flex flex-col z-40 relative",
          isMobile && "fixed inset-y-0 left-0"
        )}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-10 pb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center p-2 shadow-inner">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} className="w-full h-full object-cover rounded-lg" alt="Logo" referrerPolicy="no-referrer" />
                ) : (
                  <Users size={20} />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-base font-display font-medium text-white truncate tracking-tight">
                  {settings?.name || 'Eclesia'}
                </span>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600">Manager</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <NavItem icon={BarChart3} label="Dashboard" id="dashboard" />
            <NavItem icon={Users} label="Membros" id="members" />
            <NavItem icon={Calendar} label="Eventos" id="events" />
            <NavItem icon={CreditCard} label="Inscritos" id="registrations" />
            {user?.email === 'jouguemoto@gmail.com' && (
              <NavItem icon={ShieldCheck} label="Acessos" id="access" />
            )}
            <NavItem icon={Settings} label="Ajustes" id="settings" />
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-zinc-900">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-zinc-900/50">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="w-8 h-8 rounded-lg" 
              alt={user.displayName || ''} 
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-white truncate">{user.displayName}</p>
            </div>
            <button onClick={logout} className="text-zinc-600 hover:text-white transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 flex items-center justify-between px-6 md:px-12 shrink-0 relative z-10">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-2xl text-zinc-500 transition-colors shadow-sm"
            >
              <Menu size={18} />
            </button>
            <div>
               <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em]">
                 Sistema de Gestão
               </h2>
               <p className="text-lg font-display font-medium text-white tracking-tight capitalize">{activePage}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="text-right hidden sm:block">
               <p className="text-[9px] uppercase tracking-[0.4em] text-zinc-700 font-black">Infra Estrutura</p>
               <p className="text-[10px] font-mono font-bold text-zinc-500">v1.2.4-stable</p>
             </div>
          </div>
        </header>

        <section className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 p-4 md:p-10 pb-32 md:pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="h-full max-w-7xl mx-auto"
              >
                {activePage === 'dashboard' && <Dashboard onNavigate={setActivePage} />}
                {activePage === 'members' && <MembersModule />}
                {activePage === 'events' && <EventsModule />}
                {activePage === 'registrations' && <RegistrationsModule />}
                {activePage === 'access' && <AccessRequestsModule />}
                {activePage === 'settings' && <SettingsModule />}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Bottom Nav for Mobile */}
        {isMobile && (
          <nav className="fixed bottom-0 inset-x-0 bg-black/80 backdrop-blur-xl border-t border-white/5 px-2 py-2 flex items-center justify-around z-20 pb-safe">
            <BottomNavItem icon={BarChart3} label="Dash" id="dashboard" />
            <BottomNavItem icon={Users} label="Membros" id="members" />
            <BottomNavItem icon={Calendar} label="Eventos" id="events" />
            <BottomNavItem icon={CreditCard} label="Inscritos" id="registrations" />
            <BottomNavItem icon={Settings} label="Ajustes" id="settings" />
          </nav>
        )}
      </main>
      <ToastContainer aria-label="Notificações do Sistema" />
      <AiAssistant />
    </div>
  );
}
