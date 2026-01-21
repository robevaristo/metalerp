
export enum ProjectStatus {
  COMMERCIAL = 'COMERCIAL',
  ENGINEERING = 'PROJETO',
  PCP = 'PCP',
  PURCHASING = 'COMPRAS',
  PRODUCTION = 'PRODUCAO',
  COMPLETED = 'CONCLUIDO'
}

export enum MaterialType {
  BAR = 'BARRA',
  SHEET = 'CHAPA',
  COMMERCIAL = 'COMERCIAL_PART'
}

export type PurchaseStatus = 'PENDING' | 'REQUESTED' | 'QUOTING' | 'ORDERED' | 'DELIVERED' | 'COMPLETED';
export type ProductionStatus = 'WAITING' | 'DONE' | string;

export interface ProductionHistory {
  status: string;
  timestamp: string;
  user?: string;
}

export interface ProductionProcess {
  id: string;
  name: string;
  color: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  type: MaterialType;
  quantity: number;
  unit: string;
  inStock: boolean;
  qtyInStock?: number;
  stockLengthMm?: number; 
  drawingNumber?: string;
  details?: string;
  materialGrade?: string;
  purchaseStatus?: PurchaseStatus;
  arrivalDate?: string; // v.26.2 - Data de chegada do material
  fulfillmentSource?: 'STOCK' | 'PURCHASE'; 
  gauge?: string;
  lengthMm?: number;
  widthMm?: number;
  productionStatus?: ProductionStatus;
  productionHistory?: ProductionHistory[];
}

export interface ProjectItem {
  id: string;
  description: string;
  quantity: number;
  type: MaterialType;
  material: string; 
}

export interface Project {
  id: string;
  opNumber: string;
  client: string;
  description: string;
  items: ProjectItem[];
  implantationDate: string;
  status: ProjectStatus;
  materials: MaterialItem[];
  createdAt: string;
}

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
  relatedItemIds?: string[];
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
