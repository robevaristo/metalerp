import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './pages/DashboardView';
import { CommercialView } from './pages/CommercialView';
import { PcpView } from './pages/PcpView';
import { PurchasingView } from './pages/PurchasingView';
import { ProductionView } from './pages/ProductionView';
import { TimesheetView } from './pages/TimesheetView';
import { AgentsView } from './pages/AgentsView';
import { ReportsView } from './pages/ReportsView';
import { Project, ProjectStatus, ProductionProcess, ActiveJob, MaterialItem, MaterialType, ProjectItem } from './types';
import { ProjectCard } from './components/ProjectCard';
import { 
    X, Loader2, UploadCloud, Layers, ShoppingCart, Briefcase, 
    Plus, LayoutDashboard, Settings, FileSpreadsheet, 
    CheckCircle, CheckCircle2, Box, Zap, ArrowRight, AlertTriangle, FileText, ClipboardCheck, RefreshCw, Cpu, ListChecks
} from 'lucide-react';
import { processProjectBatch } from './services/geminiService';
import * as XLSX from 'xlsx';

const formatDim = (val: any) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim().replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

const secondaryGaugeExtract = (text: string) => {
    const upper = text.toUpperCase();
    const diaMatch = upper.match(/Ø\s*([\d,./]+)/);
    if (diaMatch) return diaMatch[1].trim();
    const threadMatch = upper.match(/M\d+/);
    if (threadMatch) return threadMatch[0];
    const fracMatch = upper.match(/(\d+[./]\d+)/);
    if (fracMatch) return fracMatch[1].trim();
    const hashMatch = upper.match(/#\s*([\d,./]+)/);
    if (hashMatch) return hashMatch[0].trim();
    return "";
};

// Extrator de Diâmetro robusto com suporte a frações (ex: 5/16)
const extractDiameterValue = (text: string) => {
    const match = text.match(/Ø\s*([\d,./]+)/);
    if (match) {
        const val = match[1].replace(',', '.');
        if (val.includes('/')) {
            const [num, den] = val.split('/').map(Number);
            if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
            return val; // Retorna a string se não conseguir converter, mas tentaremos usar como número
        }
        const parsed = parseFloat(val);
        return isNaN(parsed) ? val : parsed;
    }
    return null;
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
        const saved = localStorage.getItem('metal_erp_projects');
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [productionProcesses, setProductionProcesses] = useState<ProductionProcess[]>([]);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>(() => {
    try {
      const saved = localStorage.getItem('worktrack_active_jobs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [importResult, setImportResult] = useState<{ materials: any[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>("NEW");
  const [detectedRowCount, setDetectedRowCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('production_processes');
    if (saved) setProductionProcesses(JSON.parse(saved));
    else setProductionProcesses([{ id: 'CUTTING', name: 'Corte', color: 'orange' }, { id: 'WELDING', name: 'Solda', color: 'red' }, { id: 'MACHINING', name: 'Usinagem', color: 'blue' }, { id: 'PAINTING', name: 'Pintura', color: 'purple' }]);
  }, []);

  useEffect(() => { 
    localStorage.setItem('metal_erp_projects', JSON.stringify(projects)); 
  }, [projects]);

  useEffect(() => { 
    localStorage.setItem('worktrack_active_jobs', JSON.stringify(activeJobs)); 
  }, [activeJobs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsProcessing(true);
      setImportResult(null);
      setImportError(null);

      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const data = evt.target?.result;
              const wb = XLSX.read(data, { type: 'array' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
              
              let validRows = rawData.filter(row => {
                  if (!row || !Array.isArray(row)) return false;
                  return row.some(cell => String(cell).trim().length > 0);
              });

              if (validRows.length > 0) {
                  const firstRowStr = validRows[0].join(' ').toUpperCase();
                  if (firstRowStr.includes('QTDE') || firstRowStr.includes('UNID') || firstRowStr.includes('DESCRIÇÃO')) {
                      validRows = validRows.slice(1);
                  }
              }

              setDetectedRowCount(validRows.length);
              if (validRows.length === 0) {
                  setImportError("Planilha vazia.");
                  setIsProcessing(false);
                  return;
              }

              const chunkSize = 10;
              const chunks = [];
              for (let i = 0; i < validRows.length; i += chunkSize) chunks.push(validRows.slice(i, i + chunkSize));

              setTotalSteps(chunks.length);
              let allMaterials: any[] = [];
              
              for (let i = 0; i < chunks.length; i++) {
                  setCurrentStep(i + 1);
                  try {
                      if (i > 0) await new Promise(r => setTimeout(r, 10000));
                      let result = await processProjectBatch(chunks[i]);
                      if (result?.materials) allMaterials = [...allMaterials, ...result.materials];
                  } catch (batchErr: any) {
                      console.error("Erro no lote:", batchErr);
                  }
              }

              if (allMaterials.length === 0) {
                  setImportError("Nenhum item reconhecido.");
              } else {
                  setImportResult({ materials: allMaterials.map(m => ({ ...m, tempId: crypto.randomUUID() })) });
              }
              setIsProcessing(false);
          } catch (err: any) {
              setImportError("Erro ao processar Excel.");
              setIsProcessing(false);
          }
      };
      reader.readAsArrayBuffer(file);
      if (e.target) e.target.value = '';
  };

  const confirmImport = () => {
      if (!importResult) return;
      const typeMap = { SHEET: MaterialType.SHEET, BAR: MaterialType.BAR, COMMERCIAL: MaterialType.COMMERCIAL };
      
      const newMaterials: MaterialItem[] = importResult.materials.map((m: any) => {
          const name = String(m.name || 'ITEM').toUpperCase();
          const details = String(m.details || "").toUpperCase();
          const fullText = (name + " " + details).toUpperCase();

          // REGRA v.26.8: Se for ARRUELA, força COMERCIAL (ignora se parecer chapa)
          let type = typeMap[m.detectedType as keyof typeof typeMap] || MaterialType.COMMERCIAL;
          if (fullText.includes("ARRUELA")) {
              type = MaterialType.COMMERCIAL;
          } else if (fullText.includes("CHAPA") || fullText.includes("CH ") || fullText.includes("PLACA") || fullText.includes("#")) {
              type = MaterialType.SHEET;
          }

          let width = formatDim(m.widthMm);
          let length = formatDim(m.lengthMm);

          // REGRA v.26.8: Se for CHAPA e tiver Ø, repete o diâmetro na Largura e Comprimento
          if (type === MaterialType.SHEET && fullText.includes('Ø')) {
              const diaVal = extractDiameterValue(fullText);
              if (diaVal) {
                  // Se for número, usa o número. Se for fração (string), tenta converter ou mantém
                  const numVal = typeof diaVal === 'number' ? diaVal : parseFloat(String(diaVal).replace(',', '.'));
                  if (!isNaN(numVal)) {
                      width = numVal;
                      length = numVal;
                  }
              }
          }

          let gaugeVal = String(m.gauge || "").toUpperCase().replace('Ø', '').replace('MM', '').trim();
          if (!gaugeVal || gaugeVal === "N/D" || gaugeVal === "-" || gaugeVal === "DEFINIR") {
              gaugeVal = secondaryGaugeExtract(fullText);
          }

          return {
            id: crypto.randomUUID(),
            name: name,
            quantity: Number(m.quantity) || 1,
            type: type,
            unit: "pç",
            inStock: false,
            purchaseStatus: 'PENDING',
            materialGrade: String(m.materialGrade || 'SAE 1020').toUpperCase(),
            gauge: gaugeVal || "DEFINIR",
            widthMm: width,
            lengthMm: length,
            details: details,
            drawingNumber: String(m.drawingNumber || '-'),
            productionStatus: 'LIBERADO'
          };
      });

      if (targetProjectId !== "NEW") {
          const existing = projects.find(p => p.id === targetProjectId);
          if (existing) {
              const updatedProject = { ...existing, materials: [...existing.materials, ...newMaterials], status: ProjectStatus.PCP };
              updateProject(updatedProject);
          }
      } else {
          const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
          const op = prompt("Digite o número da OP:") || `OP-${timestamp}`;
          setProjects(prev => [{
              id: crypto.randomUUID(), opNumber: op, client: "IMPORTADO", description: "IMPORTAÇÃO IA v.26.8",
              items: [], implantationDate: new Date().toISOString().split('T')[0], status: ProjectStatus.PCP,
              materials: newMaterials, createdAt: new Date().toISOString()
          }, ...prev]);
      }
      setIsImportModalOpen(false);
      setTimeout(() => setCurrentView('pcp'), 100); 
  };

  const openImporter = (id: string) => { setTargetProjectId(id); setIsImportModalOpen(true); setImportResult(null); setImportError(null); setDetectedRowCount(0); };

  const updateProject = (u: Project) => setProjects(prev => prev.map(p => p.id === u.id ? u : p));
  const addProject = (p: Project) => setProjects(prev => [p, ...prev]);
  const deleteProject = (id: string) => { if(window.confirm("Excluir esta OP?")) setProjects(prev => prev.filter(p => p.id !== id)); };
  const updateStatus = (id: string, s: ProjectStatus) => setProjects(prev => prev.map(p => id === p.id ? {...p, status: s} : p));

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <div className="print:hidden"><Sidebar currentView={currentView} setView={setCurrentView} /></div>
      <main className="ml-64 flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {currentView === 'dashboard' && <DashboardView projects={projects} />}
          {currentView === 'agents' && <AgentsView projects={projects} onImportClick={() => openImporter('NEW')} />}
          {currentView === 'engineering' && (
              <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="bg-teal-600 p-3 rounded-2xl shadow-lg"><Briefcase className="text-white"/></div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Engenharia / OPs</h2>
                      </div>
                      <button onClick={() => openImporter('NEW')} className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl hover:bg-teal-700 transition-all">
                        <Zap size={18} fill="currentColor"/> Importação IA
                      </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map(p => (
                        <ProjectCard key={p.id} project={p} onDelete={() => deleteProject(p.id)} onEdit={() => {setProjectToEdit(p); setCurrentView('commercial_editor');}}
                            actionButton={<button onClick={() => openImporter(p.id)} className="w-full py-4 bg-teal-50 text-teal-700 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 border border-teal-100 hover:bg-teal-100 transition-all"><Zap size={14} fill="currentColor"/> Mesclar Planilha</button>}
                        />
                    ))}
                  </div>
              </div>
          )}
          {currentView === 'commercial_editor' && (
              <CommercialView projects={projects} addProject={addProject} updateProject={updateProject} deleteProject={deleteProject} updateStatus={updateStatus} projectToEdit={projectToEdit} clearProjectToEdit={() => {setProjectToEdit(null); setCurrentView('engineering');}} onOpenImport={() => openImporter(projectToEdit?.id || 'NEW')} />
          )}
          {currentView === 'pcp' && <PcpView projects={projects} updateProject={updateProject} updateStatus={updateStatus} onDeleteProject={deleteProject} onOpenImport={openImporter} />}
          {currentView === 'purchasing' && <PurchasingView projects={projects} updateStatus={updateStatus} updateProject={updateProject} />}
          {currentView === 'production' && <ProductionView projects={projects} updateProject={updateProject} updateStatus={updateStatus} productionProcesses={productionProcesses} updateProductionProcesses={setProductionProcesses} activeJobs={activeJobs} />}
          {currentView === 'timesheet' && <TimesheetView projects={projects} updateProject={updateProject} activeJobs={activeJobs} setActiveJobs={setActiveJobs} />}
          {currentView === 'reports' && <ReportsView projects={projects} />}
        </div>
      </main>

      {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-[90vw] max-h-[92vh] flex flex-col overflow-hidden">
                  <div className="p-6 border-b bg-white flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-teal-500 rounded-2xl text-white shadow-xl"><Zap size={24} fill="currentColor"/></div>
                          <div>
                              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Zindra Importador v.26.8</h3>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Regra de Diâmetro Ø Ativada</p>
                          </div>
                      </div>
                      <button onClick={() => setIsImportModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={32} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 bg-slate-50/20">
                      {importError && (
                          <div className="max-w-xl mx-auto bg-red-50 border-2 border-red-200 p-10 rounded-[2rem] text-center space-y-4">
                              <AlertTriangle size={48} className="text-red-500 mx-auto" />
                              <h4 className="text-xl font-black text-red-900 uppercase tracking-tighter">Erro na Importação</h4>
                              <p className="text-xs font-bold text-red-600 uppercase tracking-widest">{importError}</p>
                              <button onClick={() => setImportError(null)} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px]">Reiniciar</button>
                          </div>
                      )}

                      {!importResult && !isProcessing && !importError && (
                          <div className="max-w-2xl mx-auto space-y-10">
                              <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-slate-200 rounded-[3rem] p-24 cursor-pointer hover:border-teal-500 hover:bg-white transition-all bg-slate-50 text-center group">
                                  <UploadCloud size={64} className="mx-auto mb-6 text-slate-300 group-hover:text-teal-500 transition-colors" />
                                  <p className="font-black text-slate-900 uppercase text-xl">Arraste sua Planilha</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Processamento com Filtro de Arruelas v.26.8</p>
                              </div>
                              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                          </div>
                      )}

                      {isProcessing && (
                          <div className="flex flex-col items-center justify-center py-32 text-center">
                              <Loader2 size={80} className="text-teal-500 animate-spin mb-8" />
                              <div className="space-y-2">
                                  <p className="font-black text-slate-900 uppercase text-2xl tracking-tighter">Lote {currentStep} de {totalSteps}</p>
                                  <div className="flex items-center justify-center gap-2 text-indigo-600 font-black uppercase text-[10px] tracking-widest bg-indigo-50 px-4 py-2 rounded-full">
                                      <ListChecks size={14}/> {detectedRowCount} Linhas para análise
                                  </div>
                              </div>
                          </div>
                      )}

                      {importResult && (
                          <div className="animate-fade-in max-w-6xl mx-auto">
                              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl mb-6 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <CheckCircle2 className="text-emerald-500" />
                                      <p className="text-xs font-black text-emerald-900 uppercase">Leitura Concluída: {importResult.materials.length} itens identificados.</p>
                                  </div>
                                  <span className="text-[9px] font-black text-emerald-600 uppercase opacity-60">Filtro de Arruelas OK</span>
                              </div>
                              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
                                  <table className="w-full text-left">
                                      <thead className="bg-slate-50 border-b text-[9px] font-black uppercase tracking-widest text-slate-400">
                                          <tr>
                                              <th className="p-5 text-center w-20">QTD</th>
                                              <th className="p-5">MATERIAL EXTRAÍDO</th>
                                              <th className="p-5 text-center w-36">CÉLULA</th>
                                              <th className="p-5 text-center w-36">BITOLA</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y text-slate-800">
                                          {importResult.materials.map((m: any) => (
                                              <tr key={m.tempId} className="hover:bg-slate-50 transition-colors">
                                                  <td className="p-5 text-center font-black text-3xl text-indigo-600">{m.quantity}</td>
                                                  <td className="p-5">
                                                      <span className="text-slate-900 font-black text-[11px] uppercase tracking-tight block">{m.name}</span>
                                                      <span className="text-[8px] font-bold text-slate-400 uppercase">BASE: {m.details?.substring(0, 80)}...</span>
                                                  </td>
                                                  <td className="p-5 text-center">
                                                      <span className={`px-4 py-1.5 rounded-full text-[8px] font-black border uppercase tracking-widest ${m.detectedType === 'SHEET' ? 'text-teal-600 border-teal-100 bg-teal-50' : m.detectedType === 'BAR' ? 'text-orange-600 border-orange-100 bg-orange-50' : 'text-indigo-600 border-indigo-100 bg-indigo-50'}`}>
                                                          {m.detectedType === 'COMMERCIAL' ? 'COMERCIAL' : m.detectedType === 'SHEET' ? 'CHAPA' : 'BARRA'}
                                                      </span>
                                                  </td>
                                                  <td className="p-5 text-center">
                                                      <div className={`font-black text-base ${!m.gauge || m.gauge === "N/D" || m.gauge === "DEFINIR" ? 'text-red-500' : 'text-slate-900'}`}>{m.gauge || '-'}</div>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}
                  </div>

                  {importResult && (
                      <div className="p-8 border-t bg-white flex justify-end gap-5 items-center">
                          <button onClick={() => setImportResult(null)} className="px-8 py-4 font-black uppercase text-[10px] text-slate-400">Descartar</button>
                          <button onClick={confirmImport} className="bg-teal-600 text-white px-16 py-5 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-3">
                              <CheckCircle size={20}/> Confirmar e Criar OP
                          </button>
                      </div>
                  )}
              </div>
          </div>
  );
};

export default App;
