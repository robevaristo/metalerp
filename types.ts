
export enum ProjectStatus {
  COMMERCIAL = 'COMERCIAL', // Orçamento/Proposta
  ENGINEERING = 'PROJETO',  // Engenharia/Desenho
  PCP = 'PCP',              // Planejamento
  PURCHASING = 'COMPRAS',   // Aguardando Material
  PRODUCTION = 'PRODUCAO',  // Em fabricação
  COMPLETED = 'CONCLUIDO'   // Finalizado
}

export enum MaterialType {
  BAR = 'BARRA',
  SHEET = 'CHAPA',
  COMMERCIAL = 'COMERCIAL_PART'
}

export type PurchaseStatus = 'PENDING' | 'REQUESTED' | 'QUOTING' | 'ORDERED' | 'DELIVERED' | 'COMPLETED';

// Modified to allow dynamic strings from user configuration
export type ProductionStatus = 'WAITING' | 'DONE' | string;

export interface ProductionProcess {
  id: string;
  name: string;
  color: 'blue' | 'orange' | 'red' | 'green' | 'purple' | 'indigo' | 'pink' | 'slate';
}

export interface ProductionHistory {
  status: string;
  timestamp: string; // ISO Date string
  user?: string; // Optional: who changed it
}

export interface MaterialItem {
  id: string;
  name: string; // Nome consolidado para compras (Ex: Tubo Quadrado 2x60)
  type: MaterialType;
  quantity: number;
  unit: string;
  inStock: boolean; // Computed: true if qtyInStock >= quantity (or totalLengthCalc for bars)
  qtyInStock?: number; // Quantidade real que temos na fábrica (ou mm se for barra)
  assignedTo?: string; // For commercial parts assigned to an employee
  stockNumber?: string; // Numero de estoque
  drawingNumber?: string; // Numero do Desenho
  details?: string; // Material details (e.g. SAE 1020, ASTM A36)
  observation?: string; // NEW: Field for substitutions or specific notes
  purchaseStatus?: PurchaseStatus; // Status individual de compra
  
  // Dates for Purchasing Workflow
  quotationStartedDate?: string; // Data inicio cotação (ISO)
  purchaseOrderDate?: string; // Data do pedido de compra (ISO)
  deliveryForecast?: string; // Data prevista de entrega (ISO string YYYY-MM-DD)
  deliveredDate?: string; // Data real de entrega (ISO string YYYY-MM-DD)
  
  // Specific fields for splitting logic
  baseDescription?: string; // Ex: Tubo Quadrado
  gauge?: string; // Ex: 2x60
  
  // New fields for calculation
  lengthMm?: number; // Comprimento unitário de CORTE em mm
  totalLengthCalc?: number; // Total calculado em MILÍMETROS (considerando a regra da serra)

  // Factory / Production Fields
  productionStatus?: ProductionStatus; // Status do processo fabril (Corte/Usinagem/Personalizado)
  productionHistory?: ProductionHistory[]; // Log of status changes with timestamps
}

export interface ProjectItem {
  id: string;
  description: string;
  quantity: number;
}

export interface Project {
  id: string;
  opNumber: string;
  client: string;
  description: string; // General description or Proposal Title
  items: ProjectItem[]; // List of items in the proposal
  implantationDate: string;
  status: ProjectStatus;
  materials: MaterialItem[];
  createdAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  inProduction: number;
  waitingPurchasing: number;
  completedThisMonth: number;
}

// --- TIMESHEET / WORK TRACKING TYPES ---

export const SERVICE_TYPES = [
  'Usinagem', 'Solda', 'Corte', 'Montagem', 'Acabamento', 'Manutenção', 'Pintura', 'Logística', 'Outros'
];

export interface JobData {
  funcionario: string;
  op: string;
  desenho: string;
  cliente: string;
  maquina: string;
  serviceType: string;
}

export interface ActiveJob {
  id: string;
  data: JobData;
  startTime: number;
}

export interface JobRecord extends JobData {
  id: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  date: string;
}
