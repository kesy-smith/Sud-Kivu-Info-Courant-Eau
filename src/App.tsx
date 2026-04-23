import { useState, useEffect, useMemo } from 'react';
import { Droplets, Zap, MapPin, Clock, Plus, Search, RotateCw, LogIn, LogOut, User, Globe, LayoutDashboard, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Report, ResourceType, StatusType, NEIGHBORHOODS } from './types';
import { auth, db, signIn, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterArea, setFilterArea] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Dark mode side effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Auth state
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // Sync with Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'reports'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addReport = async (type: ResourceType, status: StatusType, location: string, comment?: string) => {
    if (!user) {
      alert("Veuillez vous connecter pour publier un rapport.");
      return;
    }

    try {
      const reportData: any = {
        type,
        status,
        location,
        timestamp: Date.now(),
        userId: user.uid
      };
      
      if (comment && comment.trim()) {
        reportData.comment = comment.trim();
      }
      
      await addDoc(collection(db, 'reports'), reportData);
      setShowForm(false);
    } catch (e) {
      handleFirestoreError(e, 'create', '/reports');
    }
  };

  const filteredReports = useMemo(() => {
    if (!filterArea) return reports;
    return reports.filter(r => r.location.toLowerCase().includes(filterArea.toLowerCase()));
  }, [reports, filterArea]);

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page p-0 sm:p-4 transition-colors duration-200">
      <div className="w-full max-w-5xl h-full sm:h-[800px] bg-bg-card sm:rounded-2xl shadow-2xl border border-border-main overflow-hidden flex flex-col transition-colors duration-200">
        {/* Header */}
        <header className="bg-primary-blue text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-lg relative z-10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg text-white">
              <Globe size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase leading-tight">Sud-Kivu Info</h1>
              <p className="text-[10px] opacity-80 uppercase font-bold tracking-widest italic">Eau & Électricité en temps réel</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all border border-white/20 shadow-inner"
              title={isDarkMode ? "Passer au mode clair" : "Passer au mode sombre"}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {!user ? (
              <button 
                onClick={signIn}
                className="bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 border border-white/20 shadow-inner"
              >
                <LogIn size={14} /> Connexion
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-[10px] font-bold opacity-70 truncate max-w-[100px] uppercase">{user.email?.split('@')[0]}</span>
                <button 
                  onClick={() => signOut(auth)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all border border-white/20 shadow-inner"
                  title="Déconnexion"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all border border-white/20 shadow-inner"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-grow overflow-hidden flex flex-col lg:grid lg:grid-cols-[380px_1fr] bg-bg-page/50 transition-colors">
          
          {/* Left Panel: Controls */}
          <aside className="lg:border-r border-border-main overflow-y-auto p-6 space-y-6 bg-bg-card shrink-0 transition-colors">
            {/* Quick Reporting Section */}
            <section className="space-y-4">
              <h2 className="text-[11px] font-black text-text-muted uppercase tracking-[0.1em] flex items-center gap-2">
                <LayoutDashboard size={14} /> Signalement Rapide
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <QuickButton 
                  label="Pas d'eau" 
                  icon="💧" 
                  onClick={() => addReport('water', 'cut', 'Ma zone')}
                  variant="water-cut"
                />
                <QuickButton 
                  label="Eau Rétablie" 
                  icon="💧✅" 
                  onClick={() => addReport('water', 'restored', 'Ma zone')}
                  variant="water-ok"
                />
                <QuickButton 
                  label="Coupure" 
                  icon="⚡" 
                  onClick={() => addReport('electricity', 'cut', 'Ma zone')}
                  variant="power-cut"
                />
                <QuickButton 
                  label="Courant OK" 
                  icon="⚡✅" 
                  onClick={() => addReport('electricity', 'restored', 'Ma zone')}
                  variant="power-ok"
                />
              </div>
            </section>

            {/* Neighborhood Choice */}
            <section className="space-y-4">
              <h2 className="text-[11px] font-black text-text-muted uppercase tracking-[0.1em] flex items-center gap-2">
                <MapPin size={14} /> Votre Quartier
              </h2>
              <div className="bg-bg-page border border-border-main rounded-xl p-4 shadow-inner transition-colors">
                <select 
                  className="w-full bg-bg-card border border-border-main text-text-main rounded-lg p-3 text-sm font-semibold focus:ring-2 focus:ring-primary-blue shadow-sm outline-none transition-colors"
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                >
                  <option value="">Tous les quartiers</option>
                  {NEIGHBORHOODS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Storage Info Card */}
            <section className="bg-blue-50/10 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 border-dashed rounded-xl p-6 text-center">
              <p className="text-[11px] text-blue-500 dark:text-blue-400 font-medium leading-relaxed uppercase tracking-wider">
                Les données sont synchronisées <br/> en temps réel avec la communauté.
              </p>
            </section>
          </aside>

          {/* Right Panel: Feed */}
          <section className="flex flex-col overflow-hidden p-6 gap-4 bg-bg-page/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <h2 className="text-[11px] font-black text-text-muted uppercase tracking-[0.1em] flex items-center gap-2">
                <Clock size={14} /> Dernières Mises à Jour
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                <input 
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full bg-bg-card border border-border-main text-text-main rounded-lg py-2 pl-9 pr-4 text-xs font-medium shadow-sm focus:ring-2 focus:ring-primary-blue outline-none transition-all"
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-border-main">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-blue"></div>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-20 bg-bg-card rounded-2xl border border-dashed border-border-main">
                    <p className="text-sm font-bold text-text-muted uppercase tracking-tighter">Aucun rapport pour l'instant</p>
                  </div>
                ) : (
                  filteredReports.map((report) => (
                    <motion.div
                      key={report.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group bg-bg-card p-4 rounded-r-xl border-l-4 border-border-main shadow-sm flex items-center justify-between transition-all hover:translate-x-1 ${
                        report.type === 'water' ? 'border-l-primary-blue' : 'border-l-primary-amber'
                      }`}
                    >
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-text-main leading-none group-hover:text-primary-blue transition-colors uppercase">
                          {report.location}
                        </h4>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
                            {report.type === 'water' ? 'EAU' : 'ÉLECTRICITÉ'} • 
                            <span className="ml-1 bg-bg-page px-1.5 py-0.5 rounded text-[9px] text-text-muted transition-colors">
                              {report.comment ? report.comment : 'NORMAL'}
                            </span>
                          </p>
                        </div>
                        <p className="text-[10px] font-black text-text-muted/60 italic">
                          Il y a {getTimeAgo(report.timestamp)}
                        </p>
                      </div>
                      
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm border transition-colors ${
                        report.status === 'cut' 
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30' 
                          : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30'
                      }`}>
                        {report.status === 'cut' ? 'Coupure' : 'Rétabli'}
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="shrink-0 bg-bg-page border-t border-border-main p-4 px-8 flex justify-between items-center sm:text-left text-center transition-colors">
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">📈 <strong className="text-text-main transition-colors">{reports.length}</strong> Rapports</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 border-l border-border-main pl-6 transition-colors">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">📍 <strong className="text-text-main transition-colors">{new Set(reports.map(r => r.location)).size}</strong> Quartiers</span>
            </div>
          </div>
          <p className="hidden sm:block text-[9px] font-bold text-text-muted uppercase tracking-widest">
            © 2026 Sud-Kivu Kesy Community • Mode Temps-Réel
          </p>
          {!user && (
            <button 
              onClick={signIn}
              className="bg-text-main text-bg-card px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              Publier
            </button>
          )}
        </footer>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showForm && (
          <ReportModal 
            onClose={() => setShowForm(false)} 
            onSubmit={addReport} 
          />
        )}
      </AnimatePresence>

      {/* FAB for Mobile */}
      {user && (
        <button 
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-6 lg:hidden w-16 h-16 bg-primary-blue text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20 border-4 border-bg-card"
        >
          <Plus size={32} />
        </button>
      )}
    </div>
  );
}

function QuickButton({ label, icon, onClick, variant }: { label: string, icon: string, onClick: () => void, variant: string }) {
  const styles = {
    'water-cut': 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30',
    'water-ok': 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
    'power-cut': 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30',
    'power-ok': 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
  }[variant] || 'bg-bg-page text-text-main border-border-main';

  return (
    <button 
      onClick={onClick}
      className={`${styles} border p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 hover:shadow-md h-24`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-center">{label}</span>
    </button>
  );
}

function ReportModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (type: ResourceType, status: StatusType, location: string, comment?: string) => void }) {
  const [type, setType] = useState<ResourceType>('water');
  const [status, setStatus] = useState<StatusType>('cut');
  const [location, setLocation] = useState('');
  const [comment, setComment] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-bg-card w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transition-colors"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-primary-blue text-white p-6 flex justify-between items-center">
          <h2 className="text-lg font-black uppercase tracking-tight">Nouveau rapport</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors leading-none text-2xl">×</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-2">
            <button 
              className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-black text-xs ${type === 'water' ? 'border-primary-blue bg-blue-50 dark:bg-blue-900/20 text-primary-blue dark:text-blue-400' : 'border-border-main bg-bg-page text-text-muted'}`}
              onClick={() => setType('water')}
            >
              💧 EAU
            </button>
            <button 
              className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-black text-xs ${type === 'electricity' ? 'border-primary-amber bg-amber-50 dark:bg-amber-900/20 text-primary-amber dark:text-amber-400' : 'border-border-main bg-bg-page text-text-muted'}`}
              onClick={() => setType('electricity')}
            >
              ⚡ COURANT
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              className={`p-3 rounded-xl border-2 transition-all font-black text-xs ${status === 'cut' ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'border-border-main bg-bg-page text-text-muted'}`}
              onClick={() => setStatus('cut')}
            >
              COUPURE
            </button>
            <button 
              className={`p-3 rounded-xl border-2 transition-all font-black text-xs ${status === 'restored' ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'border-border-main bg-bg-page text-text-muted'}`}
              onClick={() => setStatus('restored')}
            >
              RETOUR
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Quartier</label>
            <select 
              className="w-full bg-bg-page border border-border-main text-text-main rounded-xl p-3 text-sm font-bold shadow-inner focus:ring-2 focus:ring-primary-blue outline-none transition-colors"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {NEIGHBORHOODS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 ml-1">Commentaire</label>
            <textarea 
              className="w-full bg-bg-page border border-border-main text-text-main rounded-xl p-3 h-20 resize-none text-xs font-medium shadow-inner focus:ring-2 focus:ring-primary-blue outline-none transition-colors"
              placeholder="Ex: Prévu toute la journée..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <button 
            className="w-full bg-primary-blue text-white rounded-xl py-4 font-black uppercase tracking-widest disabled:opacity-50 shadow-lg active:scale-95 transition-all text-xs"
            disabled={!location}
            onClick={() => onSubmit(type, status, location, comment)}
          >
            Publier le Rapport
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}



