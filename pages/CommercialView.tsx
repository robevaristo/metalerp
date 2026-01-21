
import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, MaterialType, MaterialItem } from '../types';
import { Plus, ArrowRight, Save, Trash2, X, Tag, FileSpreadsheet, Box, Layers, ShoppingCart, AlertCircle } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';

interface CommercialViewProps {
  projects: Project[];
  addProject: (p: Project) => void;
  updateProject: (p: Project) => void;
  deleteProject: (id: string) => void;
  updateStatus: (id: string, status: ProjectStatus) => void;
  projectToEdit?: Project | null;
  clearProjectToEdit?: () => void;
  onOpenImport?: () => void;
}

export const CommercialView: React.FC<CommercialViewProps> = ({ projects, addProject, updateProject, deleteProject, updateStatus, projectToEdit, clearProjectToEdit, onOpenImport }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [opNumber, setOpNumber] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [implantationDate, setImplantationDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [items, setItems] = useState<any[]>([]);
  const [manualType, setManualType] = useState<MaterialType>(MaterialType.BAR);
  const [currentItem, setCurrentItem] = useState<any>({ 
    quantity: 1, description: '', gauge: '', widthMm: '', lengthMm: '', details: '', drawingNumber: '', material: ''
  });

  const commercialProjects = projects.filter(p => p.status === ProjectStatus.COMMERCIAL);

  const resetForm = () => {
    setEditingId(null); setOpNumber(''); setClient(''); setDescription(''); setItems([]); setIsFormOpen(false);
    if (clearProjectToEdit) clearProjectToEdit();
  };

  const handleEditClick = (project: Project) => {
      setEditingId(project.id); setOpNumber(project.opNumber); setClient(project.client); setDescription(project.description); setImplantationDate(project.implantationDate);
      const combined = (project.materials || []).map(m => ({
          id: m.id, quantity: m.quantity, description: m.name, type: m.type, gauge: m.gauge, widthMm: m.widthMm, lengthMm: m.lengthMm, details: m.details, drawingNumber: m.drawingNumber, material: m.materialGrade
      }));
      setItems(combined); setIsFormOpen(true);
  };

  useEffect(() => { if (projectToEdit) handleEditClick(projectToEdit); }, [projectToEdit]);

  const handleAddItem = () => {
    setItems([...items, { id: crypto.randomUUID(), ...currentItem, type: manualType }]);
    setCurrentItem({ quantity: 1, description: '', gauge: '', widthMm: '', lengthMm: '', details: '', drawingNumber: '', material: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const materialItems: MaterialItem[] = items.map(i => ({
        id: i.id,
        name: String(i.description || i.details || 'ITEM').toUpperCase(),
        quantity: Number(i.quantity) || 1,
        type: i.type,
        unit: 'pç',
        inStock: false,
        materialGrade: String(i.material || "SAE 1020").toUpperCase(),
        gauge: String(i.gauge || "").toUpperCase(),
        widthMm: parseFloat(i.widthMm) || 0,
        lengthMm: parseFloat(i.lengthMm) || 0,
        details: String(i.details || i.description || "").toUpperCase(),
        drawingNumber: i.drawingNumber || '-',
        purchaseStatus: 'PENDING'
    }));

    if (editingId) {
        const p = projects.find(x => x.id === editingId);
        if (p) updateProject({ ...p, opNumber, client, description, materials: materialItems, implantationDate });
    } else {
        addProject({
            id: crypto.randomUUID(), opNumber, client, description, items: [], materials: materialItems, implantationDate, status: ProjectStatus.COMMERCIAL, createdAt: new Date().toISOString()
        });
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3"><Tag className="text-teal-600" /> <h2 className="text-2xl font-black uppercase tracking-tighter">Painel de OPs</h2></div>
        {!isFormOpen && (
            <div className="flex gap-4">
                <button onClick={onOpenImport} className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase shadow-lg"><FileSpreadsheet size={18}/> Importar Planilha</button>
                <button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase shadow-lg"><Plus size={18}/> Nova OP Manual</button>
            </div>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-2xl animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
          <div className="flex justify-between mb-8 pb-4 border-b">
            <div>
                <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-900 leading-none">Proposta Técnica</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Seguindo os Modelos: Barras, Chapas e Comerciais</p>
            </div>
            <button onClick={resetForm} className="p-3 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border"><label className="text-[9px] font-black uppercase text-slate-400">Número OP</label><input required value={opNumber} onChange={e => setOpNumber(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl border-slate-200 font-black text-lg outline-none uppercase shadow-inner" /></div>
                <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border"><label className="text-[9px] font-black uppercase text-slate-400">Cliente / Interessado</label><input required value={client} onChange={e => setClient(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl border-slate-200 font-black text-lg outline-none uppercase shadow-inner" /></div>
                <div className="bg-slate-50 p-4 rounded-2xl border"><label className="text-[9px] font-black uppercase text-slate-400">Data Implantação</label><input type="date" value={implantationDate} onChange={e => setImplantationDate(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl border-slate-200 font-black outline-none shadow-inner" /></div>
            </div>

            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Adicionar Material</h4>
                    <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                        <button type="button" onClick={() => setManualType(MaterialType.SHEET)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${manualType === MaterialType.SHEET ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400'}`}>Chapa</button>
                        <button type="button" onClick={() => setManualType(MaterialType.BAR)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${manualType === MaterialType.BAR ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400'}`}>Barra</button>
                        <button type="button" onClick={() => setManualType(MaterialType.COMMERCIAL)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${manualType === MaterialType.COMMERCIAL ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Comercial</button>
                    </div>
                </div>

                <div className="grid grid-cols-8 gap-3 mb-4">
                    <div className="col-span-1"><label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">QTDE</label><input type="number" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})} className="w-full p-4 rounded-xl border bg-white font-black text-center text-lg shadow-sm" /></div>
                    <div className="col-span-2"><label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Descrição / Título</label><input value={currentItem.description} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} className="w-full p-4 rounded-xl border bg-white font-black uppercase shadow-sm" /></div>
                    <div className="col-span-1"><label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Bitola</label><input value={currentItem.gauge} onChange={e => setCurrentItem({...currentItem, gauge: e.target.value})} className="w-full p-4 rounded-xl border bg-white font-black text-center shadow-sm" /></div>
                    {manualType === MaterialType.SHEET && <div className="col-span-1"><label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Largura</label><input value={currentItem.widthMm} onChange={e => setCurrentItem({...currentItem, widthMm: e.target.value})} className="w-full p-4 rounded-xl border bg-white font-black text-center shadow-sm" /></div>}
                    <div className="col-span-1"><label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Comp</label><input value={currentItem.lengthMm} onChange={e => setCurrentItem({...currentItem, lengthMm: e.target.value})} className="w-full p-4 rounded-xl border bg-white font-black text-center shadow-sm" /></div>
                    <div className="col-span-1"><label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Nº Estoque</label><input value={currentItem.drawingNumber} onChange={e => setCurrentItem({...currentItem, drawingNumber: e.target.value})} className="w-full p-4 rounded-xl border bg-white font-black uppercase shadow-sm" /></div>
                    <div className="col-span-1"><label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Material</label><input value={currentItem.material} onChange={e => setCurrentItem({...currentItem, material: e.target.value})} className="w-full p-4 rounded-xl border bg-white font-black uppercase shadow-sm" /></div>
                </div>

                <button type="button" onClick={handleAddItem} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:brightness-110 transition-all">+ ADICIONAR ITEM À LISTA</button>

                <div className="mt-10 space-y-8">
                    {/* TABELA CHAPAS - MODELO EXATO ANEXO */}
                    {items.filter(i => i.type === MaterialType.SHEET).length > 0 && (
                        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-md">
                            <div className="p-4 bg-teal-600 text-white font-black text-[11px] uppercase tracking-widest">TABELA: ITENS DE CHAPA</div>
                            <table className="w-full text-left text-[10px] font-bold uppercase">
                                <thead className="bg-slate-50 text-slate-400 border-b">
                                    <tr>
                                        <th className="p-4 text-center w-20">QTDE</th>
                                        <th className="p-4 text-center w-32">BITOLA</th>
                                        <th className="p-4 text-center w-24">LARGURA</th>
                                        <th className="p-4 text-center w-24">COMPRIMENTO</th>
                                        <th className="p-4">TÍTULO</th>
                                        <th className="p-4 text-center w-32">Nº ESTOQUE</th>
                                        <th className="p-4">MATERIAL</th>
                                        <th className="p-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.filter(i => i.type === MaterialType.SHEET).map(i => (
                                        <tr key={i.id} className="hover:bg-slate-50 transition-all">
                                            <td className="p-4 font-black text-2xl text-slate-900 text-center">{i.quantity}</td>
                                            <td className="p-4 text-center text-teal-600 font-black">{i.gauge}</td>
                                            <td className="p-4 text-center">{i.widthMm || '-'}</td>
                                            <td className="p-4 text-center">{i.lengthMm || '-'}</td>
                                            <td className="p-4 text-slate-900 font-black">{i.description || i.details}</td>
                                            <td className="p-4 text-center text-slate-400">{i.drawingNumber || '-'}</td>
                                            <td className="p-4 font-black">{i.material || 'SAE 1020'}</td>
                                            <td className="p-4"><button type="button" onClick={() => setItems(items.filter(x => x.id !== i.id))} className="text-red-400"><Trash2 size={18}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TABELA BARRAS - MODELO EXATO ANEXO */}
                    {items.filter(i => i.type === MaterialType.BAR).length > 0 && (
                        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-md">
                            <div className="p-4 bg-orange-600 text-white font-black text-[11px] uppercase tracking-widest">TABELA: BARRAS E PERFIS</div>
                            <table className="w-full text-left text-[10px] font-bold uppercase">
                                <thead className="bg-slate-50 text-slate-400 border-b">
                                    <tr>
                                        <th className="p-4 text-center w-20">QTDE</th>
                                        <th className="p-4">DESCRIÇÃO</th>
                                        <th className="p-4 text-center w-32">BITOLA</th>
                                        <th className="p-4 text-center w-32">COMP</th>
                                        <th className="p-4">TÍTULO</th>
                                        <th className="p-4 text-center w-32">Nº ESTOQUE</th>
                                        <th className="p-4">MATERIAL</th>
                                        <th className="p-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.filter(i => i.type === MaterialType.BAR).map(i => (
                                        <tr key={i.id} className="hover:bg-slate-50 transition-all">
                                            <td className="p-4 font-black text-2xl text-slate-900 text-center">{i.quantity}</td>
                                            <td className="p-4 font-black">{i.description || i.details}</td>
                                            <td className="p-4 text-center text-orange-600 font-black">{i.gauge}</td>
                                            <td className="p-4 text-center font-black">{i.lengthMm || '-'}</td>
                                            <td className="p-4 text-slate-400 italic">{i.details || '-'}</td>
                                            <td className="p-4 text-center text-slate-400">{i.drawingNumber || '-'}</td>
                                            <td className="p-4 font-black">{i.material || 'SAE 1020'}</td>
                                            <td className="p-4"><button type="button" onClick={() => setItems(items.filter(x => x.id !== i.id))} className="text-red-400"><Trash2 size={18}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TABELA COMERCIAL - MODELO EXATO ANEXO */}
                    {items.filter(i => i.type === MaterialType.COMMERCIAL).length > 0 && (
                        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-md">
                            <div className="p-4 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest">TABELA: ITENS COMERCIAIS</div>
                            <table className="w-full text-left text-[10px] font-bold uppercase">
                                <thead className="bg-slate-50 text-slate-400 border-b">
                                    <tr>
                                        <th className="p-4 text-center w-20">QTDE</th>
                                        <th className="p-4">DESCRIÇÃO</th>
                                        <th className="p-4 text-center w-40">Nº ESTOQUE</th>
                                        <th className="p-4">MATERIAL</th>
                                        <th className="p-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.filter(i => i.type === MaterialType.COMMERCIAL).map(i => (
                                        <tr key={i.id} className="hover:bg-slate-50 transition-all">
                                            <td className="p-4 font-black text-3xl text-slate-900 text-center">{i.quantity}</td>
                                            <td className="p-4">
                                                <span className="text-slate-900 font-black text-[11px] block">{i.description || i.details}</span>
                                                <span className="text-[8px] text-slate-400">{i.gauge}</span>
                                            </td>
                                            <td className="p-4 text-center text-indigo-600 font-black">{i.drawingNumber || 'COMERCIAL'}</td>
                                            <td className="p-4 font-black">{i.material || 'SAE 1020'}</td>
                                            <td className="p-4"><button type="button" onClick={() => setItems(items.filter(x => x.id !== i.id))} className="text-red-400"><Trash2 size={18}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-end gap-4">
                <button type="submit" className="bg-teal-600 text-white px-16 py-5 rounded-full font-black uppercase text-xs shadow-2xl flex items-center gap-2 hover:bg-teal-700 transition-all">
                    <Save size={20}/> Salvar Proposta Completa
                </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {commercialProjects.map(p => <ProjectCard key={p.id} project={p} onEdit={() => handleEditClick(p)} onDelete={() => deleteProject(p.id)} actionButton={p.status === ProjectStatus.COMMERCIAL && <button onClick={() => updateStatus(p.id, ProjectStatus.ENGINEERING)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-teal-600 transition-all">Liberar p/ Projeto</button>} />)}
        {commercialProjects.length === 0 && !isFormOpen && (
             <div className="col-span-full py-24 text-center border-4 border-dashed rounded-[3rem] border-slate-200 bg-white/50">
                 <AlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
                 <p className="font-black text-slate-300 uppercase text-xs tracking-[0.4em]">Nenhuma proposta pendente.</p>
            </div>
        )}
      </div>
    </div>
  );
};
