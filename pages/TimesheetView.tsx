import React, { useState, useEffect } from 'react';
import { JobData, JobRecord, ActiveJob, SERVICE_TYPES } from '../types';
import { Play, Square, ClipboardList, Activity, Sparkles, AlertCircle, Download, LayoutDashboard, PlusCircle, Wrench, Crown, Users, Settings, ArrowRight, Filter, XCircle, Trash2, Clock, Plus, X } from 'lucide-react';
import { analyzeWorkLogs } from '../services/geminiService';

// --- INTERNAL COMPONENT: TIMER DISPLAY ---
const TimerDisplay: React.FC<{ startTime: number; compact?: boolean }> = ({ startTime, compact }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className={`font-mono font-bold text-slate-800 ${compact ? 'text-2xl' : 'text-4xl'}`}>
      {h}:{m}:{s}
    </div>
  );
};

// --- INTERNAL COMPONENT: REGISTRATION MANAGER ---
const RegistrationManager: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    items: string[]; 
    onAdd: (name: string) => void; 
    onRemove: (name: string) => void;
    placeholder: string;
}> = ({ title, icon, items, onAdd, onRemove, placeholder }) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
        if (newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem('');
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">{icon} {title}</h3>
            <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder={placeholder}
                />
                <button 
                    onClick={handleAdd}
                    className="bg-slate-800 text-white px-3 rounded-lg hover:bg-slate-700"
                >
                    <Plus size={20} />
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {items.length === 0 && <span className="text-sm text-slate-400 italic">Nenhum item cadastrado.</span>}
                {items.map(item => (
                    <span key={item} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-slate-200">
                        {item}
                        <button onClick={() => onRemove(item)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                    </span>
                ))}
            </div>
        </div>
    );
};

// --- INTERNAL COMPONENT: WORK FORM ---
interface WorkFormProps {
    data: JobData;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    disabled?: boolean;
    employees: string[];
    machines: string[];
    onRequestRegister: () => void;
}

const WorkForm: React.FC<WorkFormProps> = ({ data, onChange, disabled, employees, machines, onRequestRegister }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Funcionário</label>
                <div className="flex gap-2">
                    <select 
                        name="funcionario" 
                        value={data.funcionario} 
                        onChange={onChange}
                        disabled={disabled}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-teal-500 bg-white"
                    >
                        <option value="">Selecione...</option>
                        {employees.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                {employees.length === 0 && <p onClick={onRequestRegister} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Cadastrar funcionários</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de Serviço</label>
                <select 
                    name="serviceType" 
                    value={data.serviceType} 
                    onChange={onChange}
                    disabled={disabled}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-teal-500 bg-white"
                >
                    <option value="">Selecione...</option>
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Número da OP</label>
                <input 
                    type="text"
                    name="op"
                    value={data.op}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder="Ex: 0831-25"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-teal-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cliente</label>
                <input 
                    type="text"
                    name="cliente"
                    value={data.cliente}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder="Nome do Cliente"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-teal-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Máquina / Posto</label>
                <select 
                    name="maquina" 
                    value={data.maquina} 
                    onChange={onChange}
                    disabled={disabled}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-teal-500 bg-white"
                >
                    <option value="">Selecione...</option>
                    {machines.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {machines.length === 0 && <p onClick={onRequestRegister} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Cadastrar máquinas</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Desenho / Detalhe</label>
                <input 
                    type="text"
                    name="desenho"
                    value={data.desenho}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder="Opcional"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-teal-500"
                />
            </div>
        </div>
    );
};

// --- INTERNAL COMPONENT: HISTORY TABLE ---
const HistoryTable: React.FC<{ history: JobRecord[], onDelete: (id: string) => void, onUpdate: (id: string, updates: Partial<JobRecord>) => void }> = ({ history, onDelete }) => {
    if (history.length === 0) {
        return <div className="text-center py-10 text-slate-400 italic">Nenhum registro no histórico.</div>;
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium">
                        <tr>
                            <th className="p-3 pl-4">Data</th>
                            <th className="p-3">Funcionário</th>
                            <th className="p-3">Serviço</th>
                            <th className="p-3">OP / Cliente</th>
                            <th className="p-3">Máquina</th>
                            <th className="p-3 text-right">Duração</th>
                            <th className="p-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {history.map(job => {
                            const h = Math.floor(job.durationSeconds / 3600);
                            const m = Math.floor((job.durationSeconds % 3600) / 60);
                            return (
                                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 pl-4 text-slate-500 whitespace-nowrap">
                                        {new Date(job.startTime).toLocaleDateString()}
                                        <div className="text-xs">{new Date(job.startTime).toLocaleTimeString().slice(0,5)} - {new Date(job.endTime).toLocaleTimeString().slice(0,5)}</div>
                                    </td>
                                    <td className="p-3 font-medium text-slate-800">{job.funcionario}</td>
                                    <td className="p-3">
                                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs border border-slate-200">
                                            {job.serviceType}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-mono font-bold text-teal-700">{job.op}</div>
                                        <div className="text-xs text-slate-500 truncate max-w-[150px]">{job.cliente}</div>
                                    </td>
                                    <td className="p-3 text-slate-600">{job.maquina}</td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-700">
                                        {h}h {m}m
                                    </td>
                                    <td className="p-3 text-center">
                                        <button 
                                            onClick={() => { if(confirm('Excluir este registro?')) onDelete(job.id) }} 
                                            className="text-slate-300 hover:text-red-500 p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// --- MAIN VIEW ---

const initialForm: JobData = {
  funcionario: '',
  op: '',
  desenho: '',
  cliente: '',
  maquina: '',
  serviceType: ''
};

const STORAGE_KEY_HISTORY = 'worktrack_history';
const STORAGE_KEY_ACTIVE = 'worktrack_active_jobs';
const STORAGE_KEY_EMPLOYEES = 'worktrack_employees';
const STORAGE_KEY_MACHINES = 'worktrack_machines';

export const TimesheetView: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'register' | 'process' | 'settings'>('register');

  // Form State
  const [formData, setFormData] = useState<JobData>(initialForm);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Filter State
  const [filters, setFilters] = useState({
    employee: '',
    machine: '',
    serviceType: '',
    client: ''
  });

  // Active Jobs (Array for multi-user support)
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  
  // History State
  const [history, setHistory] = useState<JobRecord[]>([]);

  // Registration Data State
  const [employees, setEmployees] = useState<string[]>([]);
  const [machines, setMachines] = useState<string[]>([]);

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (savedActive) setActiveJobs(JSON.parse(savedActive));

    const savedEmployees = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
    if (savedEmployees) setEmployees(JSON.parse(savedEmployees));

    const savedMachines = localStorage.getItem(STORAGE_KEY_MACHINES);
    if (savedMachines) setMachines(JSON.parse(savedMachines));
  }, []);

  // Persist data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeJobs));
  }, [activeJobs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MACHINES, JSON.stringify(machines));
  }, [machines]);

  // --- Registration Handlers ---
  const addEmployee = (name: string) => {
    if (!employees.includes(name)) setEmployees(prev => [...prev, name].sort());
  };

  const removeEmployee = (name: string) => {
    setEmployees(prev => prev.filter(e => e !== name));
  };

  const addMachine = (name: string) => {
    if (!machines.includes(name)) setMachines(prev => [...prev, name].sort());
  };

  const removeMachine = (name: string) => {
    setMachines(prev => prev.filter(m => m !== name));
  };

  const goToSettings = () => {
    setActiveTab('settings');
    setValidationError(null);
  };

  // --- Main Logic ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationError) setValidationError(null); // Clear error on user input
  };

  const generateId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch (e) {}
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const startService = () => {
    // 1. Check if data exists
    if (employees.length === 0) {
      setValidationError("Nenhum funcionário cadastrado. Por favor, cadastre antes de iniciar.");
      return;
    }
    if (machines.length === 0) {
      setValidationError("Nenhuma máquina cadastrada. Por favor, cadastre antes de iniciar.");
      return;
    }

    // 2. Check if form is filled
    if (!formData.funcionario || !formData.op || !formData.serviceType || !formData.maquina) {
      setValidationError("Preencha todos os campos obrigatórios (Funcionário, Serviço, Máquina e OP) para iniciar.");
      return;
    }

    const newJob: ActiveJob = {
      id: generateId(),
      data: { ...formData },
      startTime: Date.now()
    };

    setActiveJobs(prev => [...prev, newJob]);
    setFormData(initialForm); // Reset form for next entry
    setAiReport(null);
    setValidationError(null);
    setActiveTab('process'); // Auto-switch to process view to see it running
  };

  const stopService = (jobId: string) => {
    const jobToStop = activeJobs.find(job => job.id === jobId);
    if (!jobToStop) return;

    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - jobToStop.startTime) / 1000);

    const newRecord: JobRecord = {
      ...jobToStop.data,
      id: jobToStop.id,
      startTime: jobToStop.startTime,
      endTime,
      durationSeconds,
      date: new Date().toISOString()
    };

    setHistory(prev => [newRecord, ...prev]);
    setActiveJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const deleteRecord = (id: string) => {
    setHistory(prev => prev.filter(job => job.id !== id));
  };

  const handleUpdateRecord = (id: string, updates: Partial<JobRecord>) => {
    setHistory(prev => prev.map(job => {
      if (job.id === id) {
        const newStartTime = updates.startTime || job.startTime;
        const newEndTime = updates.endTime !== undefined ? updates.endTime : job.endTime;
        
        let newDuration = job.durationSeconds;
        if (newEndTime) {
          newDuration = Math.max(0, Math.floor((newEndTime - newStartTime) / 1000));
        }

        return {
          ...job,
          ...updates,
          startTime: newStartTime,
          endTime: newEndTime,
          durationSeconds: newDuration
        };
      }
      return job;
    }));
  };

  // --- Filtering Logic ---
  const filteredHistory = history.filter(job => {
    const matchEmployee = !filters.employee || job.funcionario === filters.employee;
    const matchMachine = !filters.machine || job.maquina === filters.machine;
    const matchService = !filters.serviceType || job.serviceType === filters.serviceType;
    const matchClient = !filters.client || job.cliente.toLowerCase().includes(filters.client.toLowerCase());
    return matchEmployee && matchMachine && matchService && matchClient;
  });

  const generateAIReport = async () => {
    if (filteredHistory.length === 0) {
      alert("Não há dados filtrados para analisar.");
      return;
    }
    setIsAnalyzing(true);
    setAiReport(null);
    const report = await analyzeWorkLogs(filteredHistory);
    setAiReport(report);
    setIsAnalyzing(false);
  };

  const exportToExcel = () => {
    if (filteredHistory.length === 0) {
      alert("Não há dados filtrados para exportar.");
      return;
    }

    const headers = ["Data", "Funcionário", "Serviço", "OP", "Desenho", "Cliente", "Máquina", "Início", "Fim", "Duração"];
    
    const escapeCsv = (field: any) => {
      const stringValue = String(field || '');
      if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = filteredHistory.map(job => {
      const startTime = new Date(job.startTime);
      const endTime = job.endTime ? new Date(job.endTime) : null;
      
      const h = Math.floor(job.durationSeconds / 3600);
      const m = Math.floor((job.durationSeconds % 3600) / 60);
      const s = job.durationSeconds % 60;
      const formattedDuration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

      return [
        startTime.toLocaleDateString('pt-BR'),
        job.funcionario,
        job.serviceType,
        job.op,
        job.desenho,
        job.cliente,
        job.maquina,
        startTime.toLocaleTimeString(),
        endTime ? endTime.toLocaleTimeString() : '',
        formattedDuration
      ].map(escapeCsv).join(";");
    });

    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio_producao_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({ employee: '', machine: '', serviceType: '', client: '' });
  };

  return (
    <div className="space-y-6">
       
       {/* Header */}
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
              <div className="bg-teal-100 p-2 rounded-lg text-teal-600">
                  <Crown size={24} fill="currentColor" />
              </div>
              <div>
                  <h2 className="text-xl font-bold text-slate-800">Apontamento de Horas</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">LIONS MACHINE - Controle de Processos</p>
              </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
             <button
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'register' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 <PlusCircle size={16} /> Novo Registro
             </button>
             <button
              onClick={() => setActiveTab('process')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'process' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 <LayoutDashboard size={16} /> Processos
                 {activeJobs.length > 0 && <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeJobs.length}</span>}
             </button>
             <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                 <Settings size={16} /> Cadastros
             </button>
          </div>
       </div>

       {/* Tab 1: Register */}
       {activeTab === 'register' && (
          <div className="max-w-4xl mx-auto">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <ClipboardList className="text-teal-500" /> Iniciar Novo Serviço
                </h3>
                
                <WorkForm 
                    data={formData}
                    onChange={handleInputChange}
                    employees={employees}
                    machines={machines}
                    onRequestRegister={goToSettings}
                />

                {validationError && (
                    <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 flex items-center gap-2 text-sm">
                        <AlertCircle size={16} /> {validationError}
                    </div>
                )}

                <button
                    onClick={startService}
                    className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98]"
                >
                    <Play fill="currentColor" /> Iniciar Cronômetro
                </button>
             </div>
          </div>
       )}

       {/* Tab 2: Process */}
       {activeTab === 'process' && (
           <div className="space-y-8">
                {/* Active Jobs */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Activity className="text-green-500" /> Em Andamento
                    </h3>
                    
                    {activeJobs.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                            Nenhum serviço em andamento no momento.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeJobs.map(job => (
                                <div key={job.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-500 flex flex-col justify-between animate-fade-in-up">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{job.data.funcionario}</h4>
                                            <p className="text-sm font-medium text-teal-600">{job.data.serviceType}</p>
                                        </div>
                                        <TimerDisplay startTime={job.startTime} compact />
                                    </div>
                                    <div className="space-y-1 text-sm text-slate-500 mb-4">
                                        <div className="flex items-center gap-2"><Settings size={14}/> OP: {job.data.op}</div>
                                        <div className="flex items-center gap-2"><Wrench size={14}/> {job.data.maquina}</div>
                                    </div>
                                    <button 
                                        onClick={() => stopService(job.id)}
                                        className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                                    >
                                        <Square fill="currentColor" size={16} /> Finalizar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <div className="border-t border-slate-200"></div>

                {/* History & Analysis */}
                <section>
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Histórico de Produção</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={generateAIReport}
                                disabled={isAnalyzing || filteredHistory.length === 0}
                                className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                <Sparkles size={16} /> {isAnalyzing ? 'Analisando...' : 'Insights IA'}
                            </button>
                            <button 
                                onClick={exportToExcel}
                                disabled={filteredHistory.length === 0}
                                className="bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                <Download size={16} /> Excel
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-3">
                            <Filter size={16} /> Filtros
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <select value={filters.employee} onChange={e => setFilters({...filters, employee: e.target.value})} className="p-2 border rounded-lg text-sm bg-white">
                                <option value="">Todos Funcionários</option>
                                {employees.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                             <select value={filters.serviceType} onChange={e => setFilters({...filters, serviceType: e.target.value})} className="p-2 border rounded-lg text-sm bg-white">
                                <option value="">Todos Serviços</option>
                                {SERVICE_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                             <select value={filters.machine} onChange={e => setFilters({...filters, machine: e.target.value})} className="p-2 border rounded-lg text-sm bg-white">
                                <option value="">Todas Máquinas</option>
                                {machines.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                             <input type="text" placeholder="Cliente..." value={filters.client} onChange={e => setFilters({...filters, client: e.target.value})} className="p-2 border rounded-lg text-sm" />
                             
                             <button onClick={clearFilters} className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center gap-2 text-sm font-medium">
                                 <XCircle size={16} /> Limpar
                             </button>
                        </div>
                    </div>

                    {/* AI Report Output */}
                    {aiReport && (
                        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-6 rounded-xl shadow-sm mb-6 animate-fade-in">
                            <h4 className="text-purple-900 font-bold mb-3 flex items-center gap-2">
                                <Sparkles className="text-purple-600" /> Relatório de Eficiência
                            </h4>
                            <div className="prose prose-sm text-slate-700 whitespace-pre-line">
                                {aiReport}
                            </div>
                        </div>
                    )}

                    <HistoryTable history={filteredHistory} onDelete={deleteRecord} onUpdate={handleUpdateRecord} />
                </section>
           </div>
       )}

       {/* Tab 3: Settings */}
       {activeTab === 'settings' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
               <RegistrationManager 
                  title="Funcionários" 
                  icon={<Users className="text-teal-600"/>}
                  items={employees}
                  onAdd={addEmployee}
                  onRemove={removeEmployee}
                  placeholder="Nome do Funcionário"
               />
               <RegistrationManager 
                  title="Máquinas" 
                  icon={<Settings className="text-teal-600"/>}
                  items={machines}
                  onAdd={addMachine}
                  onRemove={removeMachine}
                  placeholder="Nome/Código da Máquina"
               />
           </div>
       )}
    </div>
  );
};