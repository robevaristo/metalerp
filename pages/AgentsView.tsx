import React, { useState, useRef, useEffect } from 'react';
import { Project, MaterialType } from '../types';
import { askAgent, getAgentInsights } from '../services/geminiService';
import { Bot, Send, Cpu, ShoppingCart, Loader2, Sparkles, Box, Layers, Zap, Info, TrendingUp, BarChart3, Package, FileSpreadsheet, PlusCircle, CheckCircle2, ChevronRight, Hash } from 'lucide-react';

interface Message {
    role: 'user' | 'agent';
    text: string;
}

const getBarCategory = (name: string) => {
    const nameUpper = (name || '').toUpperCase();
    if (nameUpper.includes('ROSCADA')) return 'BARRA ROSCADA';
    if (nameUpper.includes('TREFILADA')) return 'BARRA TREFILADA';
    if (nameUpper.includes('TUBO')) return 'TUBO MECÂNICO';
    return 'BARRA LAMINADA';
};

const AgentPanel: React.FC<{ 
    type: 'BAR' | 'SHEET' | 'COMMERCIAL',
    title: string,
    icon: React.ReactNode,
    color: string,
    projects: Project[],
    delay?: number
}> = ({ type, title, icon, color, projects, delay = 0 }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState<string>('Aguardando...');
    const [loadingInsights, setLoadingInsights] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const rawItems = projects.flatMap(p => 
        p.materials.filter(m => {
            if (type === 'BAR') return m.type === MaterialType.BAR;
            if (type === 'SHEET') return m.type === MaterialType.SHEET;
            return m.type === MaterialType.COMMERCIAL;
        })
    );

    const consolidatedItems = rawItems.reduce((acc: any[], current) => {
        let key = "";
        let displayName = current.name;
        if (type === 'BAR') {
            const category = getBarCategory(current.name);
            key = `${category}-${current.gauge}-${current.materialGrade}`;
            displayName = category;
        } else if (type === 'SHEET') {
            key = `CHAPA-${current.gauge}-${current.materialGrade}`;
            displayName = "CHAPA";
        } else {
            key = `${current.name}-${current.materialGrade}`;
        }
        const existing = acc.find(item => item.key === key);
        if (existing) {
            existing.quantity += current.quantity;
            if (current.lengthMm) existing.totalMm = (existing.totalMm || 0) + (current.quantity * (current.lengthMm + 4));
        } else {
            acc.push({ ...current, key, name: displayName, totalMm: current.type === MaterialType.BAR ? (current.quantity * ((current.lengthMm || 0) + 4)) : 0 });
        }
        return acc;
    }, []);

    useEffect(() => {
        const fetchInsights = async () => {
            if (projects.length === 0) {
                setInsights("Célula vazia.");
                setLoadingInsights(false);
                return;
            }
            setLoadingInsights(true);
            setInsights("Respeitando cota de API...");
            
            // Escalonamento: evita que 3 agentes chamem a API no exato mesmo milissegundo
            await new Promise(r => setTimeout(r, delay));

            try {
                const res = await getAgentInsights(type, projects);
                setInsights(res);
            } catch (e: any) {
                setInsights(e.message?.includes('429') ? "Limite de cota excedido. Tente em breve." : "Erro na análise.");
            } finally {
                setLoadingInsights(false);
            }
        };
        fetchInsights();
    }, [projects, type, delay]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const userText = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setLoading(true);
        try {
            const response = await askAgent(type, userText, projects);
            setMessages(prev => [...prev, { role: 'agent', text: response }]);
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'agent', text: "Erro: " + (e.message?.includes('429') ? "Cota excedida." : "Falha na conexão.") }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[750px] bg-white rounded-[2.5rem] border shadow-xl overflow-hidden animate-fade-in group">
            <div className={`${color} p-6 text-white flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl">{icon}</div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-tighter leading-none">{title}</h4>
                        <p className="text-[8px] font-bold opacity-70 uppercase tracking-widest mt-1">Gestão de Célula</p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black">{consolidatedItems.length} MATERIAIS</div>
            </div>

            <div className="p-5 bg-slate-900 space-y-3">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                    <p className="text-[8px] font-black text-teal-400 uppercase mb-2 flex items-center gap-2"><Zap size={10} fill="currentColor"/> Insights v.26.12</p>
                    {loadingInsights ? (
                        <div className="flex items-center gap-2 py-1">
                            <Loader2 size={12} className="text-white/20 animate-spin" />
                            <p className="text-[9px] font-bold text-white/30 uppercase animate-pulse">{insights}</p>
                        </div>
                    ) : (
                        <div className="text-[10px] font-bold text-white/90 leading-relaxed whitespace-pre-line border-l-2 border-teal-500/50 pl-3">
                            {insights}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30 space-y-2" ref={scrollRef}>
                {consolidatedItems.length === 0 ? (
                    <div className="h-full flex items-center justify-center opacity-20 grayscale"><Package size={40} className="text-slate-300" /></div>
                ) : (
                    consolidatedItems.map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-900 text-white w-12 h-12 rounded-lg flex flex-col items-center justify-center">
                                    <span className="text-xs font-black">{item.quantity}</span>
                                    <span className="text-[6px] font-bold uppercase opacity-50">pçs</span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-900 uppercase leading-none">{item.name}</p>
                                    <div className="flex gap-2 mt-1.5">
                                        <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">BITOLA: {item.gauge || 'N/A'}</span>
                                        <span className="text-[8px] font-black text-indigo-500 uppercase">{item.materialGrade}</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-200" />
                        </div>
                    ))
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mt-4`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-[10px] font-bold leading-relaxed shadow-md ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-white border-t flex gap-2 items-center">
                <input 
                    className="flex-1 bg-slate-100 px-4 py-3 rounded-xl text-[11px] font-bold outline-none border-2 border-transparent focus:border-indigo-500/20"
                    placeholder="Dúvida técnica..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend} disabled={loading} className={`${color} text-white p-3 rounded-xl shadow-lg`}><Send size={16} /></button>
            </div>
        </div>
    );
}

export const AgentsView: React.FC<{ projects: Project[], onImportClick: () => void }> = ({ projects, onImportClick }) => {
    const totalItems = projects.reduce((acc, p) => acc + p.materials.length, 0);

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-slate-900 p-8 rounded-[3rem] shadow-xl relative overflow-hidden border-b-4 border-teal-500">
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="bg-teal-500 p-4 rounded-2xl shadow-lg shadow-teal-500/20"><Cpu className="text-slate-900" size={32} /></div>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">Agentes da Fábrica</h2>
                            <p className="text-[9px] font-bold text-teal-400 uppercase tracking-widest mt-2 flex items-center gap-2"><Zap size={10} fill="currentColor"/> v.26.12 — Resiliência de Cota Ativada</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onImportClick} className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center gap-2 hover:bg-slate-50 transition-all"><FileSpreadsheet size={16} className="text-indigo-600" /> Carregar Lote</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <AgentPanel type="BAR" title="Agente de Barras" icon={<Box size={24}/>} color="bg-orange-600" projects={projects} delay={0} />
                <AgentPanel type="SHEET" title="Agente de Chapas" icon={<Layers size={24}/>} color="bg-teal-600" projects={projects} delay={4000} />
                <AgentPanel type="COMMERCIAL" title="Agente Comercial" icon={<ShoppingCart size={24}/>} color="bg-indigo-600" projects={projects} delay={8000} />
            </div>
        </div>
    );
};