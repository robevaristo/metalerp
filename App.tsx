import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './pages/DashboardView';
import { CommercialView } from './pages/CommercialView';
import { PcpView } from './pages/PcpView';
import { PurchasingView } from './pages/PurchasingView';
import { ProductionView } from './pages/ProductionView';
import { TimesheetView } from './pages/TimesheetView';
import { Project, ProjectStatus, ProductionProcess } from './types';
import { ProjectCard } from './components/ProjectCard';
import { CheckCircle, Trash2, Pencil } from 'lucide-react';

const INITIAL_PROJECTS: Project[] = [
  {
    id: '1',
    opNumber: '0831-25',
    client: 'ÓTIMA PORTAS INDÚSTRIA',
    description: 'Pedido Mancais e Calhas',
    items: [
        { id: 'i1', description: 'mancal fundido fixo modelo Omeco Ø30', quantity: 50 },
        { id: 'i2', description: 'mancal movel modelo Omeco Ø30', quantity: 50 },
        { id: 'i3', description: 'calha inferior tamanho 5900', quantity: 15 },
        { id: 'i4', description: 'calha superior tamanho 5900', quantity: 15 },
        { id: 'i5', description: 'engrenagem fundida Ø105mm 10 dentes Ø25xcht', quantity: 20 },
        { id: 'i6', description: 'rolo inferior de tração modelo omeco', quantity: 10 },
        { id: 'i7', description: 'vedação almofada', quantity: 200 }
    ],
    implantationDate: '2025-11-18',
    status: ProjectStatus.PCP,
    materials: [],
    createdAt: '2025-11-18T10:00:00Z'
  },
  {
    id: '2',
    opNumber: 'OP-1002',
    client: 'Construtora Forte',
    description: 'Guarda-corpo Inox 304',
    items: [
        { id: 'i21', description: 'Módulo Guarda-corpo 2m', quantity: 25 },
        { id: 'i22', description: 'Módulo Guarda-corpo Canto', quantity: 4 }
    ],
    implantationDate: '2024-05-20',
    status: ProjectStatus.COMMERCIAL,
    materials: [],
    createdAt: '2024-05-12T14:30:00Z'
  },
  {
      id: '4',
      opNumber: 'OP-1005',
      client: 'AgroTech',
      description: 'Silo para Grãos - Base Metálica',
      items: [
          { id: 'i41', description: 'Estrutura Base Silo', quantity: 1 }
      ],
      implantationDate: '2024-06-01',
      status: ProjectStatus.PURCHASING,
      materials: [
          { id: 'm1', name: 'Viga I 6"', type: 'BARRA', quantity: 120, unit: 'm', inStock: true } as any,
          { id: 'm2', name: 'Chapa 3/8" ASTM A36', type: 'CHAPA', quantity: 10, unit: 'pç', inStock: false } as any
      ],
      createdAt: '2024-05-18T11:20:00Z'
  }
];

const DEFAULT_PROCESSES: ProductionProcess[] = [
    { id: 'CUTTING', name: 'Corte', color: 'orange' },
    { id: 'MACHINING', name: 'Usinagem', color: 'blue' },
    { id: 'WELDING', name: 'Solda', color: 'red' },
    { id: 'PAINTING', name: 'Pintura', color: 'purple' },
    { id: 'ASSEMBLY', name: 'Montagem', color: 'indigo' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
        const saved = localStorage.getItem('metal_erp_projects');
        return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    } catch (e) {
        console.error("Erro ao carregar projetos", e);
        return INITIAL_PROJECTS;
    }
  });
  
  const [productionProcesses, setProductionProcesses] = useState<ProductionProcess[]>([]);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('production_processes');
    if (saved) {
        setProductionProcesses(JSON.parse(saved));
    } else {
        setProductionProcesses(DEFAULT_PROCESSES);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('metal_erp_projects', JSON.stringify(projects));
  }, [projects]);

  const updateProductionProcesses = (newProcesses: ProductionProcess[]) => {
      setProductionProcesses(newProcesses);
      localStorage.setItem('production_processes', JSON.stringify(newProcesses));
  };

  const addProject = (project: Project) => {
    setProjects(prev => [project, ...prev]);
  };

  const updateStatus = (id: string, status: ProjectStatus) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  // ROBUST DELETE FUNCTION - Synchronous
  const deleteProject = (id: string) => {
    if (window.confirm('ATENÇÃO: Tem certeza que deseja EXCLUIR esta OP e todos os dados relacionados?')) {
        setProjects(prev => {
            const updated = prev.filter(p => p.id !== id);
            // Force save immediately to local storage to ensure sync
            localStorage.setItem('metal_erp_projects', JSON.stringify(updated));
            return updated;
        });
    }
  };

  const handleEditProject = (project: Project) => {
      setProjectToEdit(project);
      setCurrentView('commercial');
  };

  const EngineeringView = () => {
    const visibleProjects = projects.filter(p => 
        p.status === ProjectStatus.ENGINEERING || 
        p.status === ProjectStatus.PCP || 
        p.status === ProjectStatus.PURCHASING || 
        p.status === ProjectStatus.PRODUCTION || 
        p.status === ProjectStatus.COMPLETED
    );

    return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold text-slate-800">Projetos & Engenharia</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleProjects.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-400">Nenhum projeto em fase de engenharia ou posterior.</p>
            </div>
        )}
        {visibleProjects.map(project => {
            const isActive = project.status === ProjectStatus.ENGINEERING;
            return (
              <ProjectCard 
                key={project.id} 
                project={project}
                onDelete={() => deleteProject(project.id)}
                onEdit={() => handleEditProject(project)}
                actionButton={
                    isActive ? (
                        <button 
                          onClick={() => updateStatus(project.id, ProjectStatus.PCP)}
                          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                        >
                          Liberar para PCP
                        </button>
                    ) : (
                        <div className="w-full py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                            <CheckCircle size={16} /> Etapa: {project.status}
                        </div>
                    )
                }
              />
            );
        })}
       </div>
    </div>
  )};

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <main className="ml-64 flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {currentView === 'dashboard' && <DashboardView projects={projects} />}
          {currentView === 'commercial' && (
            <CommercialView 
                projects={projects} 
                addProject={addProject} 
                updateProject={updateProject} 
                deleteProject={deleteProject}
                updateStatus={updateStatus} 
                projectToEdit={projectToEdit}
                clearProjectToEdit={() => setProjectToEdit(null)}
            />
          )}
          {currentView === 'engineering' && <EngineeringView />}
          {currentView === 'pcp' && <PcpView 
                projects={projects} 
                updateProject={updateProject} 
                updateStatus={updateStatus} 
                onEditProject={handleEditProject}
                onDeleteProject={deleteProject}
          />}
          {currentView === 'purchasing' && <PurchasingView 
                projects={projects} 
                updateStatus={updateStatus} 
                updateProject={updateProject} 
                onEditProject={handleEditProject}
                onDeleteProject={deleteProject}
          />}
          {currentView === 'production' && <ProductionView 
                projects={projects} 
                updateProject={updateProject} 
                updateStatus={updateStatus} 
                productionProcesses={productionProcesses} 
                updateProductionProcesses={updateProductionProcesses} 
                onEditProject={handleEditProject}
                onDeleteProject={deleteProject}
          />}
          {currentView === 'timesheet' && <TimesheetView />}
        </div>
      </main>
    </div>
  );
};

export default App;