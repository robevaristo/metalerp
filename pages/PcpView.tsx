import React, { useState } from 'react';
import { Project, ProjectStatus, MaterialType, MaterialItem } from '../types';
import { ArrowLeft, Cpu, Trash2, Layers, Database, Box, ShoppingCart, Check, ClipboardList, AlertCircle, FileText, CheckCircle2, AlertTriangle, PackageCheck, Tag, Calculator, CheckCircle, PlusCircle, FileSpreadsheet } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';

interface PcpViewProps {
  projects: Project[];
  updateProject: (p: Project) => void;
  updateStatus: (id: string, status: ProjectStatus) => void;
  onEditProject?: (p: Project) => void;
  onDeleteProject?: (id: string) => void;
  onOpenImport?: (projectId: string) => void;
}

const formatNum = (val: number | undefined) => {
    if (val === undefined || val === null || val === 0) return "-";
    return Number(val.toFixed(2)).toString();
};

const getBarCategory = (name: string) => {
    const nameUpper = (name || '').toUpperCase();
    if (nameUpper.includes('ROSCADA')) return 'BARRA ROSCADA';
    if (nameUpper.includes('TREFILADA')) return 'BARRA TREFILADA';
    if (nameUpper.includes('TUBO')) return 'TUBO MECÂNICO';
    return 'BARRA LAMINADA';
};

const heuristicGauge = (text: string) => {
    const upper = text.toUpperCase();
    const diaMatch = upper.match(/Ø\s*([\d,./]+)/);
    if (diaMatch) return diaMatch[1].trim();
    const threadMatch = upper.match(/M\d+/);
    if (threadMatch) return threadMatch[0];
    const fracMatch = upper.match(/(\d+[./]\d+)/);
    if (fracMatch) return fracMatch[1].trim();
    return '';
};

const extractDiameterValue = (text: string) => {
    const match = text.match(/Ø\s*([\d,.]+)/);
    if (match) {
        return match[1].replace(',', '.');
    }
    return null;
};

const EditableCell: React.FC<{
    value: string | number;
    displayValue?: string;
    onSave: (newVal: string) => void;
    className?: string;
    isWarning?: boolean;
    type?: "text" | "number";
    placeholder?: string;
    suggestion?: string;
}> = ({ value, displayValue, onSave, className, isWarning, type = "text", placeholder, suggestion }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(String(value === 0 && type === "number" ? "" : value));

    if (isEditing) {
        return (
            <div className="flex items-center justify-center p-1">
                <input 
                    autoFocus
                    type={type}
                    className="w-full bg-white border-2 border-teal-500 rounded p-1 outline-none text-center font-black text-lg"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={() => { onSave(tempValue); setIsEditing(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
            </div>
        );
    }

    const isEmpty = !value || value === 'N/D' || value === '-' || value === '' || value === 'DEFINIR' || value === 0;

    return (
        <div 
            className={`flex flex-col items-center justify-center min-h-[50px] transition-all ${isEmpty ? 'w-full' : ''}`}
        >
            <div 
                onClick={() => setIsEditing(true)} 
                className={`cursor-pointer hover:bg-teal-50 rounded-xl px-2 py-1 flex items-center justify-center w-full ${isEmpty ? 'text-red-500 font-black border-2 border-dashed border-red-100 bg-red-50/50' : isWarning ? 'text-orange-500 bg-orange-50 rounded-lg' : className}`}
            >
                {isEmpty ? (placeholder || 'DEFINIR') : (displayValue || value)}
            </div>
            {isEmpty && suggestion && String(suggestion) !== String(value) && (
                <button 
                    onClick={() => onSave(suggestion)}
                    className="text-[7px] text-teal-600 bg-teal-50 px-2 py-1 rounded mt-1 font-black border border-teal-200 hover:bg-teal-600 hover:text-white transition-all animate-pulse uppercase"
                >
                    v.26.1 DETETADO: {suggestion}
                </button>
            )}
        </div>
    );
};

export const PcpView: React.FC<PcpViewProps> = ({ projects, updateProject, updateStatus, onDeleteProject, onOpenImport }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const pcpProjects = projects.filter(p => 
      p.status === ProjectStatus.PCP || 
      p.status === ProjectStatus.PURCHASING || 
      p.status === ProjectStatus.ENGINEERING
  );

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const handleUpdateItem = (itemId: string, field: keyof MaterialItem, value: any) => {
      if (!selectedProject) return;
      const updatedMaterials = selectedProject.materials.map(m => 
          m.id === itemId ? { ...m, [field]: value } : m
      );
      updateProject({ ...selectedProject, materials: updatedMaterials });
  };

  const handleDeleteItem = (itemId: string) => {
      if (!selectedProject || !window.confirm("Remover este item?")) return;
      const updated = { ...selectedProject, materials: selectedProject.materials.filter(m => m.id !== itemId) };
      updateProject(updated);
  };

  const renderTable = (materials: MaterialItem[], type: MaterialType) => {
    if (materials.length === 0) return null;
    const isSheet = type === MaterialType.SHEET;
    const isBar = type === MaterialType.BAR;

    return (
      <div className="mb-8 border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm bg-white animate-fade-in">
        <div className={`p-5 flex items-center justify-between text-white font-black text-[10px] uppercase tracking-[0.2em] ${isSheet ? 'bg-[#149283]' : isBar ? 'bg-[#E65100]' : 'bg-indigo-600'}`}>
          <div className="flex items-center gap-3">{isSheet ? <Layers size={18}/> : isBar ? <Box size={18}/> : <ShoppingCart size={18}/>} {type}</div>
          <div className="bg-white/20 px-4 py-1.5 rounded-full text-[9px] font-black">{materials.length} ITENS</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px] text-[10px] font-bold uppercase table-fixed">
            <thead className="bg-slate-50 text-slate-400 border-b">
              {isSheet ? (
                <tr>
                  <th className="p-4 text-center w-20">QTDE</th>
                  <th className="p-4 text-center w-36 bg-teal-50 text-teal-700">ESTOQUE (PÇ)</th>
                  <th className="p-4 text-center w-32">BITOLA</th>
                  <th className="p-4 text-center w-32">LARGURA</th>
                  <th className="p-4 text-center w-32">COMP</th>
                  <th className="p-4">TÍTULO</th>
                  <th className="p-4 w-36">MATERIAL</th>
                  <th className="p-4 w-16"></th>
                </tr>
              ) : isBar ? (
                <tr>
                  <th className="p-4 text-center w-20">QTDE</th>
                  <th className="p-4 text-center w-48 bg-orange-50 text-orange-700">SOBRA ESTOQUE (MM)</th>
                  <th className="p-4 w-56">DESCRIÇÃO TÉCNICA</th>
                  <th className="p-4 text-center w-28">BITOLA</th>
                  <th className="p-4 text-center w-24">COMP (PÇ)</th>
                  <th className="p-4 text-center w-36 bg-slate-100 text-slate-900 border-x border-slate-200">TOTAL BRUTO (MM)</th>
                  <th className="p-4 w-32">MATERIAL</th>
                  <th className="p-4 w-16"></th>
                </tr>
              ) : (
                <tr>
                  <th className="p-4 text-center w-20">QTDE</th>
                  <th className="p-4 text-center w-36 bg-indigo-50 text-indigo-700">ESTOQUE (PÇ)</th>
                  <th className="p-4">DESCRIÇÃO / MEDIDA</th>
                  <th className="p-4 w-32 text-center">BITOLA</th>
                  <th className="p-4 w-40 text-center">MATERIAL</th>
                  <th className="p-4 w-16"></th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materials.map(item => {
                const requiredMm = item.quantity * ((item.lengthMm || 0) + 4);
                const gaugeSuggestion = heuristicGauge(item.name + ' ' + (item.details || ''));
                const diameterVal = extractDiameterValue(item.name + ' ' + (item.details || ''));

                return (
                <tr key={item.id} className="hover:bg-slate-50 transition-all border-b border-slate-50 group">
                  <td className="p-4 text-center font-black text-slate-900 text-xl">{item.quantity}</td>
                  
                  <td className={`p-4 text-center border-x ${isSheet ? 'border-teal-100' : isBar ? 'border-orange-100' : 'border-indigo-100'}`}>
                      <div className="flex flex-col items-center gap-1.5">
                          {isBar ? (
                            <EditableCell type="number" className="font-black text-2xl text-slate-800" value={item.stockLengthMm || 0} displayValue={`${item.stockLengthMm || 0} mm`} onSave={(v) => handleUpdateItem(item.id, 'stockLengthMm', parseFloat(v) || 0)} placeholder="0 mm" />
                          ) : (
                            <EditableCell type="number" className="font-black text-2xl text-slate-800" value={item.qtyInStock || 0} onSave={(v) => handleUpdateItem(item.id, 'qtyInStock', parseInt(v) || 0)} placeholder="0" />
                          )}
                          <button onClick={() => isBar ? handleUpdateItem(item.id, 'stockLengthMm', Math.round(requiredMm)) : handleUpdateItem(item.id, 'qtyInStock', item.quantity)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[7px] font-black py-1.5 px-3 rounded-full flex items-center gap-1 transition-all uppercase tracking-widest shadow-sm">Atender Total</button>
                      </div>
                  </td>

                  {isSheet ? (
                    <>
                      <td className="p-4 text-center">
                          <EditableCell className="font-black text-indigo-600 text-lg" value={item.gauge || ''} onSave={(v) => handleUpdateItem(item.id, 'gauge', v)} placeholder="DEFINIR" suggestion={gaugeSuggestion} />
                      </td>
                      <td className="p-4 text-center">
                          <EditableCell type="number" className="font-black text-slate-700 text-lg" value={item.widthMm || 0} displayValue={formatNum(item.widthMm)} onSave={(v) => handleUpdateItem(item.id, 'widthMm', parseFloat(v) || 0)} placeholder="-" suggestion={diameterVal || undefined} />
                      </td>
                      <td className="p-4 text-center">
                          <EditableCell type="number" className="font-black text-slate-700 text-lg" value={item.lengthMm || 0} displayValue={formatNum(item.lengthMm)} onSave={(v) => handleUpdateItem(item.id, 'lengthMm', parseFloat(v) || 0)} placeholder="-" suggestion={diameterVal || undefined} />
                      </td>
                      <td className="p-4 font-bold text-slate-700 uppercase leading-tight text-[11px]">{item.name}</td>
                      <td className="p-4 text-slate-500 font-black text-[10px]">{item.materialGrade}</td>
                    </>
                  ) : isBar ? (
                    <>
                      <td className="p-4">
                          <div className="flex flex-col gap-1.5">
                              <span className="bg-indigo-600 text-white text-[7px] font-black px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-tighter w-fit"><Tag size={8}/> {getBarCategory(item.name)}</span>
                              <div className="font-black text-slate-900 uppercase text-[11px] leading-tight border-l-2 border-slate-200 pl-2">{item.name}</div>
                          </div>
                      </td>
                      <td className="p-4 text-center">
                          <EditableCell className="font-black text-[#E65100] text-lg" value={item.gauge || ''} onSave={(v) => handleUpdateItem(item.id, 'gauge', v)} placeholder="DEFINIR" suggestion={gaugeSuggestion} />
                      </td>
                      <td className="p-4 text-center">
                          <EditableCell type="number" className="font-black text-slate-700 text-lg" value={item.lengthMm || 0} displayValue={formatNum(item.lengthMm)} onSave={(v) => handleUpdateItem(item.id, 'lengthMm', parseFloat(v) || 0)} />
                      </td>
                      <td className="p-4 text-center bg-slate-50/50 border-x border-slate-100">
                           <div className="text-xl font-black text-slate-900 leading-none">{Math.round(requiredMm)}</div>
                           <div className="text-[7px] font-black text-slate-400 mt-2 uppercase tracking-widest flex items-center justify-center gap-1"><Calculator size={8}/> c/ corte</div>
                      </td>
                      <td className="p-4 text-slate-500 font-black text-center text-[10px]">{item.materialGrade}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 font-black text-slate-900 text-xs uppercase leading-tight">{item.name}</td>
                      <td className="p-4 text-center">
                          <EditableCell className="font-black text-indigo-600 text-sm" value={item.gauge || ''} onSave={(v) => handleUpdateItem(item.id, 'gauge', v)} placeholder="DEFINIR" suggestion={gaugeSuggestion} />
                      </td>
                      <td className="p-4 font-black text-indigo-600 text-sm uppercase text-center">{item.materialGrade}</td>
                    </>
                  )}
                  <td className="p-4 text-center"><button onClick={() => handleDeleteItem(item.id)} className="text-slate-200 group-hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50"><Trash2 size={20}/></button></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (selectedProject) {
    const hasMaterials = selectedProject.materials && selectedProject.materials.length > 0;

    return (
      <div className="animate-fade-in space-y-6">
        <div className="bg-white p-6 rounded-[2.5rem] border flex items-center justify-between shadow-sm border-t-4 border-indigo-600">
            <div className="flex items-center gap-4">
                <button onClick={() => setSelectedProjectId(null)} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-teal-600 shadow-inner"><ArrowLeft size={20}/></button>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">OP: {selectedProject.opNumber}</h2>
                    <p className="text-indigo-600 font-black uppercase text-[9px] tracking-[0.2em] mt-1.5">{selectedProject.client}</p>
                </div>
            </div>
            {hasMaterials && (
                <button onClick={() => updateStatus(selectedProject.id, ProjectStatus.PURCHASING)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-600 transition-all">Liberar Suprimentos</button>
            )}
        </div>

        {!hasMaterials ? (
            <div className="py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center text-center space-y-6">
                <AlertCircle size={64} className="text-slate-200" />
                <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Projeto sem Materiais</h3>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 max-w-sm">Esta OP ainda não possui itens cadastrados ou importados da planilha.</p>
                </div>
                <button onClick={() => onOpenImport?.(selectedProject.id)} className="bg-teal-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-teal-700 transition-all">
                    <FileSpreadsheet size={18}/> Importar Planilha Agora
                </button>
            </div>
        ) : (
            <div className="animate-fade-in">
                {renderTable(selectedProject.materials.filter(m => m.type === MaterialType.SHEET), MaterialType.SHEET)}
                {renderTable(selectedProject.materials.filter(m => m.type === MaterialType.BAR), MaterialType.BAR)}
                {renderTable(selectedProject.materials.filter(m => m.type === MaterialType.COMMERCIAL), MaterialType.COMMERCIAL)}
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 bg-white p-6 rounded-2xl border shadow-sm">
          <Database className="text-indigo-600" size={20} /> 
          <h2 className="text-xl font-black uppercase tracking-tighter">Painel PCP — Detalhamento Técnico</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {pcpProjects.length === 0 ? (
            <div className="col-span-full py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center text-center space-y-4">
                <ClipboardList size={48} className="text-slate-200" />
                <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.3em]">Nenhuma OP na fila do PCP no momento.</p>
            </div>
        ) : (
            pcpProjects.map(p => (
                <ProjectCard 
                    key={p.id} 
                    project={p} 
                    onDelete={() => onDeleteProject?.(p.id)} 
                    actionButton={
                        <button onClick={() => setSelectedProjectId(p.id)} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition-all">
                            <Cpu size={16}/> Analisar Detalhes da OP
                        </button>
                    } 
                />
            ))
        )}
      </div>
    </div>
  );
};