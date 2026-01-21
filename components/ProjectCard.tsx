
import React from 'react';
import { Project, ProjectStatus } from '../types';
import { Calendar, User, Hash, Box, List, Trash2, Pencil, ChevronRight, FileText } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
  actionButton?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, actionButton, onEdit, onDelete }) => {
  const statusColors = {
    [ProjectStatus.COMMERCIAL]: 'bg-teal-50 text-teal-700 border-teal-100',
    [ProjectStatus.ENGINEERING]: 'bg-purple-50 text-purple-700 border-purple-100',
    [ProjectStatus.PCP]: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    [ProjectStatus.PURCHASING]: 'bg-red-50 text-red-700 border-red-100',
    [ProjectStatus.PRODUCTION]: 'bg-green-50 text-green-700 border-green-100',
    [ProjectStatus.COMPLETED]: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col h-full overflow-hidden group"
    >
      <div className="p-7">
          <div className="flex justify-between items-center mb-5">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${statusColors[project.status]}`}>
                {project.status}
              </span>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                  <Hash size={12} className="text-slate-400" />
                  <span className="text-slate-600 font-black text-xs">{project.opNumber}</span>
              </div>
          </div>

          <div className="mb-6">
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <FileText size={14} /> Descrição da Proposta / OP
              </p>
              <h3 className="font-black text-slate-900 text-2xl leading-none tracking-tighter uppercase group-hover:text-teal-600 transition-colors">
                {project.description}
              </h3>
          </div>
          
          <div className="flex items-center gap-3 text-slate-600 font-bold text-sm mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <User size={16} className="text-teal-500" />
            </div>
            <span className="truncate">{project.client}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 mb-6 shadow-inner">
              <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">
                  <List size={14} /> Resumo dos Itens
              </div>
              <ul className="space-y-2.5">
                  {project.items.slice(0, 3).map(item => (
                      <li key={item.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold truncate pr-4">• {item.description}</span>
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-black">x{item.quantity}</span>
                      </li>
                  ))}
                  {project.items.length > 3 && (
                      <li className="text-[10px] text-teal-500 font-black uppercase tracking-widest pt-2 flex items-center gap-1">
                          <ChevronRight size={12} /> Mais {project.items.length - 3} itens vinculados
                      </li>
                  )}
              </ul>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-5 mt-auto">
              <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-300" /> 
                  <span className="uppercase tracking-tight">{new Date(project.implantationDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-2 hover:bg-teal-50 hover:text-teal-600 rounded-xl transition-all"><Pencil size={18}/></button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"><Trash2 size={18}/></button>
              </div>
          </div>
      </div>

      {actionButton && (
        <div className="px-7 pb-7 pt-0 mt-auto">
          {actionButton}
        </div>
      )}
    </div>
  );
};
