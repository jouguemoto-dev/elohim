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
  UserPlus
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

type Page = 'dashboard' | 'members' | 'events' | 'registrations' | 'settings' | 'public-form';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
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
  const isPublicUrl = path.startsWith('/inscrever/');
  const eventPublicId = isPublicUrl ? path.split('/').pop() : null;

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
      } else {
        setLoginError("Erro ao fazer login: " + (error.message || "Tente abrir em uma nova aba."));
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const churchSettings = await churchService.getSettings();
        setSettings(churchSettings);
        
        // Only check upcoming events if we haven't already this session
        if (!hasCheckedUpcoming) {
          const events = await churchService.getEvents();
          const now = new Date();
          
          events.forEach(event => {
            const eventDate = parseISO(event.startDate);
            const hoursDiff = differenceInHours(eventDate, now);
            
            // Check if event starts in the next 24 hours and hasn't started yet
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
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activePage === 'settings', hasCheckedUpcoming]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#050505]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
        "flex items-center gap-4 w-full px-8 py-4 transition-all font-sans text-xs font-bold uppercase tracking-widest border-r-4 transition-all duration-300",
        activePage === id 
          ? "bg-white/5 text-white border-white shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" 
          : "text-zinc-500 hover:bg-white/2 border-transparent hover:text-zinc-300"
      )}
    >
      <Icon size={16} className={cn("transition-transform duration-300", activePage === id && "scale-110")} />
      <span>{label}</span>
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
    <div className="h-screen flex bg-transparent overflow-hidden font-sans selection:bg-white selection:text-black relative">
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
          width: isMobile ? (isSidebarOpen ? '80%' : 0) : (isSidebarOpen ? 280 : 0), 
          opacity: isSidebarOpen ? 1 : (isMobile ? 0 : 1),
          x: isMobile && !isSidebarOpen ? '-100%' : 0
        }}
        className={cn(
          "bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col z-40 relative",
          isMobile && "fixed inset-y-0 left-0"
        )}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-8 pb-10 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-2xl overflow-hidden border border-white/10 p-2">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} className="w-full h-full object-cover rounded-lg" alt="Logo" referrerPolicy="no-referrer" />
                ) : (
                  <Users size={20} />
                )}
              </div>
              <span className="text-xl font-bold text-white truncate tracking-tight flex-1">
                {settings?.name || 'Eclesia'}
              </span>
            </div>
          </div>

          <nav className="flex-1 py-8">
            <NavItem icon={BarChart3} label="Dashboard" id="dashboard" />
            <NavItem icon={Users} label="Membros" id="members" />
            <NavItem icon={Calendar} label="Eventos" id="events" />
            <NavItem icon={CreditCard} label="Inscritos" id="registrations" />
            <NavItem icon={Settings} label="Ajustes" id="settings" />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-white/5 border border-white/5 shadow-2xl backdrop-blur-md">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              className="w-10 h-10 rounded-xl border border-white/10" 
              alt={user.displayName || ''} 
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-zinc-500 truncate font-medium">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full px-5 py-3 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold text-[10px] uppercase tracking-widest"
          >
            <LogOut size={16} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between px-6 md:px-10 shrink-0 relative z-10">
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-white/5 rounded-xl text-zinc-500 transition-colors"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
              {activePage === 'dashboard' ? 'Overview' : 
               activePage === 'members' ? 'Membros' : 
               activePage === 'events' ? 'Cronograma' :
               activePage === 'registrations' ? 'Inscritos' :
               'Ajustes'}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="text-right hidden sm:block">
               <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-bold">Relatório Ativo</p>
               <p className="text-xs font-mono font-medium text-white/80">CORE v1.2.4</p>
             </div>
          </div>
        </header>

        <section className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto p-4 md:p-10 pb-32 md:pb-10">
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
    </div>
  );
}
