import React, { useState } from 'react';
import { Project, ProjectStatus, MaterialType, ProductionStatus, MaterialItem, ProductionProcess } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Play, 
  Box,
  Hammer,
  Split,
  AlertCircle,
  PackageCheck,
  Settings,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Square,
  CheckSquare,
  History,
  CalendarClock,
  FileText,
  Tag,
  Hash,
  Search
} from 'lucide-react';

interface ProductionViewProps {
  projects: Project[];
  updateProject: (p: Project) => void;
  updateStatus: (id: string, status: ProjectStatus) => void;
  productionProcesses: ProductionProcess[];
  updateProductionProcesses: (processes: ProductionProcess[]) => void;
  onEditProject?: (p: Project) => void;
  onDeleteProject?: (id: string) => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({ projects, updateProject, updateStatus, productionProcesses, updateProductionProcesses, onEditProject, onDeleteProject }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // History Modal State
  const [historyItem, setHistoryItem] = useState<MaterialItem | null>(null);

  // Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // New Process Form State
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessColor, setNewProcessColor] = useState<ProductionProcess['color']>('blue');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // LOGIC FIX: Show project if it is officially in PRODUCTION, COMPLETED
  // OR if it has ANY delivered items (Bar/Sheet) regardless of being in PCP or PURCHASING.
  const productionProjects = projects.filter(p => 
      p.status === ProjectStatus.PRODUCTION || 
      p.status === ProjectStatus.COMPLETED ||
      (
        (p.status === ProjectStatus.PURCHASING || p.status === ProjectStatus.PCP) && 
        p.materials.some(m => (m.type === MaterialType.BAR || m.type === MaterialType.SHEET) && m.inStock)
      )
  );

  // --- CONFIGURATION HANDLERS ---
  const handleAddProcess = () => {
      if(!newProcessName.trim()) return;
      const newProcess: ProductionProcess = {
          id: newProcessName.toUpperCase().replace(/\s+/g, '_'),
          name: newProcessName,
          color: newProcessColor
      };
      updateProductionProcesses([...productionProcesses, newProcess]);
      setNewProcessName('');
  };

  const handleRemoveProcess = (id: string) => {
      if(confirm('Tem certeza? Isso não afetará itens que já estão neste status, mas removerá a opção para novos.')) {
        updateProductionProcesses(productionProcesses.filter(p => p.id !== id));
      }
  };

  // --- SELECTION HANDLERS ---
  const toggleSelect = (id: string) => {
      // Prevent selecting DONE items logic handled in UI, but good to have safeguard here
      const item = selectedProject?.materials.find(m => m.id === id);
      if (item?.productionStatus === 'DONE') return;

      const newSet = new Set(selectedItems);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedItems(newSet);
  };

  const toggleSelectAll = (items: MaterialItem[]) => {
      // Only select items that are NOT DONE
      const actionableItems = items.filter(i => i.productionStatus !== 'DONE');
      
      const allSelected = actionableItems.length > 0 && actionableItems.every(i => selectedItems.has(i.id));
      const newSet = new Set(selectedItems);
      
      if (allSelected) {
          actionableItems.forEach(i => newSet.delete(i.id));
      } else {
          actionableItems.forEach(i => newSet.add(i.id));
      }
      setSelectedItems(newSet);
  };

  const handleBulkAction = (newStatus: string) => {
      if (!selectedProject || !newStatus) return;
      
      const now = new Date().toISOString();

      const updatedMaterials = selectedProject.materials.map(m => {
          // Safety Check: Never update DONE items via bulk action
          if (selectedItems.has(m.id) && m.productionStatus !== 'DONE') {
              // Append to history
              const history = m.productionHistory || [];
              const newHistory = [...history, { status: newStatus, timestamp: now }];

              return { 
                  ...m, 
                  productionStatus: newStatus,
                  productionHistory: newHistory
              };
          }
          return m;
      });

      const updatedProject = { ...selectedProject, materials: updatedMaterials };
      updateProject(updatedProject);
      setSelectedProject(updatedProject);
      setSelectedItems(new Set()); // Clear selection
  };

  // --- ITEM ACTION HANDLERS ---
  const changeItemStatus = (materialId: string, newStatus: string) => {
    if (!selectedProject) return;

    // Safety Check: If item is DONE, do not allow change (unless explicitly reverted via some admin tool, but for now block it)
    const targetItem = selectedProject.materials.find(m => m.id === materialId);
    if (targetItem?.productionStatus === 'DONE') return;

    const now = new Date().toISOString();
    
    // Check if the item being changed is part of the selection
    const isSelected = selectedItems.has(materialId);
    
    // If it is selected, we apply the change to ALL selected items (Bulk Behavior)
    // If it is NOT selected, we apply only to this specific item
    const idsToUpdate = isSelected ? selectedItems : new Set([materialId]);

    const updatedMaterials = selectedProject.materials.map(m => {
        if (idsToUpdate.has(m.id)) {
            // Extra safety: don't update if this specific item in the bulk group is done
            if (m.productionStatus === 'DONE') return m;

            // Append to history
            const history = m.productionHistory || [];
            const newHistory = [...history, { status: newStatus, timestamp: now }];

            return { 
                ...m, 
                productionStatus: newStatus,
                productionHistory: newHistory
            };
        }
        return m;
    });

    const updatedProject = { ...selectedProject, materials: updatedMaterials };
    updateProject(updatedProject);
    setSelectedProject(updatedProject);
    
    // If we performed a bulk update triggered by a row action, clear selection
    if (isSelected) {
        setSelectedItems(new Set());
    }
  };

  // Helper to SPLIT a batch into individual items
  const splitItem = (materialId: string) => {
      if (!selectedProject) return;
      
      const itemToSplit = selectedProject.materials.find(m => m.id === materialId);
      if (!itemToSplit || itemToSplit.quantity <= 1) return;

      if (!confirm(`Deseja desmembrar este item de Qtd ${itemToSplit.quantity} em ${itemToSplit.quantity} linhas separadas para controle individual de produção?`)) return;

      const newItems: MaterialItem[] = [];
      const qty = itemToSplit.quantity;

      // Create N clones with Qty 1
      for (let i = 0; i < qty; i++) {
          newItems.push({
              ...itemToSplit,
              id: crypto.randomUUID(), // New Unique ID
              quantity: 1,
              // When splitting, we recalculate totalLengthCalc to be per unit
              // If original was TotalLength (e.g. 6000mm for 4 pieces), split should have 1500mm? 
              // Usually defined per unit in import. Assuming totalLengthCalc is per row total.
              // Re-calculating proper length based on unit length if available
              totalLengthCalc: itemToSplit.lengthMm ? (itemToSplit.lengthMm + (itemToSplit.lengthMm > 0 ? 4 : 0)) : (itemToSplit.totalLengthCalc ? itemToSplit.totalLengthCalc / qty : 0),
              
              productionStatus: 'WAITING', // Reset status for new split items
              productionHistory: [], // Reset history for clean start
              // Ensure we carry over stock info so the split items know they are funded
              inStock: true,
              qtyInStock: itemToSplit.totalLengthCalc ? itemToSplit.totalLengthCalc / qty : itemToSplit.qtyInStock,
              
              // Carry over technical data
              details: itemToSplit.details,
              stockNumber: itemToSplit.stockNumber,
              drawingNumber: itemToSplit.drawingNumber,
              baseDescription: itemToSplit.baseDescription,
              name: itemToSplit.name,
              gauge: itemToSplit.gauge
          });
      }

      // Replace original with new items
      // We use flatMap to replace the single item with the array of new items
      const updatedMaterials = selectedProject.materials.flatMap(m => {
          if (m.id === materialId) return newItems;
          return m;
      });

      const updatedProject = { ...selectedProject, materials: updatedMaterials };
      updateProject(updatedProject);
      setSelectedProject(updatedProject);
  };

  const getStatusBadge = (status?: ProductionStatus) => {
      if (!status || status === 'WAITING') {
          return <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200"><Clock size={14}/> Aguardando</span>;
      }
      if (status === 'DONE') {
          return <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded border border-green-200"><CheckCircle size={14}/> Finalizado</span>;
      }

      // Find custom process
      const process = productionProcesses.find(p => p.id === status);
      const colorMap: Record<string, string> = {
          blue: 'text-blue-600 bg-blue-100 border-blue-200',
          orange: 'text-orange-600 bg-orange-100 border-orange-200',
          red: 'text-red-600 bg-red-100 border-red-200',
          green: 'text-green-600 bg-green-100 border-green-200',
          purple: 'text-purple-600 bg-purple-100 border-purple-200',
          indigo: 'text-indigo-600 bg-indigo-100 border-indigo-200',
          pink: 'text-pink-600 bg-pink-100 border-pink-200',
          slate: 'text-slate-600 bg-slate-100 border-slate-200',
      };
      
      const colorClass = process ? colorMap[process.color] || colorMap.blue : colorMap.blue;

      return <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${colorClass}`}>{process ? process.name : status}</span>;
  };

  const calculateProgress = (project: Project) => {
      // Logic: If Project is PRODUCTION, count all bars.
      // If Partial (PCP/PURCHASING), count only DELIVERED bars.
      const isPartial = project.status !== ProjectStatus.PRODUCTION && project.status !== ProjectStatus.COMPLETED;
      
      const bars = project.materials.filter(m => 
          m.type === MaterialType.BAR && 
          (!isPartial || m.inStock) // Use inStock as definitive check
      );
      
      if (bars.length === 0) return 0;
      const completed = bars.filter(m => m.productionStatus === 'DONE').length;
      return Math.round((completed / bars.length) * 100);
  };

  // Helper for date formatting
  const formatHistoryDate = (isoString: string) => {
      const date = new Date(isoString);
      return {
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString().slice(0, 5) // HH:MM
      };
  };

  const renderHistoryModal = () => {
      if (!historyItem) return null;

      const history = historyItem.productionHistory || [];

      return (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm rounded-xl">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
                      <h3 className="font-bold text-lg flex items-center gap-2 text-slate-700">
                          <History size={20} className="text-blue-600"/> Histórico de Rastreabilidade
                      </h3>
                      <button onClick={() => setHistoryItem(null)}><X className="text-slate-400 hover:text-red-500" /></button>
                  </div>
                  <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
                      <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-bold mb-1">Item</div>
                          <div className="font-medium text-slate-800 text-lg">{historyItem.name}</div>
                          
                          {/* Expanded Details in Modal */}
                          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Dimensões/Qtd</span>
                                <span className="text-sm font-semibold text-slate-700">{historyItem.lengthMm ? `${historyItem.lengthMm}mm` : `Qtd: ${historyItem.quantity}`}</span>
                            </div>
                            {historyItem.drawingNumber && (
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Nº Desenho</span>
                                    <span className="text-sm font-bold text-purple-600 flex items-center gap-1">
                                        <FileText size={12}/> {historyItem.drawingNumber}
                                    </span>
                                </div>
                            )}
                            {historyItem.details && (
                                <div className="flex flex-col col-span-2">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Material</span>
                                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                        <Tag size={12}/> {historyItem.details}
                                    </span>
                                </div>
                            )}
                          </div>
                      </div>

                      <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                          {/* Initial State */}
                          <div className="relative pl-6">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 bg-slate-300 rounded-full border-2 border-white"></div>
                              <div className="text-sm font-bold text-slate-600">Aguardando Início</div>
                              <div className="text-xs text-slate-400">Status inicial</div>
                          </div>

                          {history.map((entry, idx) => {
                              const { date, time } = formatHistoryDate(entry.timestamp);
                              return (
                                  <div key={idx} className="relative pl-6 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                                      <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                          <div className="flex justify-between items-start mb-1">
                                              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                  {getStatusBadge(entry.status)}
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 border-t border-slate-100 pt-2">
                                              <span className="flex items-center gap-1"><CalendarClock size={12}/> {date}</span>
                                              <span className="font-mono font-bold bg-slate-100 px-1.5 rounded">{time}</span>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                          
                          {history.length === 0 && (
                              <div className="pl-6 text-sm text-slate-400 italic">
                                  Nenhum apontamento realizado ainda.
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="p-4 border-t bg-white rounded-b-lg flex justify-end">
                      <button 
                        onClick={() => setHistoryItem(null)}
                        className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200"
                      >
                          Fechar
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  // Helper for searching
  const getFilteredItems = (items: MaterialItem[]) => {
    if (!searchTerm) return items;
    const lowerTerm = searchTerm.toLowerCase();
    return items.filter(item => 
        item.name.toLowerCase().includes(lowerTerm) ||
        item.stockNumber?.toLowerCase().includes(lowerTerm) ||
        item.details?.toLowerCase().includes(lowerTerm) ||
        item.drawingNumber?.toLowerCase().includes(lowerTerm) ||
        (item.lengthMm && item.lengthMm.toString().includes(lowerTerm))
    );
  };

  if (selectedProject) {
      // Improved Status Logic
      // 1. Check if everything is in stock
      const allMaterialsInStock = selectedProject.materials.length > 0 && selectedProject.materials.every(m => m.inStock);
      
      // 2. Determine "Partial" vs "Ready" vs "Production"
      const isOfficialProduction = selectedProject.status === ProjectStatus.PRODUCTION;
      const isCompleted = selectedProject.status === ProjectStatus.COMPLETED;
      
      // Fix: Ready to start only if NOT finished, NOT already production, AND has materials.
      const isReadyToStart = !isCompleted && !isOfficialProduction && allMaterialsInStock;
      
      // Partial only if NOT completed, NOT production, and missing materials.
      const isPartial = !isCompleted && !isOfficialProduction && !allMaterialsInStock;

      // Filter Items to Show:
      // If Ready or Production: Show ALL bars.
      // If Partial: Show ONLY inStock bars.
      let barItems = selectedProject.materials.filter(m => 
          m.type === MaterialType.BAR && 
          (isOfficialProduction || isReadyToStart || isCompleted || m.inStock)
      );

      // Apply Search Filter
      barItems = getFilteredItems(barItems);
      
      const otherItems = selectedProject.materials.filter(m => m.type !== MaterialType.BAR);
      const progress = calculateProgress(selectedProject);

      // Select All Logic: Only count NON-DONE items
      const actionableBarItems = barItems.filter(i => i.productionStatus !== 'DONE');
      const allBarItemsSelected = actionableBarItems.length > 0 && actionableBarItems.every(i => selectedItems.has(i.id));

      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col animate-fade-in relative">
            
            {/* MODALS */}
            {isConfigOpen && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm rounded-xl">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-700">
                                <Settings size={20} /> Configurar Etapas
                            </h3>
                            <button onClick={() => setIsConfigOpen(false)}><X className="text-slate-400 hover:text-red-500" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-4">
                                Cadastre as etapas de produção disponíveis para seleção na fábrica.
                            </p>
                            
                            {/* List Existing */}
                            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                                {productionProcesses.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-2 border border-slate-100 rounded bg-slate-50">
                                        <span className={`text-sm font-bold px-2 py-0.5 rounded bg-${p.color}-100 text-${p.color}-700`}>
                                            {p.name}
                                        </span>
                                        <button onClick={() => handleRemoveProcess(p.id)} className="text-slate-400 hover:text-red-500">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add New */}
                            <div className="flex gap-2 items-center border-t border-slate-100 pt-4">
                                <input 
                                    type="text" 
                                    placeholder="Nome (Ex: Pintura)" 
                                    className="flex-1 p-2 border border-slate-300 rounded text-sm outline-none"
                                    value={newProcessName}
                                    onChange={e => setNewProcessName(e.target.value)}
                                />
                                <select 
                                    className="p-2 border border-slate-300 rounded text-sm bg-white"
                                    value={newProcessColor}
                                    onChange={e => setNewProcessColor(e.target.value as any)}
                                >
                                    <option value="blue">Azul</option>
                                    <option value="orange">Laranja</option>
                                    <option value="red">Vermelho</option>
                                    <option value="green">Verde</option>
                                    <option value="purple">Roxo</option>
                                    <option value="pink">Rosa</option>
                                    <option value="slate">Cinza</option>
                                </select>
                                <button 
                                    onClick={handleAddProcess}
                                    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {renderHistoryModal()}

            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                <div className="flex justify-between mb-4">
                    <button 
                        onClick={() => { setSelectedProject(null); setSearchTerm(''); }}
                        className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm"
                    >
                        <ArrowLeft size={16} /> Voltar para Painel
                    </button>
                    <button 
                        onClick={() => setIsConfigOpen(true)}
                        className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-sm font-medium px-3 py-1 rounded hover:bg-white transition-colors"
                    >
                        <Settings size={16} /> Configurar Processos
                    </button>
                </div>
                
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                <Hammer className="text-slate-600" />
                                Fábrica: {selectedProject.opNumber}
                            </h2>
                            {isPartial && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded border border-orange-200 font-bold">
                                    Produção Parcial
                                </span>
                            )}
                            {isReadyToStart && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 font-bold animate-pulse">
                                    Materiais Completos - Aguardando Início
                                </span>
                            )}
                            {isCompleted && (
                                <span className="text-xs bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 font-bold">
                                    Ordem Finalizada
                                </span>
                            )}
                        </div>
                        <p className="text-slate-600 mt-1">{selectedProject.description}</p>
                        <p className="text-sm text-slate-500 mt-1">Cliente: {selectedProject.client}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-500 mb-1">Progresso (Itens Liberados)</div>
                        <div className="w-48 h-4 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{progress}% Concluído</div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8 pb-32">
                
                {/* SEÇÃO DE BARRAS (CORTE E USINAGEM) - EXCEL STYLE */}
                <section>
                    <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Box className="text-blue-600" /> Lista de Produção (Barras & Perfis)
                        </h3>
                        
                        {/* SEARCH INPUT */}
                        <div className="relative w-64">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                             <input 
                                type="text" 
                                placeholder="Filtrar bitola, desenho..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    
                    {isPartial && (
                        <div className="mb-4 bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-blue-100">
                            <AlertCircle size={16} />
                            <span>
                                Modo Parcial: Exibindo apenas materiais já <b>Entregues</b>. Itens aguardando compra aparecerão aqui automaticamente assim que chegarem.
                            </span>
                        </div>
                    )}

                    {isReadyToStart && (
                        <div className="mb-4 bg-green-50 text-green-800 p-3 rounded-lg text-sm flex items-center gap-2 border border-green-100">
                            <PackageCheck size={16} />
                            <span>
                                <b>Pronto para iniciar!</b> Todos os materiais foram entregues pelo setor de Compras.
                            </span>
                        </div>
                    )}

                    {barItems.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded border border-dashed border-slate-200">
                             {searchTerm ? `Nenhum item encontrado para "${searchTerm}".` : 'Nenhuma barra liberada para produção no momento.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm min-h-[300px]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-4 border-b border-r border-slate-200 w-12 text-center">
                                            <button 
                                                onClick={() => toggleSelectAll(barItems)} 
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Selecionar Todos Pendentes"
                                                disabled={isCompleted}
                                            >
                                                {!isCompleted && (allBarItemsSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />)}
                                            </button>
                                        </th>
                                        <th className="p-4 border-b border-r border-slate-200 w-24 text-center">QTDE</th>
                                        <th className="p-4 border-b border-r border-slate-200">Descrição</th>
                                        <th className="p-4 border-b border-r border-slate-200 w-32">Bitola</th>
                                        <th className="p-4 border-b border-r border-slate-200 w-48">Dados Técnicos</th>
                                        <th className="p-4 border-b border-r border-slate-200 w-32">Comprimento</th>
                                        <th className="p-4 border-b border-r border-slate-200 w-48">Status Atual</th>
                                        <th className="p-4 border-b border-slate-200 w-56 text-center">Ações / Mover para</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {barItems.map(item => {
                                        const status = item.productionStatus || 'WAITING';
                                        const isSelected = selectedItems.has(item.id);
                                        const lastUpdate = item.productionHistory?.length ? item.productionHistory[item.productionHistory.length - 1].timestamp : null;
                                        const isDone = status === 'DONE';
                                        
                                        // Force done if project is completed (legacy/cleanup)
                                        const displayStatus = isCompleted ? 'DONE' : status;

                                        // Row coloring based on status and selection
                                        let rowBg = 'hover:bg-slate-50';
                                        if (isSelected) rowBg = 'bg-blue-50';
                                        else if (isDone || isCompleted) rowBg = 'bg-green-50/30';

                                        return (
                                            <tr key={item.id} className={`${rowBg} transition-colors group`}>
                                                <td className="p-4 text-center border-r border-slate-100">
                                                    <button 
                                                        onClick={() => !isDone && !isCompleted && toggleSelect(item.id)}
                                                        disabled={isDone || isCompleted}
                                                        className={`transition-colors ${isDone || isCompleted ? 'text-slate-200 cursor-not-allowed' : (isSelected ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500')}`}
                                                    >
                                                        {isDone || isCompleted ? <CheckCircle size={18} className="text-green-500" /> : (isSelected ? <CheckSquare size={18} /> : <Square size={18} />)}
                                                    </button>
                                                </td>
                                                <td className="p-4 text-center font-bold text-slate-800 border-r border-slate-100 relative">
                                                    {item.quantity}
                                                    {item.quantity > 1 && !isDone && !isCompleted && (
                                                        <div className="absolute top-0 right-0 p-1">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); splitItem(item.id); }}
                                                                className="text-slate-400 hover:text-blue-600 bg-white shadow-sm border border-slate-200 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-75 hover:scale-100"
                                                                title="Desmembrar este lote em itens unitários para produção"
                                                            >
                                                                <Split size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-slate-700 font-medium border-r border-slate-100">
                                                    {item.baseDescription || item.name}
                                                </td>
                                                <td className="p-4 text-slate-600 border-r border-slate-100">
                                                    {item.gauge || '-'}
                                                </td>
                                                <td className="p-4 border-r border-slate-100 text-xs">
                                                    <div className="flex flex-col gap-1.5">
                                                        {/* Material */}
                                                        {item.details && (
                                                            <div className="flex items-center gap-1.5" title="Material">
                                                                <Tag size={12} className="text-slate-400" />
                                                                <span className="font-semibold text-slate-700">{item.details}</span>
                                                            </div>
                                                        )}
                                                        {/* Drawing */}
                                                        {item.drawingNumber && (
                                                            <div className="flex items-center gap-1.5" title="Nº Desenho">
                                                                <FileText size={12} className="text-purple-400" />
                                                                <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                                                    {item.drawingNumber}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {/* Stock */}
                                                        {item.stockNumber && (
                                                            <div className="flex items-center gap-1.5" title="Nº Estoque">
                                                                <Hash size={12} className="text-slate-400" />
                                                                <span className="font-mono text-slate-500">{item.stockNumber}</span>
                                                            </div>
                                                        )}
                                                        {!item.details && !item.drawingNumber && !item.stockNumber && (
                                                            <span className="text-slate-300 italic">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono font-bold text-blue-700 border-r border-slate-100">
                                                    <div>{item.lengthMm} mm</div>
                                                    {/* Stock Availability Indicator */}
                                                    {item.inStock && item.qtyInStock !== undefined && (
                                                        <div className="flex items-center gap-1 text-[9px] text-green-600 bg-green-50 px-1 py-0.5 rounded mt-1 w-fit border border-green-100" title={`Matéria-prima: ${item.qtyInStock}mm disponíveis`}>
                                                            <CheckCircle size={8} /> MP Disponível: {item.qtyInStock}mm
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 border-r border-slate-100">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        {getStatusBadge(displayStatus)}
                                                        
                                                        <button 
                                                            onClick={() => setHistoryItem(item)}
                                                            className="text-blue-600 hover:text-blue-800 hover:underline text-[10px] font-bold flex items-center gap-1 mt-1 transition-colors"
                                                            title="Ver histórico detalhado de todas as etapas"
                                                        >
                                                            <History size={12} />
                                                            {lastUpdate ? `Último: ${formatHistoryDate(lastUpdate).time}` : 'Ver Histórico'}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {/* Dynamic Process Selector */}
                                                    <div className="relative">
                                                        <select
                                                            disabled={isDone || isCompleted}
                                                            className={`w-full p-2 pr-8 border border-slate-300 rounded text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-colors ${isDone || isCompleted ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 cursor-pointer hover:border-blue-400'}`}
                                                            value={displayStatus}
                                                            onChange={(e) => changeItemStatus(item.id, e.target.value)}
                                                        >
                                                            <option value="WAITING">⏱️ Aguardando</option>
                                                            <optgroup label="Processos">
                                                                {productionProcesses.map(proc => (
                                                                    <option key={proc.id} value={proc.id}>
                                                                        🔧 {proc.name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                            <option value="DONE">✅ Finalizado</option>
                                                        </select>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <ChevronDown size={14} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Outros Materiais (Só lista simples) */}
                {otherItems.length > 0 && (isOfficialProduction || isReadyToStart || isCompleted) && (
                     <section className="opacity-75">
                        <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Outros Materiais (Montagem/Acessórios)</h3>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                            <ul className="space-y-2">
                                {otherItems.map(item => (
                                    <li key={item.id} className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">{item.quantity} {item.unit} - {item.name}</span>
                                            {item.details && <span className="text-xs text-slate-500">{item.details}</span>}
                                        </div>
                                        {item.drawingNumber && (
                                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100 font-bold">
                                                Des: {item.drawingNumber}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                     </section>
                )}

                <div className="flex justify-end pt-6 border-t border-slate-200">
                     {isOfficialProduction ? (
                         <button 
                            onClick={() => {
                                if (confirm('Deseja marcar esta Ordem de Produção como CONCLUÍDA e arquivar?')) {
                                    updateStatus(selectedProject.id, ProjectStatus.COMPLETED);
                                    setSelectedProject(null);
                                }
                            }}
                            className={`px-6 py-3 rounded-lg font-bold text-white shadow-lg flex items-center gap-2 ${progress === 100 ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-400 hover:bg-slate-500'}`}
                         >
                            <CheckCircle size={20} /> Finalizar Ordem de Produção
                         </button>
                     ) : isCompleted ? (
                         <div className="px-6 py-3 rounded-lg font-bold text-white shadow-lg flex items-center gap-2 bg-slate-800 cursor-default">
                             <CheckCircle size={20} /> Produção Finalizada
                         </div>
                     ) : isReadyToStart ? (
                        <button 
                            onClick={() => updateStatus(selectedProject.id, ProjectStatus.PRODUCTION)}
                            className="px-6 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center gap-2"
                        >
                            <Play size={20} /> Iniciar Produção (Oficializar)
                        </button>
                     ) : (
                         <div className="text-sm text-slate-500 italic bg-yellow-50 px-4 py-2 rounded border border-yellow-200">
                             Esta OP ainda tem itens pendentes em Compras/PCP. Aguarde a chegada de todos os materiais.
                         </div>
                     )}
                </div>
            </div>

            {/* BULK ACTION BAR */}
            {selectedItems.size > 0 && !isCompleted && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-4 rounded-full shadow-2xl z-50 flex items-center gap-6 animate-fade-in-up border border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-sm border-r border-slate-600 pr-4">
                        <CheckSquare className="text-blue-400" size={20} />
                        {selectedItems.size} selecionados
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">Mover todos para:</span>
                        <div className="relative">
                            <select 
                                className="bg-slate-700 text-white border border-slate-600 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 appearance-none pr-8 cursor-pointer"
                                onChange={(e) => handleBulkAction(e.target.value)}
                                value=""
                            >
                                <option value="" disabled>Selecione a Etapa...</option>
                                <option value="WAITING">⏱️ Aguardando</option>
                                <optgroup label="Processos">
                                    {productionProcesses.map(proc => (
                                        <option key={proc.id} value={proc.id}>🔧 {proc.name}</option>
                                    ))}
                                </optgroup>
                                <option value="DONE">✅ Finalizado</option>
                            </select>
                             <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setSelectedItems(new Set())}
                        className="ml-2 text-slate-400 hover:text-white"
                        title="Cancelar seleção"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Fábrica & Produção</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productionProjects.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-400">Nenhuma OP liberada ou material entregue para fábrica no momento.</p>
          </div>
        )}
        
        {productionProjects.map(project => {
            const allMaterialsInStock = project.materials.length > 0 && project.materials.every(m => m.inStock);
            const isOfficialProduction = project.status === ProjectStatus.PRODUCTION;
            const isCompleted = project.status === ProjectStatus.COMPLETED;
            
            // Fix: Not ready if completed
            const isReadyToStart = !isCompleted && !isOfficialProduction && allMaterialsInStock;
            
            // For card progress, if ready, consider all bars.
            const progress = calculateProgress(project);
            
            return (
                <ProjectCard 
                    key={project.id} 
                    project={project}
                    onDelete={() => onDeleteProject?.(project.id)}
                    onEdit={() => onEditProject?.(project)}
                    actionButton={
                        <div className="space-y-3">
                            {/* Mini Progress Bar in Card */}
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full transition-all" style={{ width: `${progress}%` }}></div>
                            </div>
                            <button 
                                onClick={() => setSelectedProject(project)}
                                className={`w-full py-2 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors 
                                    ${isCompleted ? 'bg-slate-700 hover:bg-slate-800' : 
                                      isReadyToStart ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' : 
                                      (isOfficialProduction ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700')}`}
                            >
                                {isCompleted ? (
                                    <><CheckCircle size={16} /> Finalizado</>
                                ) : (
                                    <><Play size={16} fill="currentColor" /> {isReadyToStart ? 'Iniciar Produção' : (isOfficialProduction ? `Acessar Processos (${progress}%)` : 'Produção Parcial')}</>
                                )}
                            </button>
                            
                            {!isCompleted && (
                                isReadyToStart ? (
                                    <p className="text-[10px] text-center text-blue-600 font-bold flex items-center justify-center gap-1">
                                        <CheckCircle size={10} /> Materiais Completos
                                    </p>
                                ) : !isOfficialProduction && (
                                    <p className="text-[10px] text-center text-orange-600 font-semibold flex items-center justify-center gap-1">
                                        <Clock size={10} /> Aguardando Compras/PCP
                                    </p>
                                )
                            )}
                        </div>
                    }
                />
            );
        })}
      </div>
    </div>
  );
};