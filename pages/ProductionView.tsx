
import React, { useState } from 'react';
import { Project, ProjectStatus, MaterialType, MaterialItem, ActiveJob } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ArrowLeft, CheckCircle, Play, Box, Hammer, Layers, Search, User, Zap, Hash, History, X, Warehouse, ShoppingBag, Tag, ShoppingCart } from 'lucide-react';

interface ProductionViewProps {
  projects: Project[];
  updateProject: (p: Project) => void;
  updateStatus: (id: string, status: ProjectStatus) => void;
  productionProcesses: any[];
  updateProductionProcesses: (processes: any[]) => void;
  onEditProject?: (p: Project) => void;
  onDeleteProject?: (id: string) => void;
  activeJobs: ActiveJob[]; 
}

const formatNum = (val: number | undefined) => {
    if (val === undefined || val === null) return "0";
    return Number(val.toFixed(2)).toString();
};

export const ProductionView: React.FC<ProductionViewProps> = ({ 
  projects, 
  updateProject, 
  updateStatus, 
  activeJobs,
  onEditProject,
  onDeleteProject
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const productionProjects = projects.filter(p => 
      p.status === ProjectStatus.PRODUCTION || 
      p.status === ProjectStatus.COMPLETED ||
      p.materials.some(m => m.inStock || m.purchaseStatus === 'DELIVERED' || m.purchaseStatus === 'COMPLETED' || m.productionStatus === 'LIBERADO')
  );

  const renderTable = (items: MaterialItem[], title: string, icon: React.ReactNode, headerColor: string, type: MaterialType) => {
      const availableItems = items.filter(m => m.inStock || m.purchaseStatus === 'DELIVERED' || m.purchaseStatus === 'COMPLETED' || m.productionStatus === 'LIBERADO');
      if (availableItems.length === 0) return null;

      const isBar = type === MaterialType.BAR;
      const grades = Array.from(new Set(availableItems.map(i => i.materialGrade || 'PADRÃO'))).sort();

      return (
          <div className="mb-10 animate-fade-in">
              <div className={`${headerColor} p-4 text-white font-black text-[10px] uppercase tracking-[0.15em] flex items-center gap-3 rounded-t-2xl shadow-sm`}>
                  {icon} {title}
              </div>
              
              {grades.map(grade => {
                  const gradeItems = availableItems.filter(i => (i.materialGrade || 'PADRÃO') === grade);
                  return (
                      <div key={grade} className="bg-white border-x border-b border-slate-200 overflow-hidden last:rounded-b-2xl first:border-t mb-1">
                          <div className="bg-slate-50 p-2.5 flex items-center gap-3 border-b border-slate-100">
                               <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                               <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">LOTE: {grade}</span>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left min-w-[900px]">
                                  <thead className="bg-slate-20/30 text-slate-400 font-black text-[9px] uppercase border-b border-slate-100">
                                      {isBar ? (
                                        <tr>
                                          <th className="p-3.5 text-center w-16">QTD</th>
                                          <th className="p-3.5 w-48">DESCRIÇÃO</th>
                                          <th className="p-3.5 text-center w-24">BITOLA</th>
                                          <th className="p-3.5 text-center w-20">COMP</th>
                                          <th className="p-3.5">TÍTULO</th>
                                          <th className="p-3.5 w-32">Nº ESTOQUE</th>
                                          <th className="p-3.5 w-32 text-center">STATUS</th>
                                        </tr>
                                      ) : (
                                        <tr>
                                          <th className="p-3.5 w-20 text-center">QTD</th>
                                          <th className="p-3.5">DESCRIÇÃO / ESPECIFICAÇÃO</th>
                                          <th className="p-3.5 text-center w-32">BITOLA/ESP.</th>
                                          <th className="p-3.5 text-center w-32">MEDIDAS</th>
                                          <th className="p-3.5 w-40 text-center">STATUS</th>
                                        </tr>
                                      )}
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {gradeItems.map(item => {
                                          const activeJob = activeJobs.find(j => j.data.relatedItemIds?.includes(item.id));
                                          
                                          return (
                                              <tr key={item.id} className={`${activeJob ? 'bg-teal-50/50' : 'hover:bg-slate-50'} transition-colors`}>
                                                  <td className="p-3.5 text-center font-black text-slate-900 text-lg">{item.quantity}</td>
                                                  <td className="p-3.5 font-black text-slate-800 uppercase text-[11px] leading-tight">{item.name}</td>
                                                  
                                                  {isBar ? (
                                                    <>
                                                      <td className="p-3.5 text-center">
                                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-black text-[10px]">{item.gauge || '-'}</span>
                                                      </td>
                                                      <td className="p-3.5 text-center font-black text-slate-800 text-base">{formatNum(item.lengthMm)}</td>
                                                      <td className="p-3.5 font-bold text-slate-500 uppercase text-[9px]">{item.details || '-'}</td>
                                                      <td className="p-3.5 font-black text-indigo-400 text-[9px] uppercase">{item.drawingNumber || '-'}</td>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <td className="p-3.5 text-center font-bold text-indigo-600 text-lg">{item.gauge || '-'}</td>
                                                      <td className="p-3.5 text-center font-bold text-slate-600 text-sm">
                                                        {item.widthMm ? `${formatNum(item.widthMm)}x${formatNum(item.lengthMm)}` : `${formatNum(item.lengthMm)}mm`}
                                                      </td>
                                                    </>
                                                  )}

                                                  <td className="p-3.5 text-center">
                                                      {activeJob ? (
                                                          <div className="bg-white border border-teal-200 p-2 rounded-xl flex flex-col gap-0.5 shadow-sm">
                                                              <div className="text-[7px] font-black text-teal-600 uppercase flex items-center gap-1 animate-pulse"><Zap size={8} fill="currentColor"/> {activeJob.data.serviceType}</div>
                                                              <div className="text-[8px] font-bold text-slate-800 truncate">{activeJob.data.funcionario}</div>
                                                          </div>
                                                      ) : (
                                                          <div className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border w-fit mx-auto ${item.productionStatus === 'DONE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{item.productionStatus || 'Pronto'}</div>
                                                      )}
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  if (selectedProject) {
      const bars = selectedProject.materials.filter(m => m.type === MaterialType.BAR);
      const sheets = selectedProject.materials.filter(m => m.type === MaterialType.SHEET);
      const commercials = selectedProject.materials.filter(m => m.type === MaterialType.COMMERCIAL);

      return (
          <div className="animate-fade-in space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setSelectedProject(null)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all"><ArrowLeft size={20}/></button>
                      <div>
                          <h2 className="text-xl font-black text-slate-900 uppercase leading-none tracking-tighter">{selectedProject.opNumber} — {selectedProject.client}</h2>
                          <p className="text-indigo-600 font-black mt-1 text-[9px] uppercase tracking-widest">{selectedProject.description}</p>
                      </div>
                  </div>
                  <button onClick={() => updateStatus(selectedProject.id, ProjectStatus.COMPLETED)} className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95">Concluir Ordem</button>
              </div>
              
              {renderTable(bars, "Corte de Barras e Perfis", <Box size={18} />, "bg-orange-600", MaterialType.BAR)}
              {renderTable(sheets, "Corte de Chapas e Dobra", <Layers size={18} />, "bg-indigo-600", MaterialType.SHEET)}
              {renderTable(commercials, "Itens Comerciais e Acessórios", <ShoppingCart size={18} />, "bg-purple-600", MaterialType.COMMERCIAL)}
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="bg-teal-600 p-2.5 rounded-xl shadow-lg shadow-teal-100"><Hammer className="text-white" size={20} /></div>
          <div><h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Chão de Fábrica</h2><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Acompanhamento de OPs Liberadas</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productionProjects.length === 0 && <div className="col-span-full py-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center"><p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Nenhuma OP aguardando execução.</p></div>}
        {productionProjects.map(project => <ProjectCard key={project.id} project={project} onDelete={() => onDeleteProject?.(project.id)} onEdit={() => onEditProject?.(project)} actionButton={<button onClick={() => setSelectedProject(project)} className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-2 shadow-lg hover:bg-teal-700 transition-all uppercase tracking-widest"><Play size={16} fill="white" /> Entrar na OP</button>} />)}
      </div>
    </div>
  );
};
