import React, { useState } from 'react';
import { Project, MaterialType, MaterialItem } from '../types';
import { 
  FileText, Printer, ShoppingCart, Package, ArrowLeft, Search, 
  Calculator, CheckCircle2, AlertCircle, List, LayoutGrid, Filter, 
  Hash, Layers, Box, Truck, CheckCircle, ClipboardList, TrendingUp,
  Warehouse, Share2, FileDown, Info
} from 'lucide-react';

interface ReportsViewProps {
  projects: Project[];
}

type OPReportType = 'COMMERCIAL' | 'CUTTING' | 'STOCK_USED' | 'PENDING_BUY' | 'ARRIVED';

export const ReportsView: React.FC<ReportsViewProps> = ({ projects }) => {
  const [reportType, setReportType] = useState<'NONE' | 'PURCHASE' | 'STOCK' | 'OP_ANALYTIC'>('NONE');
  const [opAnalyticType, setOpAnalyticType] = useState<OPReportType>('COMMERCIAL');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const getBarCategory = (name: string) => {
    const nameUpper = (name || '').toUpperCase();
    if (nameUpper.includes('ROSCADA')) return 'BARRA ROSCADA';
    if (nameUpper.includes('TREFILADA')) return 'BARRA TREFILADA';
    if (nameUpper.includes('TUBO')) return 'TUBO MECÂNICO';
    return 'BARRA LAMINADA';
  };

  const handlePrint = () => {
      window.print();
  };

  const renderTableByType = (materials: MaterialItem[], title: string, icon: React.ReactNode, colorClass: string, isMissingReport: boolean = false) => {
    if (materials.length === 0) return null;
    return (
        <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm mb-10 print:mb-6 print:border-slate-300 print:shadow-none break-inside-avoid">
            <div className={`p-4 ${colorClass} text-white flex justify-between items-center print:bg-slate-100 print:text-black print:border-b-2 print:border-slate-300`}>
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg print:hidden">{icon}</div>
                    <h3 className="font-black uppercase text-xs tracking-widest leading-none">{title} {isMissingReport && "— FALTAS"}</h3>
                </div>
                <div className="bg-black/10 px-3 py-1 rounded-lg text-[9px] font-black print:text-slate-500">{materials.length} ITENS</div>
            </div>
            <table className="w-full text-left text-[11px] font-bold uppercase border-collapse print:text-[10px]">
                <thead className="bg-slate-50 text-slate-400 border-b print:bg-slate-50 print:text-slate-600">
                    <tr>
                        <th className="p-4 text-center w-24 print:p-2">QTD</th>
                        <th className="p-4 print:p-2">ESPECIFICAÇÃO / DESCRIÇÃO</th>
                        <th className="p-4 text-center print:p-2">BITOLA / Ø</th>
                        <th className="p-4 text-center print:p-2">MEDIDAS</th>
                        <th className="p-4 text-center w-24 print:p-2">CONF.</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {materials.map((item, idx) => {
                        // Cálculo de exibição: Se for relatório de faltas, mostra apenas o que falta
                        let displayQty = item.quantity;
                        let hasDiscount = false;
                        
                        if (isMissingReport) {
                            if (item.type === MaterialType.BAR) {
                                const gross = item.quantity * ((item.lengthMm || 0) + 4);
                                displayQty = Math.max(0, gross - (item.stockLengthMm || 0));
                            } else {
                                displayQty = Math.max(0, item.quantity - (item.qtyInStock || 0));
                                if ((item.qtyInStock || 0) > 0) hasDiscount = true;
                            }
                        }

                        if (displayQty <= 0 && isMissingReport) return null;

                        return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors print:bg-white">
                            <td className="p-4 text-center print:p-2">
                                <div className="font-black text-2xl text-slate-900 print:text-lg">{Math.round(displayQty)}</div>
                                {hasDiscount && <div className="text-[7px] text-emerald-600 font-black tracking-widest mt-1">- ESTOQUE</div>}
                            </td>
                            <td className="p-4 print:p-2">
                                <div className="font-black text-slate-900 print:text-xs">{item.name}</div>
                                <div className="text-[8px] text-slate-400 mt-1 uppercase font-bold print:text-[7px]">{item.details?.substring(0, 100)}</div>
                                <div className="text-[7px] text-indigo-500 font-black mt-1 uppercase">{item.materialGrade}</div>
                            </td>
                            <td className="p-4 text-center print:p-2">
                                <div className="font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg inline-block print:bg-white print:border">{item.gauge || '-'}</div>
                            </td>
                            <td className="p-4 text-center print:p-2">
                                <div className="font-black text-slate-700">
                                    {item.type === MaterialType.SHEET ? `${item.widthMm}x${item.lengthMm}` : item.type === MaterialType.BAR ? `${item.lengthMm || '-'} MM` : '-'}
                                </div>
                            </td>
                            <td className="p-4 text-center print:p-2">
                                <div className="w-6 h-6 border-2 border-slate-200 rounded mx-auto print:border-slate-400"></div>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
    );
  };

  const renderOpAnalytic = () => {
    if (!selectedProject) {
        const filtered = projects.filter(p => 
            p.opNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.client.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setReportType('NONE')} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 text-slate-400"><ArrowLeft size={20}/></button>
                        <div>
                            <h2 className="text-xl font-black uppercase text-slate-900 leading-none">Analítico por OP</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Selecione uma OP para detalhar relatórios técnicos</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input type="text" placeholder="BUSCAR OP..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(p => (
                        <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                             <div className="flex justify-between items-center mb-4">
                                 <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest">{p.opNumber}</span>
                                 <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold">
                                     <TrendingUp size={12}/> {p.status}
                                 </div>
                             </div>
                             <h4 className="font-black text-slate-900 uppercase text-lg group-hover:text-indigo-600 transition-colors">{p.client}</h4>
                             <p className="text-slate-400 text-[10px] mt-1 font-bold truncate uppercase">{p.description}</p>
                             <div className="mt-6 flex items-center justify-between text-[10px] font-black uppercase text-slate-300">
                                 <div className="flex items-center gap-2"><Layers size={14}/> {p.materials.length} ITENS</div>
                                 <div className="text-indigo-500">ABRIR PAINEL →</div>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const materials = selectedProject.materials;
    const isMissing = opAnalyticType === 'PENDING_BUY';
    
    let filteredMaterials: MaterialItem[] = [];
    let reportTitle = "";
    let reportIcon = <FileText size={20}/>;

    switch(opAnalyticType) {
        case 'COMMERCIAL':
            filteredMaterials = materials.filter(m => m.type === MaterialType.COMMERCIAL);
            reportTitle = "Relatório de Itens Comerciais / Acessórios";
            reportIcon = <ShoppingCart size={20}/>;
            break;
        case 'CUTTING':
            filteredMaterials = materials.filter(m => m.type === MaterialType.BAR || m.type === MaterialType.SHEET);
            reportTitle = "Relatório de Corte: Barras e Chapas";
            reportIcon = <Box size={20}/>;
            break;
        case 'STOCK_USED':
            filteredMaterials = materials.filter(m => (m.qtyInStock || 0) > 0 || (m.stockLengthMm || 0) > 0);
            reportTitle = "Relatório de Atendimento por Estoque";
            reportIcon = <Warehouse className="text-emerald-500" size={20}/>;
            break;
        case 'PENDING_BUY':
            // Filtragem inteligente de faltas
            filteredMaterials = materials.filter(m => {
                if (m.purchaseStatus === 'COMPLETED') return false;
                if (m.type === MaterialType.BAR) return (m.quantity * ((m.lengthMm || 0) + 4) - (m.stockLengthMm || 0)) > 0;
                return (m.quantity - (m.qtyInStock || 0)) > 0;
            });
            reportTitle = "Relatório de Faltas / Itens Pendentes de Compra";
            reportIcon = <AlertCircle className="text-red-500" size={20}/>;
            break;
        case 'ARRIVED':
            filteredMaterials = materials.filter(m => m.purchaseStatus === 'COMPLETED' || m.purchaseStatus === 'DELIVERED');
            reportTitle = "Relatório de Recebimento / Materiais em Fábrica";
            reportIcon = <CheckCircle className="text-teal-500" size={20}/>;
            break;
    }

    const bars = filteredMaterials.filter(m => m.type === MaterialType.BAR);
    const sheets = filteredMaterials.filter(m => m.type === MaterialType.SHEET);
    const commercials = filteredMaterials.filter(m => m.type === MaterialType.COMMERCIAL);

    return (
        <div className="report-printable-area animate-fade-in space-y-6 pb-20">
            <div className="bg-white p-6 rounded-[2.5rem] border shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedProjectId(null)} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 text-slate-400"><ArrowLeft size={20}/></button>
                    <div>
                        <h2 className="text-xl font-black uppercase text-slate-900 leading-none">OP {selectedProject.opNumber} — Analítico</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{selectedProject.client}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                     <button onClick={handlePrint} className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl"><Printer size={18}/> Imprimir Relatório Atual</button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border shadow-sm p-4 print:hidden flex flex-wrap gap-2">
                {[
                    {id: 'COMMERCIAL', label: 'Comercial', icon: <ShoppingCart size={14}/>},
                    {id: 'CUTTING', label: 'Corte (Usina)', icon: <Box size={14}/>},
                    {id: 'STOCK_USED', label: 'Consumo Estoque', icon: <Layers size={14}/>},
                    {id: 'PENDING_BUY', label: 'Faltas / Compras', icon: <ShoppingCart size={14}/>},
                    {id: 'ARRIVED', label: 'Recebidos / Fábrica', icon: <Truck size={14}/>},
                ].map(opt => (
                    <button key={opt.id} onClick={() => setOpAnalyticType(opt.id as any)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${opAnalyticType === opt.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                        {opt.icon} {opt.label}
                    </button>
                ))}
            </div>

            <div className="space-y-0 print:space-y-4">
                 <div className="hidden print:flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-4 mx-2">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">REQUISIÇÃO TÉCNICA — ZINDRA ERP</h1>
                        <p className="text-xs font-bold uppercase mt-2">OP: {selectedProject.opNumber} — {selectedProject.client}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{reportTitle}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase">GERADO EM: {new Date().toLocaleDateString()}</p>
                    </div>
                 </div>

                 {renderTableByType(sheets, "Lista de Chapas", <Layers size={18}/>, "bg-indigo-600", isMissing)}
                 {renderTableByType(bars, "Lista de Barras / Perfis", <Box size={18}/>, "bg-orange-600", isMissing)}
                 {renderTableByType(commercials, "Itens Comerciais / Acessórios", <ShoppingCart size={18}/>, "bg-purple-600", isMissing)}

                 {filteredMaterials.length === 0 && (
                     <div className="bg-white p-20 text-center border-4 border-dashed rounded-[3rem] border-slate-100 text-slate-300 font-black uppercase">Nenhum item pendente nesta categoria.</div>
                 )}
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-dashed border-slate-200 text-center print:border-none print:bg-white print:pt-10">
                 <div className="hidden print:grid grid-cols-2 gap-20 mb-10 text-center">
                    <div className="border-t border-black pt-2">
                        <p className="text-[8px] font-bold uppercase">RESPONSÁVEL PELO PCP</p>
                    </div>
                    <div className="border-t border-black pt-2">
                        <p className="text-[8px] font-bold uppercase">AUTORIZAÇÃO DE COMPRA</p>
                    </div>
                 </div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest print:text-[8px]">Relatório v.26.10 — OP {selectedProject.opNumber}.</p>
            </div>
        </div>
    );
  };

  const renderPurchaseReport = () => {
    const filteredProjects = projects.filter(p => 
      p.opNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const purchaseData: any[] = [];

    // CONSOLIDAÇÃO GLOBAL DE NECESSIDADES (ABATENDO ESTOQUE)
    filteredProjects.forEach(p => {
        p.materials.forEach(m => {
            if (m.purchaseStatus !== 'COMPLETED') {
                const category = m.type === MaterialType.BAR ? getBarCategory(m.name) : m.type;
                const key = `${category}-${m.gauge}-${m.materialGrade}`;
                
                // Cálculo de Necessidade Bruta (com margem para barras)
                const gross = m.type === MaterialType.BAR ? (m.quantity * ((m.lengthMm || 0) + 4)) : m.quantity;
                const stock = m.type === MaterialType.BAR ? (m.stockLengthMm || 0) : (m.qtyInStock || 0);
                
                // Cálculo de Necessidade Líquida (ABATIMENTO REAL v.26.10)
                const netNeeded = Math.max(0, gross - stock);

                if (netNeeded > 0) {
                    const existing = purchaseData.find(x => x.key === key);
                    if (existing) {
                        existing.total += netNeeded;
                        if (!existing.ops.includes(p.opNumber)) existing.ops.push(p.opNumber);
                    } else {
                        purchaseData.push({ 
                            key, 
                            category: m.type === MaterialType.BAR ? category : m.name, 
                            gauge: m.gauge, 
                            materialGrade: m.materialGrade, 
                            type: m.type, 
                            total: netNeeded, 
                            ops: [p.opNumber],
                            hasStockAbatement: stock > 0
                        });
                    }
                }
            }
        });
    });

    const bars = purchaseData.filter(d => d.type === MaterialType.BAR);
    const sheets = purchaseData.filter(d => d.type === MaterialType.SHEET);
    const commercials = purchaseData.filter(d => d.type === MaterialType.COMMERCIAL);

    return (
      <div className="report-printable-area animate-fade-in space-y-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] border print:hidden shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={() => setReportType('NONE')} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-slate-400"><ArrowLeft size={20}/></button>
                <div>
                    <h2 className="text-xl font-black uppercase text-slate-900 leading-none">Relatório Global de Compras</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Consolidação Líquida (Abatendo Saldo em Estoque)</p>
                </div>
            </div>
            <button onClick={handlePrint} className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-xl hover:bg-indigo-600 transition-all"><Printer size={18}/> Imprimir Lista de Faltas</button>
        </div>

        <div className="space-y-10 print:space-y-6">
            {/* SEÇÃO CHAPAS */}
            {sheets.length > 0 && (
                <div className="bg-white rounded-[2.5rem] border shadow-md overflow-hidden print:border-slate-300 break-inside-avoid">
                    <div className="p-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 print:bg-slate-100 print:text-black print:border-b-2">
                        <Layers size={18}/> COMPRAS: CHAPAS E PLACAS
                    </div>
                    <table className="w-full text-left text-[11px] font-bold uppercase border-collapse print:text-[10px]">
                        <thead className="bg-slate-50 text-slate-400 border-b">
                            <tr>
                                <th className="p-4">ESPECIFICAÇÃO</th>
                                <th className="p-4 text-center">BITOLA</th>
                                <th className="p-4 text-center">FALTA LÍQUIDA</th>
                                <th className="p-4">OPs DESTINO</th>
                                <th className="p-4 text-center w-20">CONF.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sheets.map((item, idx) => (
                                <tr key={idx} className="print:bg-white hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-black text-slate-900">{item.category}</div>
                                        <div className="text-[8px] text-indigo-600 font-black">{item.materialGrade}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-black">{item.gauge || '-'}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="text-lg font-black text-indigo-600">{Math.round(item.total)} PÇ</div>
                                        {item.hasStockAbatement && <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">c/ desconto estoque</span>}
                                    </td>
                                    <td className="p-4 text-[8px] opacity-60 font-bold max-w-xs">{item.ops.join(', ')}</td>
                                    <td className="p-4 text-center"><div className="w-5 h-5 border-2 border-slate-200 rounded mx-auto"></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SEÇÃO BARRAS */}
            {bars.length > 0 && (
                <div className="bg-white rounded-[2.5rem] border shadow-md overflow-hidden print:border-slate-300 break-inside-avoid">
                    <div className="p-4 bg-orange-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 print:bg-slate-100 print:text-black print:border-b-2">
                        <Box size={18}/> COMPRAS: BARRAS E PERFIS (MM)
                    </div>
                    <table className="w-full text-left text-[11px] font-bold uppercase border-collapse print:text-[10px]">
                        <thead className="bg-slate-50 text-slate-400 border-b">
                            <tr>
                                <th className="p-4">ESPECIFICAÇÃO</th>
                                <th className="p-4 text-center">BITOLA</th>
                                <th className="p-4 text-center">TOTAL LINEAR FALTANTE</th>
                                <th className="p-4">OPs DESTINO</th>
                                <th className="p-4 text-center w-20">CONF.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {bars.map((item, idx) => (
                                <tr key={idx} className="print:bg-white hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-black text-slate-900">{item.category}</div>
                                        <div className="text-[8px] text-orange-600 font-black">{item.materialGrade}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg font-black">{item.gauge || '-'}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="text-lg font-black text-orange-600">{Math.round(item.total)} MM</div>
                                        {item.hasStockAbatement && <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">c/ saldo abatido</span>}
                                    </td>
                                    <td className="p-4 text-[8px] opacity-60 font-bold max-w-xs">{item.ops.join(', ')}</td>
                                    <td className="p-4 text-center"><div className="w-5 h-5 border-2 border-slate-200 rounded mx-auto"></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SEÇÃO COMERCIAIS */}
            {commercials.length > 0 && (
                <div className="bg-white rounded-[2.5rem] border shadow-md overflow-hidden print:border-slate-300 break-inside-avoid">
                    <div className="p-4 bg-purple-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 print:bg-slate-100 print:text-black print:border-b-2">
                        <ShoppingCart size={18}/> COMPRAS: ITENS COMERCIAIS / ARRUELAS
                    </div>
                    <table className="w-full text-left text-[11px] font-bold uppercase border-collapse print:text-[10px]">
                        <thead className="bg-slate-50 text-slate-400 border-b">
                            <tr>
                                <th className="p-4">DESCRIÇÃO</th>
                                <th className="p-4 text-center">BITOLA / REF</th>
                                <th className="p-4 text-center">QUANTIDADE FALTANTE</th>
                                <th className="p-4">OPs DESTINO</th>
                                <th className="p-4 text-center w-20">CONF.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {commercials.map((item, idx) => (
                                <tr key={idx} className="print:bg-white hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-black text-slate-900">{item.category}</div>
                                        <div className="text-[8px] text-purple-600 font-black">{item.materialGrade}</div>
                                    </td>
                                    <td className="p-4 text-center font-black">{item.gauge || '-'}</td>
                                    <td className="p-4 text-center">
                                        <div className="text-xl font-black text-purple-600">{Math.round(item.total)} PÇ</div>
                                        {item.hasStockAbatement && <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">abatido saldo estoque</span>}
                                    </td>
                                    <td className="p-4 text-[8px] opacity-60 font-bold max-w-xs">{item.ops.join(', ')}</td>
                                    <td className="p-4 text-center"><div className="w-5 h-5 border-2 border-slate-200 rounded mx-auto"></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {purchaseData.length === 0 && (
                <div className="bg-white p-32 text-center rounded-[3rem] border-4 border-dashed border-slate-100">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-200 mb-4" />
                    <p className="text-slate-300 font-black uppercase text-xs tracking-[0.3em]">Nenhuma necessidade de compra pendente.</p>
                </div>
            )}
        </div>
      </div>
    );
  };

  const renderStockReport = () => {
    const stockItems: any[] = [];
    projects.forEach(p => {
      p.materials.forEach(m => {
        if ((m.qtyInStock || 0) > 0 || (m.stockLengthMm || 0) > 0) {
          stockItems.push({ op: p.opNumber, client: p.client, name: m.name, type: m.type, gauge: m.gauge, material: m.materialGrade, qty: m.qtyInStock || 0, len: m.stockLengthMm || 0 });
        }
      });
    });

    return (
      <div className="report-printable-area animate-fade-in space-y-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] border print:hidden shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={() => setReportType('NONE')} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-slate-400"><ArrowLeft size={20}/></button>
                <div>
                    <h2 className="text-xl font-black uppercase text-slate-900 leading-none">Relatório de Estoque (Sobras)</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Materiais Disponíveis em Fábrica Reservados p/ OPs</p>
                </div>
            </div>
            <button onClick={handlePrint} className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 shadow-xl hover:bg-indigo-600 transition-all"><Printer size={18}/> Imprimir Estoque</button>
        </div>
        <div className="bg-white rounded-[2.5rem] border shadow-md overflow-hidden print:border-none print:shadow-none">
             <div className="hidden print:flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-6 mx-6 mt-6">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter">LISTA DE SALDO EM ESTOQUE</h1>
                    <p className="text-xs font-bold uppercase">MATERIAIS RESERVADOS PARA PRODUÇÃO</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase">DATA: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
            <table className="w-full text-left text-[11px] font-bold uppercase border-collapse print:text-xs">
                <thead className="bg-slate-50 text-slate-400 border-b print:bg-slate-100 print:text-black">
                    <tr>
                        <th className="p-5 print:p-2">OP / CLIENTE</th>
                        <th className="p-5 print:p-2">DESCRIÇÃO DO ITEM</th>
                        <th className="p-5 text-center print:p-2">BITOLA</th>
                        <th className="p-5 text-center print:p-2">SALDO DISPONÍVEL</th>
                        <th className="p-5 text-center print:p-2">TIPO</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {stockItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 print:bg-white">
                            <td className="p-5 print:p-2">
                                <div className="font-black text-slate-900 print:text-xs">OP {item.op}</div>
                                <div className="text-[9px] text-slate-400 mt-0.5 print:text-[8px]">{item.client}</div>
                            </td>
                            <td className="p-5 font-black text-slate-700 uppercase print:p-2 print:text-xs">{item.name}</td>
                            <td className="p-5 text-center font-black text-indigo-600 text-base print:p-2 print:text-xs">{item.gauge || '-'}</td>
                            <td className="p-5 text-center print:p-2">
                                <div className="text-xl font-black text-emerald-600 print:text-sm">{item.type === MaterialType.BAR ? `${item.len} MM` : `${item.qty} PÇ`}</div>
                            </td>
                            <td className="p-5 text-center print:p-2">
                                <span className="px-3 py-1 bg-slate-100 rounded-full text-[8px] font-black text-slate-500 print:bg-white print:border print:border-slate-200">{item.type}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    );
  };

  if (reportType === 'PURCHASE') return renderPurchaseReport();
  if (reportType === 'STOCK') return renderStockReport();
  if (reportType === 'OP_ANALYTIC') return renderOpAnalytic();

  return (
    <div className="space-y-8 animate-fade-in print:hidden">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex items-center gap-4 border-t-4 border-indigo-600">
            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-100"><FileText size={28}/></div>
            <div>
                <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tighter leading-none">Central de Inteligência Zindra</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">v.26.10 — Relatórios Globais e Analíticos</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div onClick={() => {setReportType('OP_ANALYTIC'); setSelectedProjectId(null);}} className="bg-white p-10 rounded-[3rem] border-2 border-transparent hover:border-indigo-500 hover:shadow-2xl transition-all cursor-pointer group flex flex-col items-center text-center space-y-6 shadow-sm">
                <div className="bg-indigo-50 p-8 rounded-[2.5rem] text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                    <ClipboardList size={48} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase text-slate-900 tracking-tighter">Analítico por OP</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Relatórios técnicos detalhados de cada Ordem de Produção.</p>
                </div>
                <div className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg group-hover:bg-indigo-600 transition-all flex items-center gap-2">Abrir Painel OP</div>
            </div>

            <div onClick={() => {setReportType('PURCHASE'); setSearchTerm('');}} className="bg-white p-10 rounded-[3rem] border-2 border-transparent hover:border-orange-500 hover:shadow-2xl transition-all cursor-pointer group flex flex-col items-center text-center space-y-6 shadow-sm">
                <div className="bg-orange-50 p-8 rounded-[2.5rem] text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-inner">
                    <ShoppingCart size={48} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase text-slate-900 tracking-tighter">Consolidado Compras</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Totalização global de faltas abatendo o estoque atual.</p>
                </div>
                <div className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg group-hover:bg-orange-600 transition-all flex items-center gap-2">Ver Lista de Faltas</div>
            </div>

            <div onClick={() => {setReportType('STOCK'); setSearchTerm('');}} className="bg-white p-10 rounded-[3rem] border-2 border-transparent hover:border-emerald-500 hover:shadow-2xl transition-all cursor-pointer group flex flex-col items-center text-center space-y-6 shadow-sm">
                <div className="bg-emerald-50 p-8 rounded-[2.5rem] text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                    <Package size={48} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase text-slate-900 tracking-tighter">Saldos de Fábrica</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Materiais disponíveis ou sobras reservadas para uso.</p>
                </div>
                <div className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg group-hover:bg-emerald-600 transition-all flex items-center gap-2">Ver Estoque Atual</div>
            </div>
        </div>

        <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100/50 flex items-center gap-5">
            <Info className="text-indigo-400 shrink-0" size={24} />
            <p className="text-[9px] font-bold text-indigo-900/60 uppercase tracking-widest leading-relaxed">
                Relatórios v.26.10: O motor de cálculo agora abate rigorosamente o estoque de cada item antes de gerar as listas de compras. Arruelas e outros comerciais com saldo em estoque não aparecem mais como faltas integrais.
            </p>
        </div>
    </div>
  );
};