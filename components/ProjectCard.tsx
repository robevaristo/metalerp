import React from 'react';
import { Project, ProjectStatus } from '../types';
import { Calendar, User, Hash, Box, List, Trash2, Pencil } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
  actionButton?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, actionButton, onEdit, onDelete }) => {
  const statusColors = {
    [ProjectStatus.COMMERCIAL]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [ProjectStatus.ENGINEERING]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    [ProjectStatus.PCP]: 'bg-blue-100 text-blue-800 border-blue-200',
    [ProjectStatus.PURCHASING]: 'bg-red-100 text-red-800 border-red-200',
    [ProjectStatus.PRODUCTION]: 'bg-green-100 text-green-800 border-green-200',
    [ProjectStatus.COMPLETED]: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const totalQuantity = project.items.reduce((acc, item) => acc + item.quantity, 0);

  // Manipuladores de evento simples e diretos
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o clique suba para o card
    if (onEdit) onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o clique suba para o card
    if (onDelete) {
        // A lógica de confirmação (window.confirm) já está no componente pai (App.tsx)
        onDelete();
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* HEADER: Estrutura simples, sem z-index complexo */}
      <div className="p-5 pb-0 flex justify-between items-start">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[project.status]}`}>
            {project.status}
          </span>
          
          <div className="flex items-center gap-2 pl-2">
              {onEdit && (
                  <button 
                      onClick={handleEdit}
                      className="p-2 text-slate-500 bg-slate-100 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                      title="Editar OP"
                  >
                      <Pencil size={16} />
                  </button>
              )}
              {onDelete && (
                  <button 
                      onClick={handleDelete}
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-100"
                      title="Excluir OP"
                  >
                      <Trash2 size={16} />
                  </button>
              )}
              <span className="text-slate-400 text-sm flex items-center gap-1 ml-2 border-l border-slate-200 pl-2 select-none">
                  <Hash size={14} /> {project.opNumber}
              </span>
          </div>
      </div>
      
      {/* BODY */}
      <div className="px-5 pb-5 flex-1 flex flex-col pt-3">
          <h3 className="font-bold text-lg text-slate-800 mb-1 truncate" title={project.description}>
            {project.description}
          </h3>
          <p className="text-slate-500 text-sm mb-4 flex items-center gap-2">
            <User size={14} /> {project.client}
          </p>

          <div className="bg-slate-50 rounded p-3 mb-4 flex-1 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2 uppercase">
                <List size={12} /> Itens ({project.items.length})
            </div>
            <ul className="text-sm space-y-1 text-slate-700">
                {project.items.slice(0, 3).map(item => (
                    <li key={item.id} className="flex justify-between truncate">
                        <span className="truncate flex-1 mr-2">- {item.description}</span>
                        <span className="font-mono text-slate-500">x{item.quantity}</span>
                    </li>
                ))}
                {project.items.length > 3 && (
                    <li className="text-xs text-slate-400 italic">+ {project.items.length - 3} outros itens...</li>
                )}
            </ul>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600 border-t border-slate-100 pt-3 mt-auto">
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-slate-400" />
              <span>{new Date(project.implantationDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Box size={14} className="text-slate-400" />
              <span className="font-bold">{totalQuantity}</span> <span className="text-xs">peças totais</span>
            </div>
          </div>
      </div>

      {/* FOOTER ACTION */}
      {actionButton && (
        <div className="px-5 pb-5 pt-0" onClick={(e) => e.stopPropagation()}>
          {actionButton}
        </div>
      )}
    </div>
  );
};