import React, { useRef } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Settings, 
  ShoppingCart, 
  Factory, 
  Clock,
  Trash2,
  Download,
  Upload,
  Zap,
  Cpu
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agents', label: 'Agentes IA', icon: Cpu },
    { id: 'engineering', label: 'Projetos / OPs', icon: Briefcase },
    { id: 'pcp', label: 'PCP', icon: Settings },
    { id: 'purchasing', label: 'Compras', icon: ShoppingCart },
    { id: 'production', label: 'Fábrica', icon: Factory },
    { id: 'timesheet', label: 'Apontamento', icon: Clock },
    { id: 'reports', label: 'Relatórios', icon: Zap },
  ];

  const handleResetSystem = () => {
    if(window.confirm("ZERAR TUDO?\n\nIsso vai apagar todos os projetos e deixar o sistema TOTALMENTE EM BRANCO.")) {
        localStorage.clear();
        window.location.reload();
    }
  };

  const handleExportData = () => {
      const getParsedItem = (key: string) => {
          const item = localStorage.getItem(key);
          if (!item) return null;
          try {
              return JSON.parse(item);
          } catch (e) {
              return item;
          }
      };

      const backupData = {
          projects: getParsedItem('metal_erp_projects'),
          processes: getParsedItem('production_processes'),
          history: getParsedItem('worktrack_history'),
          activeJobs: getParsedItem('worktrack_active_jobs'),
          employees: getParsedItem('worktrack_employees'),
          machines: getParsedItem('worktrack_machines'),
          version: '26.8',
          exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Zindra_Backup_v26.8_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const keysMap: Record<string, string> = {
            projects: 'metal_erp_projects',
            processes: 'production_processes',
            history: 'worktrack_history',
            activeJobs: 'worktrack_active_jobs',
            employees: 'worktrack_employees',
            machines: 'worktrack_machines'
        };
        Object.entries(keysMap).forEach(([dataKey, storageKey]) => {
            const value = data[dataKey];
            if (value !== undefined && value !== null) {
                localStorage.setItem(storageKey, typeof value === 'string' ? value : JSON.stringify(value));
            }
        });
        window.location.reload();
      } catch (err) {
        alert("Erro ao importar backup do sistema.");
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  return (
    <div className="w-64 bg-white h-screen flex flex-col shadow-xl fixed left-0 top-0 z-50 border-r border-slate-200 print:hidden">
      <div className="p-8 flex items-center gap-3">
        <div className="bg-teal-600 p-2 rounded-xl shadow-lg shadow-teal-100">
            <Zap className="text-white w-6 h-6" fill="currentColor" />
        </div>
        <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">Zindra<span className="text-teal-600">ERP</span></h1>
            <p className="text-[8px] font-black text-slate-400 tracking-widest uppercase mt-1">Smart Management</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-teal-500'} />
              <span className="font-extrabold text-sm uppercase tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-slate-100 space-y-4">
        <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExportData} title="Exportar backup do sistema" className="flex flex-col items-center p-3 rounded-xl border border-slate-200 text-slate-400 hover:bg-teal-50 hover:text-teal-600 text-[9px] font-bold uppercase tracking-wider transition-all"><Download size={16} className="mb-1"/> Salvar Backup</button>
            <button onClick={() => fileInputRef.current?.click()} title="Importar backup do sistema" className="flex flex-col items-center p-3 rounded-xl border border-slate-200 text-slate-400 hover:bg-teal-50 hover:text-teal-600 text-[9px] font-bold uppercase tracking-wider transition-all"><Upload size={16} className="mb-1"/> Restaurar</button>
        </div>
        <button onClick={handleResetSystem} className="w-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 p-4 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 transition-all uppercase tracking-widest border border-slate-200">
            <Trash2 size={16} /> ZERAR SISTEMA
        </button>
        <div className="text-center pt-2">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] animate-pulse">Build v.26.8</p>
        </div>
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
    </div>
  );
};