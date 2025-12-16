import React, { useState } from 'react';
import { Project, ProjectStatus, MaterialType, MaterialItem } from '../types';
import { ArrowLeft, Box, Cpu, Hammer, ShoppingCart, List, FileSpreadsheet, X, Upload, Send, CheckSquare, Square, CheckCircle, Plus, PieChart, Search, Trash2, StickyNote } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard';

interface PcpViewProps {
  projects: Project[];
  updateProject: (p: Project) => void;
  updateStatus: (id: string, status: ProjectStatus) => void;
  onEditProject?: (p: Project) => void;
  onDeleteProject?: (id: string) => void;
}

export const PcpView: React.FC<PcpViewProps> = ({ projects, updateProject, updateStatus, onEditProject, onDeleteProject }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const [activeTab, setActiveTab] = useState<MaterialType | 'ALL'>('ALL');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<MaterialType>(MaterialType.BAR);
  const [pastedData, setPastedData] = useState('');

  // Local state for material form
  const [newItem, setNewItem] = useState<Partial<MaterialItem>>({
    type: MaterialType.BAR,
    quantity: 1,
    unit: 'un',
    inStock: false,
    qtyInStock: 0
  });

  const pcpProjects = projects.filter(p => 
      p.status === ProjectStatus.PCP || 
      p.status === ProjectStatus.PURCHASING || 
      p.status === ProjectStatus.PRODUCTION || 
      p.status === ProjectStatus.COMPLETED
  );

  // --- Handlers ---
  
  const handleProcessExcel = () => {
    if (!pastedData.trim() || !selectedProject) return;
    const rows = pastedData.trim().split('\n');
    const newItems: MaterialItem[] = [];
    rows.forEach(row => {
        // Ignora cabeçalhos comuns
        const lower = row.toLowerCase();
        if (lower.includes('titulo') || lower.includes('descricao') || lower.includes('qtde') || lower.includes('espessura')) return;
        
        const cols = row.split('\t');
        if (cols.length < 2) return;
        
        let item: MaterialItem = {
            id: crypto.randomUUID(), inStock: false, qtyInStock: 0, unit: 'un', type: importType, name: 'Item Importado', quantity: 0, purchaseStatus: 'PENDING'
        };

        if (importType === MaterialType.SHEET) {
            // Mapeamento baseado na imagem do usuário:
            // Col 0: Espessura
            // Col 1: Dimensao 1 (Largura)
            // Col 2: Dimensao 2 (Comprimento)
            // Col 3: QTDE
            // Col 4: Titulo (Nome do Item)
            // Col 5: Numero de estoque
            // Col 6: Material

            const thickness = cols[0]?.trim() || '';
            const dim1 = cols[1]?.trim() || '';
            const dim2 = cols[2]?.trim() || '';
            
            const qtyStr = cols[3]?.replace(',', '.') || '0';
            const qty = parseFloat(qtyStr);

            const title = cols[4]?.trim() || 'Sem Título';
            const stockNum = cols[5]?.trim() || '';
            const materialRaw = cols[6]?.trim() || '';

            item.name = title; 
            item.quantity = qty; 
            item.stockNumber = stockNum; 
            item.unit = 'pç';
            // Organiza os detalhes visuais com as dimensões
            item.details = `${materialRaw} | ${thickness}mm x ${dim1}mm x ${dim2}mm`;

        } else if (importType === MaterialType.BAR) {
            const qty = parseFloat(cols[0]?.replace(',', '.') || '0');
            const descBase = cols[1]?.trim() || '';
            const gauge = cols[2]?.trim() || '';
            const lengthStr = cols[3]?.replace(',', '.') || '0';
            const lengthMm = parseFloat(lengthStr);
            const stockNum = cols[4]?.trim() || '';
            const material = cols[5]?.trim() || '';
            const drawing = cols[6]?.trim() || '';
            const consolidatedName = `${descBase} ${gauge}`.trim();
            
            // ALTERAÇÃO: Sempre adiciona 4mm de perda de serra por peça, mesmo se Qtd=1.
            // Isso garante que a soma total para Compras inclua os cortes.
            let totalLengthMm = lengthMm > 0 ? qty * (lengthMm + 4) : 0;

            item.name = consolidatedName || 'Item Sem Nome'; item.baseDescription = descBase; item.gauge = gauge;
            item.quantity = qty; item.unit = 'pç'; item.lengthMm = lengthMm; item.totalLengthCalc = totalLengthMm;
            item.stockNumber = stockNum; item.details = material; item.drawingNumber = drawing;
        } else if (importType === MaterialType.COMMERCIAL) {
            const qty = parseFloat(cols[0]?.replace(',', '.') || '0');
            const desc = cols[1] || 'Item Comercial';
            const material = cols[2] || '';
            item.name = desc; item.quantity = qty; item.details = material; item.unit = 'un'; item.assignedTo = 'Almoxarifado';
        }
        if (item.quantity > 0) newItems.push(item);
    });
    const updatedProject = { ...selectedProject, materials: [...selectedProject.materials, ...newItems] };
    updateProject(updatedProject);
    setPastedData('');
    setIsImportModalOpen(false);
  };

  const handleAddMaterial = () => {
    if (!selectedProject || !newItem.name) return;
    const item: MaterialItem = {
      id: crypto.randomUUID(),
      name: newItem.name!,
      type: newItem.type || MaterialType.BAR,
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'un',
      inStock: newItem.qtyInStock && newItem.qtyInStock >= (newItem.quantity || 1) ? true : false,
      qtyInStock: newItem.qtyInStock || 0,
      details: newItem.details,
      stockNumber: newItem.stockNumber,
      drawingNumber: newItem.drawingNumber,
      observation: newItem.observation, // Include observation
      assignedTo: newItem.type === MaterialType.COMMERCIAL ? newItem.assignedTo : undefined,
      purchaseStatus: 'PENDING'
    };
    const updatedProject = { ...selectedProject, materials: [...selectedProject.materials, item] };
    updateProject(updatedProject);
    setNewItem({ type: MaterialType.BAR, quantity: 1, unit: 'un', inStock: false, qtyInStock: 0, name: '', details: '', stockNumber: '', drawingNumber: '', observation: '' });
  };

  const updateStockQuantity = (materialId: string, qty: number) => {
      if (!selectedProject) return;
      const updatedMaterials = selectedProject.materials.map(m => {
          if (m.id === materialId) {
              const safeQty = isNaN(qty) ? 0 : qty;
              const isBar = m.type === MaterialType.BAR && m.totalLengthCalc !== undefined;
              const requiredAmount = isBar ? m.totalLengthCalc! : m.quantity;
              
              const isNowInStock = safeQty >= requiredAmount;
              
              // Se o usuário informar que tem estoque suficiente, removemos a pendência de compra automaticamente
              let newPurchaseStatus = m.purchaseStatus;
              if (isNowInStock && (m.purchaseStatus === 'REQUESTED' || m.purchaseStatus === 'PENDING' || m.purchaseStatus === 'QUOTING')) {
                   newPurchaseStatus = undefined; 
              }

              return { 
                  ...m, 
                  qtyInStock: safeQty, 
                  inStock: isNowInStock,
                  purchaseStatus: newPurchaseStatus
              };
          }
          return m;
      });
      const updated = { ...selectedProject, materials: updatedMaterials };
      updateProject(updated);
  };

  const updateMaterialObs = (materialId: string, obs: string) => {
      if (!selectedProject) return;
      const updatedMaterials = selectedProject.materials.map(m => {
          if (m.id === materialId) {
              return { ...m, observation: obs };
          }
          return m;
      });
      const updated = { ...selectedProject, materials: updatedMaterials };
      updateProject(updated);
  };

  const handleEditObsClick = (item: MaterialItem) => {
      const newObs = prompt("Adicionar Observação / Substituição:", item.observation || "");
      if (newObs !== null) {
          updateMaterialObs(item.id, newObs);
      }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedItems(newSet);
  };

  const toggleSelectAll = (items: MaterialItem[]) => {
      if (items.every(i => selectedItems.has(i.id))) {
          const newSet = new Set(selectedItems); items.forEach(i => newSet.delete(i.id)); setSelectedItems(newSet);
      } else {
          const newSet = new Set(selectedItems); items.forEach(i => newSet.add(i.id)); setSelectedItems(newSet);
      }
  };

  const sendSelectedToPurchasing = () => {
      if (!selectedProject) return;
      const updatedMaterials = selectedProject.materials.map(m => {
          if (selectedItems.has(m.id)) {
              if (m.inStock) return m; 
              return { ...m, purchaseStatus: 'REQUESTED' as const };
          }
          return m;
      });
      const updated = { ...selectedProject, materials: updatedMaterials };
      updateProject(updated);
      setSelectedItems(new Set()); 
  };

  const sendToPurchasingSingle = (materialId: string) => {
    if (!selectedProject) return;
    const updatedMaterials = selectedProject.materials.map(m => 
      m.id === materialId ? { ...m, purchaseStatus: 'REQUESTED' as const } : m
    );
    const updated = { ...selectedProject, materials: updatedMaterials };
    updateProject(updated);
  };

  // REMOVED SETTIMEOUT to fix user activation issues with confirm()
  const removeMaterial = (e: React.MouseEvent, materialId: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!selectedProject) return;
      
      const confirmDelete = window.confirm('Tem certeza que deseja excluir este material da lista?');
      if (!confirmDelete) return;
      
      const updatedMaterials = selectedProject.materials.filter(m => m.id !== materialId);
      const updated = { ...selectedProject, materials: updatedMaterials };
      updateProject(updated);
  };

  const finalizePcp = () => {
    if (!selectedProject) return;
    const missingMaterials = selectedProject.materials.filter(m => !m.inStock);
    if (missingMaterials.length > 0) {
      if (confirm(`Existem ${missingMaterials.length} itens sem estoque total. Enviar saldo restante para Compras?`)) {
        updateStatus(selectedProject.id, ProjectStatus.PURCHASING);
        setSelectedProjectId(null);
      }
    } else {
      if (confirm('Todos os materiais em estoque. Liberar para Produção?')) {
        updateStatus(selectedProject.id, ProjectStatus.PRODUCTION);
        setSelectedProjectId(null);
      }
    }
  };

  const getFilteredItems = (items: MaterialItem[]) => {
      if (!searchTerm) return items;
      const lowerTerm = searchTerm.toLowerCase();
      return items.filter(item => 
          item.name.toLowerCase().includes(lowerTerm) ||
          item.details?.toLowerCase().includes(lowerTerm) ||
          item.stockNumber?.toLowerCase().includes(lowerTerm) ||
          item.drawingNumber?.toLowerCase().includes(lowerTerm) ||
          item.observation?.toLowerCase().includes(lowerTerm)
      );
  };

  if (selectedProject) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col relative">
        {/* ... Import Modal (same as before) ... */}
        {isImportModalOpen && (
            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm rounded-xl">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <FileSpreadsheet className="text-green-600" /> 
                            Importar {importType === MaterialType.BAR ? 'Barras' : importType === MaterialType.SHEET ? 'Chapas' : 'Comercial'}
                        </h3>
                        <button onClick={() => setIsImportModalOpen(false)}><X className="text-slate-400 hover:text-red-500" /></button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                        <p className="text-xs text-slate-500 mb-2">
                            {importType === MaterialType.SHEET 
                                ? "Cole os dados na ordem: Espessura | Dim 1 | Dim 2 | QTDE | Titulo | Nº Estoque | Material"
                                : importType === MaterialType.BAR 
                                ? "Cole os dados na ordem: Qtd | Descrição | Bitola | Comp(mm) | Estoque | Material | Desenho"
                                : "Cole os dados do Excel aqui (Ctrl+V)"}
                        </p>
                        <textarea className="w-full h-64 p-3 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-green-500 outline-none bg-slate-50" placeholder="Cole aqui..." value={pastedData} onChange={e => setPastedData(e.target.value)} />
                    </div>
                    <div className="p-4 border-t bg-slate-50 rounded-b-lg flex justify-end gap-2">
                        <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
                        <button onClick={handleProcessExcel} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-bold"><Upload size={18} /> Processar</button>
                    </div>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <button onClick={() => { setSelectedProjectId(null); setSearchTerm(''); }} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm mb-2"><ArrowLeft size={16} /> Voltar</button>
                    <h2 className="text-2xl font-bold text-slate-800">PCP: {selectedProject.opNumber}</h2>
                    <p className="text-slate-600">{selectedProject.description}</p>
                </div>
                <div className="flex gap-2">
                     <button onClick={() => { setImportType(MaterialType.BAR); setIsImportModalOpen(true); }} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm"><FileSpreadsheet size={18} /> Importar Planilha</button>
                </div>
            </div>
            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200">
                <div className="flex gap-1 overflow-x-auto w-full md:w-auto">
                    {[{ id: 'ALL', label: 'Visão Geral', icon: List }, { id: MaterialType.BAR, label: 'Programação Barras', icon: Box }, { id: MaterialType.SHEET, label: 'Programação Chapas', icon: Box }, { id: MaterialType.COMMERCIAL, label: 'Comercial', icon: ShoppingCart }].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                            <tab.icon size={16} className={tab.id === MaterialType.SHEET ? 'rotate-90' : ''} />{tab.label}
                        </button>
                    ))}
                </div>
                <div className="w-full md:w-64 mb-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Pesquisar itens..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
             {activeTab !== 'ALL' && (
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-3 rounded border border-slate-200 gap-4">
                    <div className="flex items-center gap-4 w-full">
                         {selectedItems.size > 0 ? (
                             <button onClick={sendSelectedToPurchasing} className="text-sm bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 flex items-center gap-2 shadow-sm font-bold animate-pulse"><ShoppingCart size={16} /> Enviar {selectedItems.size} itens para Compras</button>
                         ) : <div className="text-sm text-slate-500 italic">Selecione itens na tabela para enviar para compras em massa.</div>}
                    </div>
                    <button onClick={() => { setImportType(activeTab as MaterialType); setIsImportModalOpen(true); }} className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"><FileSpreadsheet size={16} /> Importar do Excel</button>
                </div>
             )}

            {[MaterialType.BAR, MaterialType.SHEET, MaterialType.COMMERCIAL].map((type) => {
              if (activeTab !== 'ALL' && activeTab !== type) return null;
              const items = getFilteredItems(selectedProject.materials.filter(m => m.type === type));
              
              if (items.length === 0) {
                  if (activeTab !== 'ALL' && !searchTerm) return <div key={type} className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg"><p className="text-slate-400 mb-2">Nenhum item nesta lista.</p>{selectedProject.status !== ProjectStatus.COMPLETED && <button onClick={() => { setImportType(type); setIsImportModalOpen(true); }} className="text-blue-600 font-medium hover:underline">Importar do Excel agora</button>}</div>;
                  return null;
              }

              const allSelected = items.length > 0 && items.every(i => selectedItems.has(i.id));

              return (
                <div key={type} className="mb-6 animate-fade-in-up">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    {type === MaterialType.BAR ? <Box size={16} /> : type === MaterialType.SHEET ? <Box size={16} className="rotate-90" /> : <ShoppingCart size={16} />} 
                    {type === MaterialType.BAR ? 'Barras & Perfis' : type === MaterialType.SHEET ? 'Chapas' : 'Comercial & Acessórios'}
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium">
                        <tr>
                          <th className="p-4 w-10 text-center"><button onClick={() => toggleSelectAll(items)} className="text-slate-400 hover:text-blue-600">{allSelected ? <CheckSquare size={18} /> : <Square size={18} />}</button></th>
                          <th className="p-4">Descrição / Título</th>
                          <th className="p-4">Material / Detalhes</th>
                          <th className="p-4 w-24">Nº Estoque</th>
                          <th className="p-4 w-32">Qtd Nec.</th>
                          <th className="p-4 w-32">Em Estoque</th>
                          <th className="p-4 w-24 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(item => {
                          const isSelected = selectedItems.has(item.id);
                          const isBar = item.type === MaterialType.BAR && item.totalLengthCalc !== undefined;
                          // Enable input even if REQUESTED so user can correct stock found later
                          const isDisabled = item.purchaseStatus === 'ORDERED' || item.purchaseStatus === 'DELIVERED'; 
                          
                          return (
                            <tr key={item.id} className={item.purchaseStatus === 'REQUESTED' ? 'bg-orange-50' : item.inStock ? 'bg-green-50/50' : isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                                <td className="p-4 text-center"><button onClick={() => toggleSelect(item.id)} className={isSelected ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}>{isSelected ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                                <td className="p-4 font-medium text-slate-800">
                                    {item.name}
                                    {isBar && item.lengthMm && <div className="text-[10px] text-slate-500 font-mono mt-0.5">Corte: {item.lengthMm} mm</div>}
                                    {item.drawingNumber && <div className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1 rounded w-fit mt-1 border border-purple-100">Des: {item.drawingNumber}</div>}
                                    {item.observation && (
                                        <div className="mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200 flex items-start gap-1">
                                            <StickyNote size={10} className="mt-0.5 shrink-0" /> {item.observation}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-slate-500 text-xs font-semibold">{item.details || '-'}</td>
                                <td className="p-4 text-slate-700 text-sm font-bold font-mono">{item.stockNumber || '-'}</td>
                                <td className="p-4 text-slate-800 font-bold">{isBar ? <><span className="text-lg">{item.quantity} <span className="text-slate-400 font-normal text-xs">pçs</span></span><div className="text-[10px] text-slate-500">Total: {item.totalLengthCalc}mm</div></> : <span className="text-lg">{item.quantity} <span className="text-slate-400 font-normal text-xs">{item.unit}</span></span>}</td>
                                <td className="p-4"><div className="flex items-center gap-1"><input type="number" min="0" disabled={isDisabled} value={item.qtyInStock ?? 0} onChange={(e) => updateStockQuantity(item.id, parseFloat(e.target.value))} className={`w-20 p-1 border rounded text-center outline-none ${item.inStock ? 'border-green-400 bg-green-100 text-green-800 font-bold' : 'border-slate-300 bg-white'}`} /><span className="text-xs text-slate-400">{isBar ? 'mm' : item.unit}</span></div></td>
                                <td className="p-4 text-center flex items-center justify-center gap-2">
                                    {/* Edit Obs Button */}
                                    <button
                                        onClick={() => handleEditObsClick(item)}
                                        className={`p-1.5 rounded transition-colors ${item.observation ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' : 'text-slate-300 hover:text-yellow-500 hover:bg-slate-100'}`}
                                        title="Adicionar Observação / Substituição"
                                    >
                                        <StickyNote size={16} />
                                    </button>

                                    {item.purchaseStatus === 'REQUESTED' ? <span className="text-[10px] font-bold text-orange-600 uppercase bg-orange-100 px-2 py-1 rounded-full">Em Compras</span> : !item.inStock && <button onClick={() => sendToPurchasingSingle(item.id)} className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded"><Send size={16} /></button>}
                                    {/* DELETE ITEM BUTTON - WITH EXPLICIT CLICK HANDLER */}
                                    <button 
                                        type="button"
                                        onClick={(e) => removeMaterial(e, item.id)} 
                                        className="bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 p-2 rounded-lg transition-all shadow-sm group-hover:shadow-md" 
                                        title="Excluir Item"
                                    >
                                        <Trash2 size={16} className="pointer-events-none" />
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
            })}
        </div>

        {/* Bottom Section */}
        <div className="bg-slate-50 border-t border-slate-200 p-6">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg border border-blue-100 shadow-sm h-full flex flex-col justify-between">
                       <div><h4 className="font-bold text-blue-800 mb-4 text-base flex items-center gap-2"><PieChart size={20} /> Resumo da OP</h4><ul className="text-sm space-y-3 text-slate-700 mb-6"><li className="flex justify-between items-center border-b border-slate-50 pb-2"><span>Total de Itens</span> <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">{selectedProject.materials.length}</span></li><li className="flex justify-between items-center border-b border-slate-50 pb-2"><span className="text-red-600 font-medium">Falta Estoque</span> <span className="font-bold bg-red-50 px-2 py-0.5 rounded text-red-600">{selectedProject.materials.filter(m => !m.inStock).length}</span></li><li className="flex justify-between items-center"><span className="text-orange-600 font-medium">Em Compras</span> <span className="font-bold bg-orange-50 px-2 py-0.5 rounded text-orange-600">{selectedProject.materials.filter(m => m.purchaseStatus === 'REQUESTED').length}</span></li></ul></div>
                       {selectedProject.status === ProjectStatus.PCP ? <button onClick={finalizePcp} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition-all flex items-center justify-center gap-2"><CheckCircle size={18} /> Finalizar & Enviar OP</button> : <div className="w-full py-3 bg-slate-100 text-slate-500 rounded-lg font-bold text-center text-sm border border-slate-200"><CheckCircle size={18} /> Status: {selectedProject.status}</div>}
                    </div>
                 </div>
                 {selectedProject.status !== ProjectStatus.COMPLETED && (
                     <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-full">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2"><Hammer size={20} className="text-slate-500" /> Adicionar Material Avulso</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tipo</label>
                                    <select className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 font-medium" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value as MaterialType})}><option value={MaterialType.BAR}>Barra / Perfil</option><option value={MaterialType.SHEET}>Chapa</option><option value={MaterialType.COMMERCIAL}>Peça Comercial</option></select>
                                </div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nome / Título</label><input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})}/></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Qtd / Un</label><div className="flex gap-2"><input type="number" className="w-2/3 p-2.5 border border-slate-300 rounded-lg text-sm" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}/><input type="text" className="w-1/3 p-2.5 border border-slate-300 rounded-lg text-sm" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}/></div></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nº Estoque</label><input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono" value={newItem.stockNumber || ''} onChange={e => setNewItem({...newItem, stockNumber: e.target.value})}/></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nº Desenho</label><input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" value={newItem.drawingNumber || ''} onChange={e => setNewItem({...newItem, drawingNumber: e.target.value})}/></div>
                                <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Obs / Detalhes</label><input type="text" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" value={newItem.details || ''} onChange={e => setNewItem({...newItem, details: e.target.value})}/></div>
                                <div className="md:col-span-1 flex items-end"><button onClick={handleAddMaterial} className="w-full py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-bold text-sm flex items-center justify-center gap-2"><Plus size={18} /> Adicionar</button></div>
                            </div>
                        </div>
                     </div>
                 )}
             </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Planejamento e Controle (PCP)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pcpProjects.length === 0 && <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300"><p className="text-slate-400">Nenhum projeto pendente de PCP ou em andamento.</p></div>}
        {pcpProjects.map(project => (
            <ProjectCard 
                key={project.id}
                project={project}
                onEdit={() => onEditProject?.(project)}
                onDelete={() => onDeleteProject?.(project.id)}
                actionButton={
                    project.status === ProjectStatus.PCP ? (
                        <button onClick={() => setSelectedProjectId(project.id)} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"><Cpu size={16} /> Iniciar Planejamento</button>
                    ) : (
                        <button onClick={() => setSelectedProjectId(project.id)} className="w-full py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-200"><CheckCircle size={16} /> Etapa: {project.status} (Ver)</button>
                    )
                }
            />
        ))}
      </div>
    </div>
  );
};