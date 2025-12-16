import React, { useState } from 'react';
import { Project, ProjectStatus, MaterialType, PurchaseStatus, MaterialItem } from '../types';
import { ShoppingCart, Check, AlertCircle, ChevronDown, ChevronUp, DollarSign, Truck, PackageCheck, Box, Layers, Tag, Square, CheckSquare, X, Calculator, Search, Printer, FileText, CalendarClock, Pencil, Trash2, Filter, ListFilter, StickyNote, Warehouse } from 'lucide-react';

interface PurchasingViewProps {
  projects: Project[];
  updateStatus: (id: string, status: ProjectStatus) => void;
  updateProject: (p: Project) => void;
  onEditProject?: (p: Project) => void;
  onDeleteProject?: (id: string) => void;
}

// Interface helper for grouped items
interface GroupedItem extends MaterialItem {
    originalIds: string[]; // List of all aggregated IDs in this row
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({ projects, updateStatus, updateProject, onEditProject, onDeleteProject }) => {
  // State to track expanded projects
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDate, setBulkDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // State for report menu dropdown
  const [reportMenuOpenId, setReportMenuOpenId] = useState<string | null>(null);

  const purchasingProjects = projects.filter(p => 
    p.status === ProjectStatus.PURCHASING || 
    p.materials.some(m => m.purchaseStatus && m.purchaseStatus !== 'PENDING' && m.purchaseStatus !== 'COMPLETED')
  );

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  const toggleCategory = (projectId: string, type: MaterialType) => {
      const key = `${projectId}-${type}`;
      const newSet = new Set(collapsedCategories);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      setCollapsedCategories(newSet);
  };

  // REMOVED SETTIMEOUT to fix user activation issues with confirm()
  const handleDeleteItem = (projectId: string, itemIds: string[]) => {
      if(!window.confirm('Tem certeza que deseja excluir este(s) item(ns) da lista de compras?')) return;
      
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedMaterials = project.materials.filter(m => !itemIds.includes(m.id));
      updateProject({ ...project, materials: updatedMaterials });
      
      const newSelected = new Set(selectedIds);
      itemIds.forEach(id => newSelected.delete(id));
      setSelectedIds(newSelected);
  };

  const generateReport = (project: Project, typeFilter: 'ALL' | MaterialType = 'ALL', statusReportFilter: 'ALL' | PurchaseStatus | 'PENDING_ONLY' | 'IN_STOCK' = 'PENDING_ONLY') => {
    
    // 1. Filter items based on arguments
    const activeMaterials = project.materials.filter(m => {
        // Type Filter
        if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;

        // Status Filter
        if (statusReportFilter === 'PENDING_ONLY') {
            // "Solicitação de Cotação" logic: Show REQUESTED, PENDING, or undefined. Exclude Ordered/Delivered.
            return !m.purchaseStatus || m.purchaseStatus === 'REQUESTED' || m.purchaseStatus === 'PENDING';
        } else if (statusReportFilter === 'IN_STOCK') {
            // "Stock Separation" logic: Show items marked as in stock
            return m.inStock;
        } else if (statusReportFilter !== 'ALL') {
            return m.purchaseStatus === statusReportFilter;
        }
        
        // If ALL, show everything (except maybe completed if desired, but usually report is for active stuff)
        return true;
    });

    // 2. Group items (Same logic as view)
    const groupItemsForReport = (items: MaterialItem[]) => {
        const groups: Record<string, any> = {};
        items.forEach(item => {
            // Include Observation in key to separate notes
            const key = `${item.name}|${item.observation || ''}`;
            if (!groups[key]) {
                groups[key] = { ...item, totalQuantity: item.quantity, totalLengthCalc: item.totalLengthCalc || 0, totalStock: item.qtyInStock || 0, count: 1 };
            } else {
                groups[key].totalQuantity += item.quantity;
                if (item.totalLengthCalc) groups[key].totalLengthCalc = (groups[key].totalLengthCalc || 0) + item.totalLengthCalc;
                if (item.qtyInStock) groups[key].totalStock = (groups[key].totalStock || 0) + item.qtyInStock;
                groups[key].count += 1;
            }
        });
        return Object.values(groups);
    };

    const groupedItems = groupItemsForReport(activeMaterials).map((g: any) => {
        const isBar = g.type === MaterialType.BAR && g.totalLengthCalc !== undefined;
        const required = isBar ? g.totalLengthCalc : g.totalQuantity;
        const inStock = g.totalStock;
        
        // If we are printing a "Quote Request" (Pending Only), we calculate "To Buy" = Need - Stock.
        // If we are printing "Delivered" or "Ordered", we show the actual Quantity of that status.
        let quantityDisplay = 0;
        
        if (statusReportFilter === 'PENDING_ONLY') {
            quantityDisplay = Math.max(0, required - inStock);
        } else if (statusReportFilter === 'IN_STOCK') {
            // For Stock report, show what we HAVE/ALLOCATED
             quantityDisplay = inStock;
             // If we have more in stock than needed, cap at needed? 
             // Usually for separation we just want to know what to pick. 
             // Let's show the 'required' amount if we have full stock, or the partial stock amount.
             quantityDisplay = Math.min(required, inStock);
             if (quantityDisplay === 0 && inStock > 0) quantityDisplay = inStock; // Fallback
        } else {
            // For specific status lists, just show the sum of items in that status
            quantityDisplay = required; 
        }

        return { ...g, quantityDisplay, isBar };
    }).filter((g: any) => g.quantityDisplay > 0);

    const bars = groupedItems.filter((m: any) => m.type === MaterialType.BAR);
    const sheets = groupedItems.filter((m: any) => m.type === MaterialType.SHEET);
    const commercial = groupedItems.filter((m: any) => m.type === MaterialType.COMMERCIAL);
    
    // Filter sections
    const sections = [];
    if (bars.length > 0) sections.push({ title: 'Barras & Perfis (Metálicos)', items: bars });
    if (sheets.length > 0) sections.push({ title: 'Chapas & Cortes', items: sheets });
    if (commercial.length > 0) sections.push({ title: 'Peças Comerciais & Acessórios', items: commercial });

    if (sections.length === 0) {
        alert("Não há itens com este status/filtro para gerar relatório.");
        return;
    }

    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;

    // Report Title Logic
    let reportTitle = 'Relatório de Materiais';
    let qtyColumnName = 'Qtd';

    if (statusReportFilter === 'PENDING_ONLY') {
        reportTitle = 'Solicitação de Cotação de Materiais';
        qtyColumnName = 'Qtd Compra';
    } else if (statusReportFilter === 'QUOTING') {
        reportTitle = 'Relatório: Itens em Orçamento';
        qtyColumnName = 'Qtd Orçada';
    } else if (statusReportFilter === 'ORDERED') {
        reportTitle = 'Relatório: Itens Comprados (Aguardando Entrega)';
        qtyColumnName = 'Qtd Comprada';
    } else if (statusReportFilter === 'DELIVERED') {
        reportTitle = 'Relatório: Itens Entregues / Conferência';
        qtyColumnName = 'Qtd Recebida';
    } else if (statusReportFilter === 'IN_STOCK') {
        reportTitle = 'Relatório: Separação de Estoque Interno';
        qtyColumnName = 'Qtd Separar';
    }

    if (typeFilter === MaterialType.BAR) reportTitle += ' (Apenas Barras)';
    if (typeFilter === MaterialType.SHEET) reportTitle += ' (Apenas Chapas)';
    if (typeFilter === MaterialType.COMMERCIAL) reportTitle += ' (Apenas Comercial)';

    const renderTable = (title: string, items: typeof groupedItems) => {
        if (items.length === 0) return '';
        const rows = items.map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                    <b>${item.name}</b><br/>
                    <span style="font-size: 10px; color: #666;">${item.details || ''}</span>
                    ${item.observation ? `<br/><span style="font-size: 10px; font-weight: bold; background-color: #fef9c3; padding: 2px;">OBS: ${item.observation}</span>` : ''}
                </td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantityDisplay} <span style="font-size: 10px;">${item.isBar ? 'mm' : item.unit}</span></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.stockNumber || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; width: 150px;"></td> 
            </tr>
        `).join('');

        return `<div style="margin-bottom: 30px;"><h3 style="border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; font-size: 14px;">${title}</h3><table style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: Arial, sans-serif;"><thead><tr style="background-color: #f5f5f5;"><th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Descrição / Item</th><th style="text-align: center; padding: 8px; border-bottom: 2px solid #ddd; width: 100px;">${qtyColumnName}</th><th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd; width: 80px;">Ref/Estoque</th><th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Obs / Marca / Check</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    };

    const logoSvg = `<svg width="250" height="60" viewBox="0 0 250 60" xmlns="http://www.w3.org/2000/svg"><g transform="translate(10, 10)"><circle cx="20" cy="20" r="14" fill="none" stroke="#1e293b" stroke-width="6" /><path d="M20 0 L20 8 M20 32 L20 40 M0 20 L8 20 M32 20 L40 20 M5.8 5.8 L11.5 11.5 M28.5 28.5 L34.2 34.2 M34.2 5.8 L28.5 11.5 M11.5 28.5 L5.8 34.2" stroke="#1e293b" stroke-width="5" stroke-linecap="round" /><circle cx="32" cy="32" r="10" fill="#3b82f6" stroke="#ffffff" stroke-width="2" /><path d="M28 32 L32 36 L36 28" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></g><text x="65" y="28" font-family="Arial, sans-serif" font-weight="bold" font-size="28" fill="#1e293b">MetalERP</text><text x="65" y="45" font-family="Arial, sans-serif" font-size="10" fill="#64748b" letter-spacing="3" font-weight="bold">SMART METAL MANAGEMENT</text></svg>`;
    
    let tablesHtml = '';
    sections.forEach(section => {
        tablesHtml += renderTable(section.title, section.items);
    });

    const note = statusReportFilter === 'PENDING_ONLY' 
        ? 'NOTA: As quantidades listadas representam a <b>necessidade líquida de compra</b> (descontado o estoque existente).' 
        : (statusReportFilter === 'IN_STOCK' 
            ? 'ATENÇÃO: Este relatório lista materiais que constam no ESTOQUE INTERNO. Verificar fisicamente antes de liberar produção.' 
            : `Relatório gerado filtrando apenas itens com status: <b>${statusReportFilter}</b>.`);

    const htmlContent = `<html><head><title>Relatório - OP ${project.opNumber}</title><style>body { font-family: Arial, sans-serif; padding: 40px; color: #333; }.header { margin-bottom: 40px; border-bottom: 3px solid #000; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }.meta { font-size: 12px; color: #555; line-height: 1.5; }.title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }@media print {.no-print { display: none; }body { padding: 0; }}</style></head><body><div class="header"><div><div class="title">${reportTitle}</div><div class="meta"><b>OP:</b> ${project.opNumber}<br/><b>Cliente:</b> ${project.client}<br/><b>Descrição:</b> ${project.description}</div></div><div style="text-align: right;">${logoSvg}<div class="meta" style="margin-top: 10px;"><b>Data Emissão:</b> ${new Date().toLocaleDateString()}</div></div></div><div style="background-color: #fffde7; padding: 10px; border: 1px solid #ffe082; margin-bottom: 20px; font-size: 11px;">${note}</div>${tablesHtml}<div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; text-align: center; color: #999;">Gerado automaticamente pelo sistema MetalERP</div><script>window.onload = function() { window.print(); }</script></body></html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const updateGroupStatus = (projectId: string, itemIds: string[], status: PurchaseStatus, extraData?: { deliveryForecast?: string }) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      const now = new Date().toISOString();
      const updatedMaterials = project.materials.map(m => {
          if (itemIds.includes(m.id)) {
              const updates: any = { purchaseStatus: status };
              if (extraData?.deliveryForecast) updates.deliveryForecast = extraData.deliveryForecast;
              if (status === 'QUOTING' && !m.quotationStartedDate) updates.quotationStartedDate = now;
              if (status === 'ORDERED' && !m.purchaseOrderDate) updates.purchaseOrderDate = now;
              if (status === 'DELIVERED') {
                  updates.inStock = true;
                  updates.deliveredDate = now.split('T')[0];
                  const totalNeeded = (m.type === MaterialType.BAR && m.totalLengthCalc) ? m.totalLengthCalc : m.quantity;
                  const currentStock = m.qtyInStock || 0;
                  const purchasedAmount = Math.max(0, totalNeeded - currentStock);
                  updates.qtyInStock = currentStock + purchasedAmount;
              }
              return { ...m, ...updates };
          }
          return m;
      });
      updateProject({ ...project, materials: updatedMaterials });
      setEditingDateId(null);
  };
  
  const updateGroupObs = (projectId: string, itemIds: string[], obs: string) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      const updatedMaterials = project.materials.map(m => {
          if (itemIds.includes(m.id)) {
              return { ...m, observation: obs };
          }
          return m;
      });
      updateProject({ ...project, materials: updatedMaterials });
  };

  const handleBulkAction = (status: PurchaseStatus) => {
    let projectsUpdated = 0;
    const now = new Date().toISOString();
    const newProjects = projects.map(p => {
        const hasSelectedItems = p.materials.some(m => selectedIds.has(m.id));
        if (!hasSelectedItems) return p;
        const updatedMaterials = p.materials.map(m => {
            if (selectedIds.has(m.id)) {
                const updates: any = { purchaseStatus: status };
                if (status === 'QUOTING' && !m.quotationStartedDate) updates.quotationStartedDate = now;
                if (status === 'ORDERED' && !m.purchaseOrderDate) updates.purchaseOrderDate = now;
                if (status === 'ORDERED' && bulkDate) updates.deliveryForecast = bulkDate;
                if (status === 'DELIVERED') {
                    updates.inStock = true;
                    updates.deliveredDate = now.split('T')[0];
                    const totalNeeded = (m.type === MaterialType.BAR && m.totalLengthCalc) ? m.totalLengthCalc : m.quantity;
                    const currentStock = m.qtyInStock || 0;
                    const purchasedAmount = Math.max(0, totalNeeded - currentStock);
                    updates.qtyInStock = currentStock + purchasedAmount;
                }
                return { ...m, ...updates };
            }
            return m;
        });
        projectsUpdated++;
        return { ...p, materials: updatedMaterials };
    });

    if (projectsUpdated > 0) {
        newProjects.forEach(p => {
             const original = projects.find(op => op.id === p.id);
             if (original !== p) updateProject(p);
        });
        setSelectedIds(new Set());
        setBulkDate('');
    }
  };

  const toggleSelectGroup = (ids: string[]) => {
      const newSet = new Set(selectedIds);
      const allSelected = ids.every(id => newSet.has(id));
      if (allSelected) ids.forEach(id => newSet.delete(id));
      else ids.forEach(id => newSet.add(id));
      setSelectedIds(newSet);
  };

  const toggleSelectAllInTable = (groupedItems: GroupedItem[]) => {
      const allIds = groupedItems.flatMap(g => g.originalIds);
      const newSet = new Set(selectedIds);
      const allSelected = allIds.every(id => newSet.has(id));
      if (allSelected) allIds.forEach(id => newSet.delete(id));
      else allIds.forEach(id => newSet.add(id));
      setSelectedIds(newSet);
  };

  const groupItems = (items: MaterialItem[]): GroupedItem[] => {
      const groups: Record<string, GroupedItem> = {};
      items.forEach(item => {
          // Include observation in key to split items with different notes
          const key = `${item.name}|${item.purchaseStatus}|${item.observation || ''}`;
          if (!groups[key]) {
              groups[key] = { ...item, originalIds: [item.id], quantity: item.quantity, totalLengthCalc: item.totalLengthCalc || 0, qtyInStock: item.qtyInStock || 0 };
          } else {
              groups[key].originalIds.push(item.id);
              groups[key].quantity += item.quantity;
              if (item.totalLengthCalc) groups[key].totalLengthCalc = (groups[key].totalLengthCalc || 0) + item.totalLengthCalc;
              if (item.qtyInStock) groups[key].qtyInStock = (groups[key].qtyInStock || 0) + item.qtyInStock;
          }
      });
      return Object.values(groups);
  };

  const renderItemTable = (rawItems: MaterialItem[], projectId: string) => {
    const groupedItems = groupItems(rawItems);
    const allTableIds = groupedItems.flatMap(g => g.originalIds);
    const isTableAllSelected = allTableIds.length > 0 && allTableIds.every(id => selectedIds.has(id));

    return (
    <div className="overflow-x-auto animate-fade-in-down">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500">
                <tr>
                    <th className="p-3 w-10 text-center">
                        <button onClick={() => toggleSelectAllInTable(groupedItems)} className="text-slate-400 hover:text-blue-600 transition-colors">
                            {isTableAllSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                        </button>
                    </th>
                    <th className="p-3 pl-4">Item Solicitado</th>
                    <th className="p-3">Qtd Compra (Total)</th>
                    <th className="p-3 w-48">Status Atual</th>
                    <th className="p-3 w-64 text-center">Ações / Fluxo</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {groupedItems.map(item => {
                const isBar = item.type === MaterialType.BAR && item.totalLengthCalc !== undefined && item.totalLengthCalc > 0;
                const requiredAmount = isBar ? item.totalLengthCalc! : item.quantity;
                const currentStock = item.qtyInStock || 0;
                const qtyToBuy = Math.max(0, requiredAmount - currentStock);
                const unitDisplay = isBar ? 'mm' : item.unit;
                const status = item.purchaseStatus || 'REQUESTED';
                const isGroup = item.originalIds.length > 1;
                const isRowSelected = item.originalIds.every(id => selectedIds.has(id));

                return (
                <tr key={item.id} className={`${isRowSelected ? 'bg-blue-50' : 'hover:bg-slate-50'} transition-colors group`}>
                    <td className="p-3 text-center">
                         <button onClick={() => toggleSelectGroup(item.originalIds)} className="text-slate-400 hover:text-blue-600 transition-colors">
                            {isRowSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                        </button>
                    </td>
                    <td className="p-3 pl-4 font-medium text-slate-800">
                        {item.name}
                        {item.details && <div className="text-xs text-slate-500">{item.details}</div>}
                        {isGroup && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 mt-1 border border-slate-200">{item.originalIds.length} cortes/peças agrupados</span>}
                        {item.observation && (
                            <div className="mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200 flex items-start gap-1 w-fit">
                                <StickyNote size={10} className="mt-0.5 shrink-0" /> {item.observation}
                            </div>
                        )}
                    </td>
                    <td className="p-3">
                        <div className="flex flex-col">
                            <span className="font-mono font-bold text-lg text-slate-800 flex items-center gap-2">{qtyToBuy} <span className="text-xs font-normal text-slate-500">{unitDisplay}</span></span>
                            {currentStock > 0 && status !== 'DELIVERED' && (
                                <div className="text-[10px] bg-yellow-50 text-yellow-800 px-2 py-1 rounded border border-yellow-100 mt-1 w-fit">
                                    <div className="flex items-center gap-1 font-semibold"><Calculator size={10}/> Cálculo:</div>
                                    <div>Nec: {requiredAmount} - Est: {currentStock}</div>
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="p-3 align-top">
                        {item.inStock && !item.purchaseStatus && <span className="flex items-center gap-1 text-green-700 font-bold bg-green-50 px-2 py-1 rounded w-fit text-xs border border-green-100"><Warehouse size={12} /> Em Estoque</span>}
                        {status === 'REQUESTED' && <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded w-fit text-xs border border-red-100"><AlertCircle size={12} /> Pendente</span>}
                        {status === 'QUOTING' && <span className="flex items-center gap-1 text-yellow-700 font-bold bg-yellow-50 px-2 py-1 rounded w-fit text-xs border border-yellow-100"><DollarSign size={12} /> Em Orçamento</span>}
                        {status === 'ORDERED' && <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded w-fit text-xs border border-blue-100"><Truck size={12} /> Comprado</span>}
                        {status === 'DELIVERED' && <span className="flex items-center gap-1 text-green-700 font-bold bg-green-50 px-2 py-1 rounded w-fit text-xs border border-green-100"><PackageCheck size={12} /> Entregue</span>}
                    </td>
                    <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                             {/* OBS Button */}
                             <button
                                onClick={() => {
                                    const newObs = prompt("Observação para Compras / Substituto:", item.observation || "");
                                    if(newObs !== null) updateGroupObs(projectId, item.originalIds, newObs);
                                }}
                                className={`p-1.5 rounded transition-colors ${item.observation ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' : 'text-slate-300 hover:text-yellow-500 hover:bg-slate-100'}`}
                                title="Adicionar Observação de Compra"
                            >
                                <StickyNote size={16} />
                            </button>

                            {status === 'REQUESTED' && (
                                <button onClick={() => updateGroupStatus(projectId, item.originalIds, 'QUOTING')} className="bg-white border border-slate-300 hover:bg-yellow-50 hover:border-yellow-400 text-slate-600 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2"><DollarSign size={14} /> Cotar</button>
                            )}
                            {status === 'QUOTING' && editingDateId !== item.id && (
                                <button onClick={() => setEditingDateId(item.id)} className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 shadow-sm"><Truck size={14} /> Comprar</button>
                            )}
                            {editingDateId === item.id && (
                                <div className="flex items-center gap-1 bg-white border border-blue-200 p-1 rounded shadow-sm">
                                    <input type="date" className="text-xs p-1 border border-slate-200 rounded outline-none" onChange={(e) => { if(e.target.value) updateGroupStatus(projectId, item.originalIds, 'ORDERED', { deliveryForecast: e.target.value }); }} />
                                    <button onClick={() => setEditingDateId(null)} className="text-slate-400 hover:text-red-500 p-1"><ChevronUp size={14} /></button>
                                </div>
                            )}
                            {status === 'ORDERED' && (
                                <button onClick={() => updateGroupStatus(projectId, item.originalIds, 'DELIVERED')} className="bg-green-600 text-white hover:bg-green-700 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 shadow-sm"><PackageCheck size={14} /> Receber</button>
                            )}
                            {status === 'DELIVERED' && <span className="text-slate-300"><Check size={18} /></span>}

                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(projectId, item.originalIds);
                                }}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-2"
                                title="Excluir Item Importado Errado"
                            >
                                <Trash2 size={16} className="pointer-events-none" />
                            </button>
                        </div>
                    </td>
                </tr>
                )})}
            </tbody>
        </table>
    </div>
  )};

  return (
    <div className="space-y-6 pb-20"> 
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Solicitações de Compra</h2>
        <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Status Filter */}
            <div className="relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <Filter size={14} />
                </div>
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:border-blue-400"
                >
                    <option value="ALL">Todos os Status</option>
                    <option value="REQUESTED">Pendentes (Vermelho)</option>
                    <option value="QUOTING">Em Orçamento (Amarelo)</option>
                    <option value="ORDERED">Comprado (Azul)</option>
                    <option value="DELIVERED">Entregue (Verde)</option>
                    <option value="IN_STOCK">Baixado do Estoque (Verde)</option>
                </select>
            </div>

            <div className="w-full md:w-80 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Pesquisar OP, item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
        </div>
      </div>
      
      {purchasingProjects.length === 0 && <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300"><p className="text-slate-400">Nenhuma solicitação de compra pendente.</p></div>}

      {purchasingProjects.map(project => {
        let relevantItems = project.materials.filter(m => {
             const hasActiveStatus = m.purchaseStatus && ['REQUESTED', 'QUOTING', 'ORDERED', 'DELIVERED'].includes(m.purchaseStatus);
             // Basic Relevance Check
             const isRelevant = hasActiveStatus || (project.status === ProjectStatus.PURCHASING && !m.inStock) || (m.inStock && statusFilter === 'IN_STOCK');
             if (!isRelevant) return false;

             // Apply Status Filter
             if (statusFilter !== 'ALL') {
                 // For "REQUESTED", we also want to catch PENDING or undefined if the project is in PURCHASING mode and item is not in stock
                 if (statusFilter === 'REQUESTED') {
                     return m.purchaseStatus === 'REQUESTED' || m.purchaseStatus === 'PENDING' || (!m.purchaseStatus && !m.inStock);
                 }
                 if (statusFilter === 'IN_STOCK') {
                     return m.inStock;
                 }
                 return m.purchaseStatus === statusFilter;
             }
             
             return true;
        });

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            const projectMatches = project.opNumber.toLowerCase().includes(lowerTerm) || project.client.toLowerCase().includes(lowerTerm);
            if (!projectMatches) {
                relevantItems = relevantItems.filter(m => m.name.toLowerCase().includes(lowerTerm) || m.details?.toLowerCase().includes(lowerTerm));
            }
        }
        
        if (relevantItems.length === 0) return null;

        const isExpanded = expandedIds.has(project.id) || !!searchTerm;
        const pendingCount = relevantItems.filter(i => i.purchaseStatus !== 'DELIVERED').length;
        const barItems = relevantItems.filter(i => i.type === MaterialType.BAR);
        const sheetItems = relevantItems.filter(i => i.type === MaterialType.SHEET);
        const commercialItems = relevantItems.filter(i => i.type === MaterialType.COMMERCIAL);

        return (
          <div key={project.id} className="bg-white rounded-xl border border-orange-200 shadow-sm mb-4 transition-all duration-200">
            <div onClick={() => toggleExpand(project.id)} className={`bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center cursor-pointer hover:bg-orange-100/80 transition-colors rounded-t-xl ${!isExpanded ? 'rounded-b-xl border-b-0' : ''}`}>
              <div className="flex flex-col gap-1">
                 <h3 className="font-bold text-orange-900 flex items-center gap-2"><ShoppingCart size={18} /> OP: {project.opNumber} - {project.client}</h3>
                 <div className="flex items-center gap-3">
                    <p className="text-orange-700 text-sm">{project.description}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${pendingCount > 0 ? 'bg-white text-orange-600 border-orange-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{pendingCount > 0 ? `${pendingCount} itens listados` : 'Todos entregues'}</span>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 border-r border-orange-200 pr-3 mr-1">
                      {onEditProject && <button onClick={(e) => { e.stopPropagation(); onEditProject(project); }} className="p-1.5 text-orange-400 hover:text-blue-600 hover:bg-orange-100 rounded transition-colors"><Pencil size={16} className="pointer-events-none" /></button>}
                      {onDeleteProject && <button onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }} className="p-1.5 text-orange-400 hover:text-red-600 hover:bg-orange-100 rounded transition-colors"><Trash2 size={16} className="pointer-events-none" /></button>}
                  </div>
                  
                  {/* RELATÓRIO DROPDOWN */}
                  <div className="relative">
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setReportMenuOpenId(reportMenuOpenId === project.id ? null : project.id); 
                            }} 
                            className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 z-10 shadow-sm"
                        >
                            <Printer size={18} /> Relatório <ChevronDown size={14} />
                        </button>
                        {reportMenuOpenId === project.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 w-64 py-2 flex flex-col overflow-hidden animate-fade-in">
                                <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Por Tipo</div>
                                <button onClick={(e) => { e.stopPropagation(); generateReport(project, 'ALL'); setReportMenuOpenId(null); }} className="text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 border-b border-slate-50 flex items-center gap-2"><FileText size={14}/> Completo (Todos)</button>
                                <button onClick={(e) => { e.stopPropagation(); generateReport(project, MaterialType.BAR); setReportMenuOpenId(null); }} className="text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 border-b border-slate-50 flex items-center gap-2"><Box size={14}/> Apenas Barras</button>
                                <button onClick={(e) => { e.stopPropagation(); generateReport(project, MaterialType.SHEET); setReportMenuOpenId(null); }} className="text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 border-b border-slate-50 flex items-center gap-2"><Layers size={14}/> Apenas Chapas</button>
                                <button onClick={(e) => { e.stopPropagation(); generateReport(project, MaterialType.COMMERCIAL); setReportMenuOpenId(null); }} className="text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2 border-b border-slate-50"><Tag size={14}/> Apenas Comercial</button>
                                
                                <div className="px-3 py-1 mt-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-2">Por Status</div>
                                <button onClick={(e) => { e.stopPropagation(); generateReport(project, 'ALL', 'PENDING_ONLY'); setReportMenuOpenId(null); }} className="text-left px-4 py-2 hover:bg-slate-50 text-sm text-red-600 flex items-center gap-2"><AlertCircle size={14}/> Pendentes de Cotação</button>
                                <button onClick={(e) => { e.stopPropagation(); generateReport(project, 'ALL', 'IN_STOCK'); setReportMenuOpenId(null); }} className="text-left px-4 py-2 hover:bg-slate-50 text-sm text-green-700 flex items-center gap-2"><Warehouse size={14}/> Separação de Estoque (Interno)</button>
                                <button onClick={(e) => { e.stopPropagation(); generateReport(project, 'ALL', 'QUOTING'); setReportMenuOpenId(null); }} className="text-left px-4 py-2 hover:bg-slate-50 text-sm text-yellow-600 flex items-center gap-2"><DollarSign size={14}/> Em Orçamento</button>
                                <button onClick={(e) => { e.stopPropagation(); generateReport(project, 'ALL', 'ORDERED'); setReportMenuOpenId(null); }} className="text-left px-4 py-2 hover:bg-slate-50 text-sm text-blue-600 flex items-center gap-2"><Truck size={14}/> Comprados (Aguardando)</button>
                                <button onClick={(e) => { e.stopPropagation(); generateReport(project, 'ALL', 'DELIVERED'); setReportMenuOpenId(null); }} className="text-left px-4 py-2 hover:bg-slate-50 text-sm text-green-600 flex items-center gap-2"><PackageCheck size={14}/> Entregues (Conferência)</button>
                            </div>
                        )}
                  </div>

                  {project.status === ProjectStatus.PURCHASING && <button onClick={(e) => { e.stopPropagation(); if(confirm('Confirmar compra de todos os materiais e liberar produção?')) updateStatus(project.id, ProjectStatus.PRODUCTION); }} className="bg-white text-green-600 border border-green-200 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 z-10"><Check size={16} /> Finalizar Compras</button>}
                  <div className={`text-orange-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={24} /></div>
              </div>
            </div>
            {isExpanded && (
                <div className="p-4 bg-slate-50/50 space-y-4 rounded-b-xl">
                    {barItems.length > 0 && <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm"><button onClick={() => toggleCategory(project.id, MaterialType.BAR)} className="w-full flex justify-between p-3 bg-blue-50/50 hover:bg-blue-50 border-b border-slate-100 text-left"><div className="flex items-center gap-2 font-bold text-blue-800"><Box size={18} /> Barras <span className="bg-blue-200 text-blue-800 text-xs px-2 py-0.5 rounded-full">{barItems.length}</span></div><div className="text-blue-400">{collapsedCategories.has(`${project.id}-${MaterialType.BAR}`) ? <ChevronDown size={20} /> : <ChevronUp size={20} />}</div></button>{!collapsedCategories.has(`${project.id}-${MaterialType.BAR}`) && renderItemTable(barItems, project.id)}</div>}
                    {sheetItems.length > 0 && <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm"><button onClick={() => toggleCategory(project.id, MaterialType.SHEET)} className="w-full flex justify-between p-3 bg-indigo-50/50 hover:bg-indigo-50 border-b border-slate-100 text-left"><div className="flex items-center gap-2 font-bold text-indigo-800"><Layers size={18} /> Chapas <span className="bg-indigo-200 text-indigo-800 text-xs px-2 py-0.5 rounded-full">{sheetItems.length}</span></div><div className="text-indigo-400">{collapsedCategories.has(`${project.id}-${MaterialType.SHEET}`) ? <ChevronDown size={20} /> : <ChevronUp size={20} />}</div></button>{!collapsedCategories.has(`${project.id}-${MaterialType.SHEET}`) && renderItemTable(sheetItems, project.id)}</div>}
                    {commercialItems.length > 0 && <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm"><button onClick={() => toggleCategory(project.id, MaterialType.COMMERCIAL)} className="w-full flex justify-between p-3 bg-purple-50/50 hover:bg-purple-50 border-b border-slate-100 text-left"><div className="flex items-center gap-2 font-bold text-purple-800"><Tag size={18} /> Comercial <span className="bg-purple-200 text-purple-800 text-xs px-2 py-0.5 rounded-full">{commercialItems.length}</span></div><div className="text-purple-400">{collapsedCategories.has(`${project.id}-${MaterialType.COMMERCIAL}`) ? <ChevronDown size={20} /> : <ChevronUp size={20} />}</div></button>{!collapsedCategories.has(`${project.id}-${MaterialType.COMMERCIAL}`) && renderItemTable(commercialItems, project.id)}</div>}
                </div>
            )}
          </div>
        );
      })}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-6 animate-fade-in-up border border-slate-700">
            <div className="flex items-center gap-2 font-bold text-sm border-r border-slate-600 pr-4"><CheckSquare className="text-blue-400" size={20} /> {selectedIds.size} itens</div>
            <div className="flex items-center gap-2">
                 <button onClick={() => handleBulkAction('QUOTING')} className="hover:bg-slate-700 px-3 py-1.5 rounded transition-colors text-sm font-medium flex items-center gap-2 text-yellow-400"><DollarSign size={16} /> Cotar</button>
                 <div className="h-4 w-px bg-slate-600"></div>
                 <div className="flex items-center gap-2"><input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none" /><button onClick={() => handleBulkAction('ORDERED')} className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded transition-colors text-sm font-bold flex items-center gap-2"><Truck size={16} /> Comprar</button></div>
                 <div className="h-4 w-px bg-slate-600"></div>
                 <button onClick={() => handleBulkAction('DELIVERED')} className="hover:bg-slate-700 px-3 py-1.5 rounded transition-colors text-sm font-medium flex items-center gap-2 text-green-400"><PackageCheck size={16} /> Receber</button>
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
      )}
    </div>
  );
};