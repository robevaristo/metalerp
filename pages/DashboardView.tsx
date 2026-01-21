
import React from 'react';
import { Project, ProjectStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const FactoryIcon = ({size}: {size: number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>
);

interface DashboardProps {
  projects: Project[];
}

export const DashboardView: React.FC<DashboardProps> = ({ projects }) => {
  const total = projects.length;
  const inProduction = projects.filter(p => p.status === ProjectStatus.PRODUCTION).length;
  const inPurchasing = projects.filter(p => p.status === ProjectStatus.PURCHASING).length;
  const inCommercial = projects.filter(p => p.status === ProjectStatus.COMMERCIAL).length;

  const statusData = Object.values(ProjectStatus).map(status => ({
    name: status,
    value: projects.filter(p => p.status === status).length
  }));

  const COLORS = ['#FBBF24', '#6366F1', '#3B82F6', '#EF4444', '#10B981', '#9CA3AF'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Visão Geral da Fábrica</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total de OPs</p>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{total}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-2xl text-blue-600"><TrendingUp size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Em Produção</p>
            <p className="text-3xl font-black text-emerald-600 tracking-tighter">{inProduction}</p>
          </div>
          <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600"><FactoryIcon size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Parado Compras</p>
            <p className="text-3xl font-black text-red-500 tracking-tighter">{inPurchasing}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-2xl text-red-500"><AlertCircle size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Novas OPs</p>
            <p className="text-3xl font-black text-yellow-600 tracking-tighter">{inCommercial}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-2xl text-yellow-600"><Clock size={24} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 h-[450px] flex flex-col">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Fluxo por Estágio</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 900}} interval={0} angle={-30} textAnchor="end" />
                <YAxis tick={{fontSize: 10}} stroke="#cbd5e1" />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#0d9488" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 h-[450px] flex flex-col">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Distribuição de Status</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                >
                    {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                </Pie>
                <Tooltip />
                </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
