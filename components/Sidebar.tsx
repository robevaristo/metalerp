import React, { useRef } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  DraftingCompass, 
  Settings, 
  ShoppingCart, 
  Factory, 
  Clock,
  Trash2,
  Download,
  Upload
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'commercial', label: 'Comercial / OPs', icon: Briefcase },
    { id: 'engineering', label: 'Projetos', icon: DraftingCompass },
    { id: 'pcp', label: 'PCP', icon: Settings },
    { id: 'purchasing', label: 'Compras', icon: ShoppingCart },
    { id: 'production', label: 'Fábrica', icon: Factory },
    { id: 'timesheet', label: 'Apontamento', icon: Clock },
  ];

  const handleResetSystem = () => {
    if(window.confirm("ZERAR TUDO?\n\nIsso vai apagar todos os projetos e deixar o sistema TOTALMENTE EM BRANCO.\n\nDeseja continuar?")) {
        localStorage.setItem('metal_erp_projects', JSON.stringify([]));
        localStorage.setItem('production_processes', JSON.stringify([]));
        localStorage.setItem('worktrack_history', JSON.stringify([]));
        localStorage.setItem('worktrack_active_jobs', JSON.stringify([]));
        window.location.reload();
    }
  };

  const handleExportData = () => {
      const data = {
          projects: localStorage.getItem('metal_erp_projects'),
          processes: localStorage.getItem('production_processes'),
          history: localStorage.getItem('worktrack_history'),
          activeJobs: localStorage.getItem('worktrack_active_jobs'),
          employees: localStorage.getItem('worktrack_employees'),
          machines: localStorage.getItem('worktrack_machines'),
          version: '2.2',
          date: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MetalERP_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              
              if (!json.version) {
                  alert("Arquivo de backup inválido ou antigo.");
                  return;
              }

              if(window.confirm(`Restaurar backup de ${new Date(json.date).toLocaleDateString()}?\n\nISSO SUBSTITUIRÁ OS DADOS ATUAIS DESTE NAVEGADOR.`)) {
                  if (json.projects) localStorage.setItem('metal_erp_projects', json.projects);
                  if (json.processes) localStorage.setItem('production_processes', json.processes);
                  if (json.history) localStorage.setItem('worktrack_history', json.history);
                  if (json.activeJobs) localStorage.setItem('worktrack_active_jobs', json.activeJobs);
                  if (json.employees) localStorage.setItem('worktrack_employees', json.employees);
                  if (json.machines) localStorage.setItem('worktrack_machines', json.machines);
                  
                  alert("Sistema restaurado com sucesso!");
                  window.location.reload();
              }
          } catch (error) {
              alert("Erro ao ler arquivo de backup.");
              console.error(error);
          }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col shadow-xl fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        {/* Logo Simulation - Gear/Arrow Concept */}
        <div className="relative w-8 h-8 flex-shrink-0">
             <Settings className="text-slate-400 absolute top-0 left-0 w-8 h-8" strokeWidth={1.5} />
             <div className="absolute bottom-0 right-0 bg-blue-500 w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900">
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-white transform rotate-45 mb-[1px] ml-[1px]"></div>
             </div>
        </div>
        
        <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none text-white">MetalERP</h1>
            <p className="text-[9px] font-bold text-slate-400 tracking-widest mt-1">SMART METAL MANAGEMENT</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      {/* Hidden File Input for Import */}
      <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".json" 
          onChange={handleFileChange} 
      />

      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="grid grid-cols-2 gap-2">
            <button 
                onClick={handleExportData}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors border border-slate-700"
                title="Salvar Backup (Baixar JSON)"
            >
                <Download size={16} /> Exportar
            </button>
            <button 
                onClick={handleImportClick}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors border border-slate-700"
                title="Restaurar Backup (Carregar JSON)"
            >
                <Upload size={16} /> Importar
            </button>
        </div>

        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Status do Sistema</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-medium">Online (Local)</span>
          </div>
        </div>

        <button 
            onClick={handleResetSystem}
            className="w-full bg-red-900/50 text-red-200 hover:bg-red-900/80 p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-red-900 shadow-lg uppercase tracking-wider"
        >
            <Trash2 size={16} /> ZERAR SISTEMA
        </button>
      </div>
    </div>
  );
};