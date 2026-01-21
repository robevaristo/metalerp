import React, { useState } from 'react';
import { Project, ProjectStatus, MaterialType, MaterialItem } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ShoppingCart, Box, Layers, ArrowLeft, Printer, Search, Calculator, ClipboardList, Tag, Hash } from 'lucide-react';

const normalizeGauge = (val: string) => {
    return String(val || "")
        .toUpperCase()
        .replace('Ø', '')
        .replace('MM', '')
        .replace(/\s+/g, '')
        .trim();
};

export const PurchasingView: React.FC<{ projects: Project[], updateStatus: any, updateProject: any }> = ({ projects, updateStatus, updateProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [reportSubView, setReportSubView] = useState<'BUY' | 'STOCK'>('BUY');

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const purchasingProjects = projects.filter(p => 
    (p.opNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.client.toLowerCase().includes(searchTerm.toLowerCase())) && 
    p.status !== ProjectStatus.COMPLETED && p.status !== ProjectStatus.COMMERCIAL
  );

  const handleUpdateItemStatus = (itemIds: string[], status: any) => {
      if (!selectedProject) return;
      const updatedMaterials = selectedProject.materials.map(m => 
          itemIds.includes(m.id) ? { ...m, purchaseStatus: status, inStock: status === 'COMPLETED' } : m
      );
      updateProject({ ...selectedProject, materials: updatedMaterials });
  };

  const getBarCategory = (name: string) => {
    const nameUpper = (name || '').toUpperCase();
    if (nameUpper.includes('ROSCADA')) return 'BARRA ROSCADA';
    if (nameUpper.includes('TREFILADA')) return 'BARRA TREFILADA';
    if (nameUpper.includes('TUBO')) return 'TUBO MECÂNICO';
    return 'BARRA LAMINADA';
  };

  if (selectedProject) {
      const allMaterials = selectedProject.materials;
      
      const chapas = allMaterials.filter(m => {
          if (m.type !== MaterialType.SHEET) return false;
          if (reportSubView === 'STOCK') return (m.qtyInStock || 0) > 0;
          return (m.quantity - (m.qtyInStock || 0)) > 0;
      });

      const rawBarras = allMaterials.filter(m => m.type === MaterialType.BAR);
      
      const comerciais = allMaterials.filter(m => {
          if (m.type !== MaterialType.COMMERCIAL) return false;
          if (reportSubView === 'STOCK') return (m.qtyInStock || 0) > 0;
          return (m.quantity - (m.qtyInStock || 0)) > 0;
      });

      // CONSOLIDAÇÃO v.26.1: Ø60 e 60 são somados rigorosamente.
      const barrasConsolidadas = rawBarras.reduce((acc: any[], current) => {
          const normGauge = normalizeGauge(current.gauge || "");
          const rawMat = (current.materialGrade || "SAE 1020").trim().toUpperCase();
          const category = getBarCategory(current.name);
          
          const key = `${normGauge}-${rawMat}`;
          
          const grossLinearNeeded = current.quantity * ((current.lengthMm || 0) + 4);
          const stockAvailableMm = current.stockLengthMm || 0;
          
          const existing = acc.find(item => item.key === key);

          if (existing) {
              existing.totalLinearMm += grossLinearNeeded;
              existing.stockUsedMm += stockAvailableMm;
              existing.ids.push(current.id);
              const refLabel = `${current.quantity}x ${current.name}`;
              if (!existing.references.includes(refLabel)) existing.references.push(refLabel);
          } else {
              acc.push({ 
                  key, 
                  category, 
                  gauge: normGauge, 
                  displayGauge: current.gauge || normGauge,
                  materialGrade: rawMat,
                  totalLinearMm: grossLinearNeeded, 
                  stockUsedMm: stockAvailableMm,
                  ids: [current.id], 
                  references: [`${current.quantity}x ${current.name}`], 
                  purchaseStatus: current.purchaseStatus
              });
          }
          return acc;
      }, []);

      const barrasFiltradas = barrasConsolidadas.filter(b => {
          if (reportSubView === 'STOCK') return b.stockUsedMm > 0;
          return (b.totalLinearMm - b.stockUsedMm) > 0;
      });

      return (
          <div className="space-y-6 animate-fade-in pb-20">
              <div className="bg-white p-6 rounded-[2.5rem] border flex flex-col md:flex-row justify-between items-center shadow-xl gap-6 border-t-8 border-t-indigo-600 print:hidden">
                  <div className="flex items-center gap-6">
                      <button onClick={() => setSelectedProjectId(null)} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all text-slate-400 hover:text-indigo-600 shadow-sm"><ArrowLeft size={24}/></button>
                      <div>
                          <h3 className="font-black text-2xl uppercase tracking-tighter text-slate-900 leading-none">OP {selectedProject.opNumber} — {selectedProject.client}</h3>
                          <div className="flex gap-4 mt-3">
                              <button onClick={() => setReportSubView('BUY')} className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full border transition-all ${reportSubView === 'BUY' ? 'bg-orange-500 text-white border-orange-600' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>Faltas / Compras</button>
                              <button onClick={() => setReportSubView('STOCK')} className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full border transition-all ${reportSubView === 'STOCK' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>Saldo em Estoque</button>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => { window.scrollTo(0, 0); setTimeout(() => window.print(), 300); }} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-xl"><Printer size={20}/> Imprimir Relatório</button>
                    <button onClick={() => updateStatus(selectedProject.id, ProjectStatus.PRODUCTION)} className="bg-teal-600 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase hover:bg-teal-700 transition-all shadow-xl">Liberar Produção</button>
                  </div>
              </div>

              <div className="report-printable-area space-y-8 bg-white p-8 print:p-0 rounded-[2rem] border shadow-sm print:border-none print:shadow-none">
                  {chapas.length > 0 && (
                      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden break-inside-avoid print:border-slate-300">
                          <div className={`p-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 text-white ${reportSubView === 'BUY' ? 'bg-teal-600' : 'bg-emerald-600'}`}>
                              <Layers size={18}/> {reportSubView === 'BUY' ? 'COMPRAS DE CHAPAS' : 'CHAPAS EM ESTOQUE'}
                          </div>
                          <table className="w-full text-left text-[10px] font-bold uppercase">
                              <thead className="bg-slate-50 text-slate-400 border-b">
                                  <tr>
                                      <th className="p-4 text-center w-20">QTDE</th>
                                      <th className="p-4 text-center w-40">BITOLA / ESP.</th>
                                      <th className="p-4 text-center w-24">LARGURA</th>
                                      <th className="p-4 text-center w-24">COMP</th>
                                      <th className="p-4">DESCRIÇÃO</th>
                                      <th className="p-4 w-32 no-print">STATUS</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {chapas.map(m => {
                                      const qty = reportSubView === 'BUY' ? (m.quantity - (m.qtyInStock || 0)) : (m.qtyInStock || 0);
                                      return (
                                          <tr key={m.id} className="hover:bg-slate-50">
                                              <td className="p-4 font-black text-2xl text-slate-900 text-center">{qty}</td>
                                              <td className="p-4 text-center font-black text-lg text-teal-700">{m.gauge}</td>
                                              <td className="p-4 text-center">{m.widthMm || '-'}</td>
                                              <td className="p-4 text-center">{m.lengthMm || '-'}</td>
                                              <td className="p-4 text-slate-800 font-black">{m.name}</td>
                                              <td className="p-4 text-center no-print">
                                                  <select value={m.purchaseStatus || 'PENDING'} onChange={(e) => handleUpdateItemStatus([m.id], e.target.value)} className="w-full p-2 rounded-lg font-black text-[8px] uppercase border outline-none bg-white border-slate-200 text-slate-500">
                                                      <option value="PENDING">Pendente</option>
                                                      <option value="ORDERED">Pedido</option>
                                                      <option value="COMPLETED">Recebido</option>
                                                  </select>
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {barrasFiltradas.length > 0 && (
                      <div className={`bg-white rounded-3xl border shadow-sm overflow-hidden break-inside-avoid print:border-slate-300 ${reportSubView === 'BUY' ? 'border-orange-200' : 'border-emerald-200'}`}>
                          <div className={`p-5 font-black text-[11px] uppercase tracking-widest flex items-center justify-between text-white ${reportSubView === 'BUY' ? 'bg-orange-600' : 'bg-emerald-600'}`}>
                              <div className="flex items-center gap-3"><Box size={18}/> {reportSubView === 'BUY' ? 'REQUISIÇÃO: BARRAS E PERFIS CONSOLIDADOS' : 'ESTOQUE: BARRAS E PERFIS'}</div>
                              <div className="flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest print:hidden">
                                  <Calculator size={12}/> {reportSubView === 'BUY' ? 'Total MM c/ Perda de Corte' : 'Sobra MM'}
                              </div>
                          </div>
                          <table className="w-full text-left text-[11px] font-bold uppercase border-collapse">
                              <thead className="bg-slate-50 text-slate-400 border-b">
                                  <tr>
                                      <th className="p-5">ESPECIFICAÇÃO / ITENS SOMADOS</th>
                                      <th className="p-5 text-center w-40">BITOLA / Ø</th>
                                      <th className="p-5 text-center w-36">MATERIAL</th>
                                      <th className={`p-5 text-center w-52 ${reportSubView === 'BUY' ? 'bg-orange-50 text-orange-900' : 'bg-emerald-50 text-emerald-900'}`}>
                                          {reportSubView === 'BUY' ? 'NECESSIDADE TOTAL' : 'SALDO RESERVADO'}
                                      </th>
                                      <th className="p-5 text-center w-32 no-print">STATUS</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {barrasFiltradas.map((m, idx) => {
                                      const linearVal = reportSubView === 'BUY' ? Math.max(0, Math.round(m.totalLinearMm - m.stockUsedMm)) : m.stockUsedMm;
                                      
                                      return (
                                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                              <td className="p-5">
                                                  <div className="font-black text-slate-900 text-sm">{m.category}</div>
                                                  <div className="text-[8px] text-slate-400 mt-1 uppercase font-bold leading-relaxed">
                                                      AGRUPADO: {m.references.join(' | ')}
                                                  </div>
                                              </td>
                                              <td className="p-5 text-center">
                                                  <div className="font-black text-2xl py-2 px-4 rounded-xl border bg-slate-100 text-slate-900 border-slate-200">
                                                      Ø {m.gauge}
                                                  </div>
                                              </td>
                                              <td className="p-5 text-center font-black text-slate-500">{m.materialGrade}</td>
                                              <td className={`p-5 text-center ${reportSubView === 'BUY' ? 'bg-orange-50/30' : 'bg-emerald-50/30'}`}>
                                                  <div className={`text-3xl font-black ${reportSubView === 'BUY' ? 'text-orange-700' : 'text-emerald-700'}`}>{Math.round(linearVal)} MM</div>
                                              </td>
                                              <td className="p-5 text-center no-print">
                                                  <select value={m.purchaseStatus || 'PENDING'} onChange={(e) => handleUpdateItemStatus(m.ids, e.target.value)} className="w-full p-2 rounded-lg font-black text-[8px] uppercase border outline-none bg-white border-slate-200 text-slate-500">
                                                      <option value="PENDING">Pendente</option>
                                                      <option value="ORDERED">Pedido</option>
                                                      <option value="COMPLETED">Recebido</option>
                                                  </select>
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {comerciais.length > 0 && (
                      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden break-inside-avoid print:border-slate-300">
                          <div className={`p-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 text-white ${reportSubView === 'BUY' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                              <ShoppingCart size={18}/> {reportSubView === 'BUY' ? 'COMPRAS: ITENS COMERCIAIS' : 'COMERCIAIS EM ESTOQUE'}
                          </div>
                          <table className="w-full text-left text-[10px] font-bold uppercase">
                              <thead className="bg-slate-50 text-slate-400 border-b">
                                  <tr>
                                      <th className="p-4 text-center w-20">QTDE</th>
                                      <th className="p-4">DESCRIÇÃO DO ITEM</th>
                                      <th className="p-4 text-center w-40">Nº ESTOQUE / REF</th>
                                      <th className="p-4">MATERIAL</th>
                                      <th className="p-4 text-center w-32 no-print">STATUS</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {comerciais.map(m => {
                                      const qty = reportSubView === 'BUY' ? (m.quantity - (m.qtyInStock || 0)) : (m.qtyInStock || 0);
                                      return (
                                          <tr key={m.id} className="hover:bg-slate-50">
                                              <td className="p-4 font-black text-3xl text-slate-900 text-center">{qty}</td>
                                              <td className="p-4">
                                                  <span className="text-slate-900 font-black text-[11px] block">{m.name}</span>
                                                  <span className="text-[8px] text-slate-400">{m.gauge || m.details}</span>
                                              </td>
                                              <td className="p-4 text-center text-indigo-600 font-black">{m.drawingNumber || 'COMERCIAL'}</td>
                                              <td className="p-4 font-black">{m.materialGrade || 'SAE 1020'}</td>
                                              <td className="p-4 text-center no-print">
                                                  <select value={m.purchaseStatus || 'PENDING'} onChange={(e) => handleUpdateItemStatus([m.id], e.target.value)} className="w-full p-2 rounded-lg font-black text-[8px] uppercase border outline-none bg-white border-slate-200 text-slate-500">
                                                      <option value="PENDING">Pendente</option>
                                                      <option value="ORDERED">Pedido</option>
                                                      <option value="COMPLETED">Recebido</option>
                                                  </select>
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-teal-600 p-3 rounded-2xl shadow-lg"><ShoppingCart className="text-white" size={24} /></div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Módulo de Compras</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Relatórios Técnicos e Consolidação de Materiais</p>
          </div>
        </div>
        <div className="relative w-64">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="BUSCAR OP..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {purchasingProjects.map(p => (
            <ProjectCard key={p.id} project={p} actionButton={
              <button onClick={() => { setSelectedProjectId(p.id); setReportSubView('BUY'); }} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3">
                <ClipboardList size={18}/> Relatório de Materiais Consolidados
              </button>
            } />
          ))}
          {purchasingProjects.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                  <p className="text-slate-300 font-black uppercase text-[11px] tracking-widest">Aguardando OPs liberadas para compra.</p>
              </div>
          )}
      </div>
    </div>
  );
};