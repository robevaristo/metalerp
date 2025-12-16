import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, ProjectItem } from '../types';
import { Plus, ArrowRight, Save, Trash2, ListPlus, CheckCircle, X } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';

interface CommercialViewProps {
  projects: Project[];
  addProject: (p: Project) => void;
  updateProject: (p: Project) => void;
  deleteProject: (id: string) => void;
  updateStatus: (id: string, status: ProjectStatus) => void;
  projectToEdit?: Project | null;
  clearProjectToEdit?: () => void;
}

export const CommercialView: React.FC<CommercialViewProps> = ({ projects, addProject, updateProject, deleteProject, updateStatus, projectToEdit, clearProjectToEdit }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [opNumber, setOpNumber] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [implantationDate, setImplantationDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Item Entry State
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [currentItem, setCurrentItem] = useState({ description: '', quantity: 1 });

  const resetForm = () => {
    setEditingId(null);
    setOpNumber('');
    setClient('');
    setDescription('');
    setImplantationDate(new Date().toISOString().split('T')[0]);
    setItems([]);
    setIsFormOpen(false);
    if (clearProjectToEdit) clearProjectToEdit();
  };

  const handleEditClick = (project: Project) => {
      setEditingId(project.id);
      setOpNumber(project.opNumber);
      setClient(project.client);
      setDescription(project.description);
      setImplantationDate(project.implantationDate);
      setItems([...project.items]);
      setIsFormOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle incoming edit request from App
  useEffect(() => {
    if (projectToEdit) {
        handleEditClick(projectToEdit);
    }
  }, [projectToEdit]);

  const handleAddItem = () => {
    if (!currentItem.description) return;
    setItems([...items, { id: crypto.randomUUID(), ...currentItem }]);
    setCurrentItem({ description: '', quantity: 1 });
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
        alert("Adicione pelo menos um item à proposta.");
        return;
    }

    if (editingId) {
        const projectToUpdate = projects.find(p => p.id === editingId);
        if (projectToUpdate) {
            updateProject({
                ...projectToUpdate,
                opNumber,
                client,
                description: description || `Proposta ${opNumber}`,
                items: items,
                implantationDate
            });
        }
    } else {
        const newProject: Project = {
            id: crypto.randomUUID(),
            opNumber,
            client,
            description: description || `Proposta ${opNumber}`,
            items: items,
            implantationDate,
            status: ProjectStatus.COMMERCIAL,
            materials: [],
            createdAt: new Date().toISOString()
        };
        addProject(newProject);
    }
    resetForm();
  };

  // Sort by newest first
  const commercialProjects = [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Comercial & Propostas</h2>
        {!isFormOpen && (
            <button 
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
            <Plus size={20} /> Nova OP
            </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-lg animate-fade-in-down mb-6 relative z-30">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="font-bold text-lg text-slate-800">
                {editingId ? 'Editar Proposta / OP' : 'Cadastrar Nova Proposta Comercial'}
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-red-500">
                <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Número Proposta / OP</label>
                    <input required type="text" value={opNumber} onChange={e => setOpNumber(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 0831-25" />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Cliente</label>
                    <input required type="text" value={client} onChange={e => setClient(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nome do Cliente" />
                </div>
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Data</label>
                    <input required type="date" value={implantationDate} onChange={e => setImplantationDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-4">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Título / Descrição Geral</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Pedido Mancais e Calhas" />
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><ListPlus size={18} /> Itens da Proposta</h4>
                <div className="flex gap-2 mb-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Descrição do Item</label>
                        <input type="text" value={currentItem.description} onChange={e => setCurrentItem({...currentItem, description: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddItem())} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none" placeholder="Ex: Mancal fundido fixo Omeco Ø30" />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Qtd</label>
                        <input type="number" min="1" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: parseInt(e.target.value)})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddItem())} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none" />
                    </div>
                    <button type="button" onClick={handleAddItem} className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 flex items-center gap-2"><Plus size={18} /> Add</button>
                </div>
                {items.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600"><tr><th className="p-2 pl-3">Descrição</th><th className="p-2 w-20">Qtd</th><th className="p-2 w-10"></th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="p-2 pl-3 font-medium text-slate-700">{idx + 1}. {item.description}</td>
                                        <td className="p-2 text-slate-900 font-bold">{item.quantity}</td>
                                        <td className="p-2 text-center">
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveItem(item.id)} 
                                                className="text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 size={16} className="pointer-events-none" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {items.length === 0 && <p className="text-center text-sm text-slate-400 py-2 italic">Nenhum item adicionado ainda.</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-500/30"><Save size={18} /> {editingId ? 'Atualizar Proposta' : 'Salvar Nova Proposta'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-0">
        {commercialProjects.length === 0 && !isFormOpen && (
          <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-400">Nenhuma proposta comercial ativa.</p>
          </div>
        )}
        {commercialProjects.map(project => {
            const isActive = project.status === ProjectStatus.COMMERCIAL;
            
            return (
              <ProjectCard 
                key={project.id} 
                project={project}
                onEdit={() => handleEditClick(project)}
                onDelete={() => deleteProject(project.id)}
                actionButton={
                  isActive ? (
                      <button 
                        onClick={() => updateStatus(project.id, ProjectStatus.ENGINEERING)}
                        className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm font-medium flex items-center justify-center gap-2"
                      >
                        Implantar (Enviar p/ Projeto) <ArrowRight size={16} />
                      </button>
                  ) : (
                      <div className="w-full py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                         <CheckCircle size={16} /> Etapa: {project.status}
                      </div>
                  )
                }
              />
            );
        })}
      </div>
    </div>
  );
};