import React from 'react';
import { Project, ProjectStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
}

export const DashboardView: React.FC<DashboardProps> = ({ projects }) => {
  // Calculate Stats
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
      <h2 className="text-2xl font-bold text-slate-800">Visão Geral da Fábrica</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Total de OPs</p>
            <p className="text-3xl font-bold text-slate-800">{total}</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><TrendingUp size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Em Produção</p>
            <p className="text-3xl font-bold text-emerald-600">{inProduction}</p>
          </div>
          <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><FactoryIcon size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Parado em Compras</p>
            <p className="text-3xl font-bold text-red-500">{inPurchasing}</p>
          </div>
          <div className="bg-red-100 p-3 rounded-lg text-red-500"><AlertCircle size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Novas OPs</p>
            <p className="text-3xl font-bold text-yellow-600">{inCommercial}</p>
          </div>
          <div className="bg-yellow-100 p-3 rounded-lg text-yellow-600"><Clock size={24} /></div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Volume por Estágio</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} angle={-15} textAnchor="end" height={60}/>
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Distribuição</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Helper icon
const FactoryIcon = ({size}: {size: number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>
);
