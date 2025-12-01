export interface DataRow {
  [key: string]: string | number | boolean | null;
}

export interface Dataset {
  id: string;
  name: string;
  createdAt: number;
  data: DataRow[];
}

export enum WidgetType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  STAT = 'stat',
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  dataKey: string; // X-axis or Category
  valueKey?: string; // Y-axis or Value
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  color?: string;
  // Layout dimensions
  cols?: number; // 1-12 (Grid column span)
  rows?: number; // Multiplier of ROW_HEIGHT
}

export interface DashboardConfig {
  id: string; // Matches dataset ID
  widgets: WidgetConfig[];
  theme?: 'light' | 'dark';
}

export interface AccessCode {
  code: string;
  createdAt: number;
  durationDays: number;
  expiresAt: number;
  isActive: boolean;
  note?: string;
}

export interface PeerUser {
  id: string;
  color: string;
  cursor: { x: number; y: number } | null;
  lastActive: number;
  name: string;
}
