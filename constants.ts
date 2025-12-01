export const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#06b6d4', // Cyan
];

export const ROW_HEIGHT = 140; // Base height unit in pixels

export const DEFAULT_WIDGETS = [
  { 
    id: '1', 
    type: 'stat', 
    title: 'Total Rows', 
    dataKey: 'id', 
    aggregation: 'count',
    cols: 3,
    rows: 1
  },
];