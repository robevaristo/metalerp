
import React, { useState, useEffect } from 'react';
import { JobData, JobRecord, ActiveJob, SERVICE_TYPES, Project, MaterialType, ProjectStatus } from '../types';
import { Play, Square, ClipboardList, AlertCircle, Clock, PlusCircle, LayoutDashboard, Settings, User, Hash, Wrench, CheckCircle, FileText, Box, Layers, Lock, CheckSquare, X, Trash2, Download } from 'lucide-react';

const TimerDisplay: React.FC<{ startTime: number; compact?: boolean }> = ({ startTime, compact }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return <div className={`font-mono font-bold text-slate-800 ${compact ? 'text-2xl' : 'text-4xl'}`}>{h}:{m}:{s}</div>;
};

export const TimesheetView: React.FC<{ projects: Project[], activeJobs: ActiveJob[], setActiveJobs: any, updateProject: any }> = ({ projects, activeJobs, setActiveJobs, updateProject }) => {
  const [activeTab, setActiveTab] = useState<'register' | 'process' | 'settings'>('process');
  const [formData, setFormData] = useState<JobData>({ funcionario: '', op: '', desenho: '', cliente: '', maquina: '', serviceType: '', relatedItemIds: [] });
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [history, setHistory] = useState<JobRecord[]>([]);
  const [employees, setEmployees] = useState<string[]>(JSON.parse(localStorage.getItem('worktrack_employees') || '[]'));
  const [machines, setMachines] = useState<string[]>(JSON.parse(localStorage.getItem('worktrack_machines') || '[]'));

  useEffect(() => { localStorage.setItem('worktrack_history', JSON.stringify(history)); }, [history]);
  useEffect(() => {
      localStorage.setItem('worktrack_employees', JSON.stringify(employees));
      localStorage.setItem('worktrack_machines', JSON.stringify(machines));
  }, [employees, machines]);

  const selectedProject = projects.find(p => p.opNumber === formData.op);
  const busyItemIds = activeJobs.flatMap(j => j.data.relatedItemIds || []);

  const startService = () => {
    if (!formData.funcionario || !formData.op || !formData.serviceType) return alert("Preencha os campos!");
    setActiveJobs(prev => [...prev, { id: crypto.randomUUID(), data: { ...formData, relatedItemIds: selectedItemIds }, startTime: Date.now() }]);
    setFormData({ funcionario: '', op: '', desenho: '', cliente: '', maquina: '', serviceType: '', relatedItemIds: [] });
    setSelectedItemIds([]); setActiveTab('process');
  };

  const stopService = (id: string) => {
    const job = activeJobs.find(x => x.id === id); if (!job) return;
    const end = Date.now(); const dur = Math.floor((end - job.startTime) / 1000);
    setHistory(prev => [{ ...job.data, id: job.id, startTime: job.startTime, endTime: end, durationSeconds: dur, date: new Date().toISOString() }, ...prev]);
    setActiveJobs(prev => prev.filter(x => x.id !== id));
    
    if (job.data.relatedItemIds?.length) {
        const p = projects.find(x => x.opNumber === job.data.op);
        if (p) {
            const mats = p.materials.map(m => job.data.relatedItemIds?.includes(m.id) ? { ...m, productionStatus: 'DONE' } : m);
            updateProject({ ...p, materials: mats });
        }
    }
  };

  return (
    <div className="space-y-6">
       <div className="bg-white rounded-3xl p-6 border flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3"><Clock className="text-teal-600" /><h2 className="text-xl font-black uppercase">Apontamento</h2></div>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
             <button onClick={() => setActiveTab('register')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'register' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}>Novo</button>
             <button onClick={() => setActiveTab('process')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'process' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}>Processos ({activeJobs.length})</button>
             <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'settings' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}>Config</button>
          </div>
       </div>

       {activeTab === 'register' && (
          <div className="bg-white p-10 rounded-[3rem] border max-w-4xl mx-auto space-y-6">
              <select className="w-full p-4 border-2 rounded-2xl font-black uppercase" value={formData.op} onChange={e => {
                  const p = projects.find(x => x.opNumber === e.target.value);
                  setFormData({...formData, op: e.target.value, cliente: p?.client || ''});
                  setSelectedItemIds([]);
              }}>
                  <option value="">Selecione a OP...</option>
                  {projects.filter(p => p.status !== ProjectStatus.COMPLETED).map(p => <option key={p.id} value={p.opNumber}>{p.opNumber} - {p.client}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                  <select className="p-3 border rounded-xl font-bold" value={formData.funcionario} onChange={e => setFormData({...formData, funcionario: e.target.value})}><option value="">Funcionário...</option>{employees.map(e => <option key={e} value={e}>{e}</option>)}</select>
                  <select className="p-3 border rounded-xl font-bold" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})}><option value="">Serviço...</option>{SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              {selectedProject && (
                  <div className="bg-slate-50 p-6 rounded-3xl border space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Selecione as Peças (Lista PCP):</p>
                      {selectedProject.materials.filter(m => m.type !== MaterialType.COMMERCIAL).map(item => {
                          const isBusy = busyItemIds.includes(item.id);
                          const isSelected = selectedItemIds.includes(item.id);
                          return (
                              <div key={item.id} onClick={() => !isBusy && setSelectedItemIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])} className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer ${isBusy ? 'opacity-40 cursor-not-allowed bg-slate-100' : isSelected ? 'bg-teal-50 border-teal-500' : 'bg-white'}`}>
                                  <div className="flex items-center gap-3">
                                      {isSelected ? <CheckSquare className="text-teal-600" /> : <Square className="text-slate-300" />}
                                      <div><p className="font-black uppercase text-sm">{item.quantity}x {item.name}</p><p className="text-[10px] text-slate-400">{item.gauge} - {item.lengthMm}mm</p></div>
                                  </div>
                                  {isBusy && <span className="text-[8px] font-black bg-orange-100 p-1 rounded">EM PROCESSO</span>}
                              </div>
                          );
                      })}
                  </div>
              )}
              <button onClick={startService} className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-teal-100 flex items-center justify-center gap-2"><Play size={20}/> Iniciar Cronômetro</button>
          </div>
       )}

       {activeTab === 'process' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {activeJobs.map(job => (
                   <div key={job.id} className="bg-white p-6 rounded-3xl border-l-[8px] border-teal-600 shadow-sm space-y-4">
                       <div className="flex justify-between items-start"><p className="font-black uppercase text-slate-900">{job.data.funcionario}</p><TimerDisplay startTime={job.startTime} compact /></div>
                       <p className="text-xs font-bold text-teal-600 uppercase">{job.data.serviceType} - OP {job.data.op}</p>
                       <div className="bg-slate-50 p-3 rounded-xl text-[10px] font-medium italic">{job.data.desenho || "Sem peças vinculadas"}</div>
                       <button onClick={() => stopService(job.id)} className="w-full bg-red-600 text-white py-2 rounded-xl text-xs font-black uppercase">Finalizar</button>
                   </div>
               ))}
               {activeJobs.length === 0 && <p className="col-span-full text-center py-20 text-slate-400 font-black uppercase">Nenhum operador ativo.</p>}
           </div>
       )}

       {activeTab === 'settings' && (
           <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
               <div className="bg-white p-6 rounded-2xl border">
                   <h3 className="font-black uppercase text-sm mb-4">Equipe</h3>
                   <div className="flex gap-2 mb-4"><input className="flex-1 p-2 border rounded" id="newEmp"/><button onClick={() => { setEmployees([...employees, (document.getElementById('newEmp') as any).value]); (document.getElementById('newEmp') as any).value = ''; }} className="bg-slate-900 text-white px-3 rounded">+</button></div>
                   <div className="flex flex-wrap gap-2">{employees.map(e => <span key={e} className="bg-slate-100 px-3 py-1 rounded-full text-xs flex gap-2 items-center">{e}<X size={12} className="cursor-pointer" onClick={() => setEmployees(employees.filter(x => x !== e))}/></span>)}</div>
               </div>
           </div>
       )}
    </div>
  );
};
