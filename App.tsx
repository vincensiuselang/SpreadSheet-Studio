import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { FileUpload } from './components/FileUpload';
import { ChartWidget } from './components/ChartWidget';
import { EditWidgetModal } from './components/EditWidgetModal';
import { LimitModal } from './components/LimitModal';
import { AdminPanel } from './components/AdminPanel';
import { ChatBot } from './components/ChatBot';
import { CursorOverlay } from './components/CursorOverlay';
import { generateDashboardConfig } from './services/gemini';
import { Dataset, DashboardConfig, WidgetConfig, WidgetType, AccessCode } from './types';
import { ROW_HEIGHT } from './constants';
import { useLanguage } from './contexts/LanguageContext';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useCollaboration } from './hooks/useCollaboration';
import { escapeHtml, escapeSql, preventFormulaInjection } from './utils/security';

import { 
  LayoutDashboard, 
  Moon, 
  Sun, 
  Download, 
  GripHorizontal,
  RefreshCw,
  Pencil,
  ArrowDownRight,
  Plus,
  FileJson,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  Database,
  FileText,
  Code,
  File,
  Languages,
  Crown,
  ShieldCheck,
  LayoutTemplate,
  LogOut,
  Trash2,
  Sparkles,
  Undo2,
  Redo2,
  Radio
} from 'lucide-react';

/* Sortable Item Component */
interface SortableItemProps {
  id: string;
  widget: WidgetConfig;
  children: React.ReactNode;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, widget, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined, // Allow hover:z-30 to work when not dragging
    opacity: isDragging ? 0.5 : 1,
    // Dynamic Grid Layout
    gridColumn: `span ${widget.cols || 4}`,
    height: `${(widget.rows || 2) * ROW_HEIGHT}px`,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group h-full hover:z-30">
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 right-2 p-1.5 bg-white/50 dark:bg-black/20 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-white dark:hover:bg-black/40"
      >
        <GripHorizontal size={16} className="text-gray-500 dark:text-gray-300" />
      </div>
      {children}
    </div>
  );
};

/* Dashboard Skeleton Loader */
const DashboardSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto w-full animate-pulse relative">
    
    {/* Header Skeleton */}
    <div className="flex justify-between items-center mb-8">
      <div>
        <div className="h-8 w-64 bg-gray-200 dark:bg-slate-700 rounded-lg mb-2"></div>
        <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
      </div>
    </div>

    {/* Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Top Row Stats */}
      <div className="col-span-12 lg:col-span-4 h-[140px] bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
      <div className="col-span-12 lg:col-span-4 h-[140px] bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
      <div className="col-span-12 lg:col-span-4 h-[140px] bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>

      {/* Middle Row Charts */}
      <div className="col-span-12 lg:col-span-8 h-[350px] bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
      <div className="col-span-12 lg:col-span-4 h-[350px] bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
      
      {/* Bottom Row */}
      <div className="col-span-12 h-[300px] bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
    </div>

    {/* Floating Loading Indicator */}
    <div className="absolute inset-0 z-50 flex items-center justify-center -mt-20">
      <div className="bg-white dark:bg-dark-card p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center max-w-sm">
        <div className="relative mb-6">
           <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
           <div className="relative bg-primary/10 p-4 rounded-full">
             <Sparkles className="w-10 h-10 text-primary animate-pulse" />
           </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          Generating Dashboard
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          AI is analyzing your data structure and building interactive charts...
        </p>
        <div className="w-48 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-loading-bar rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  /* State */
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Local Data State
  const [dataset, setDataset] = useState<Dataset | null>(null);
  
  // Dashboard Config with Undo/Redo
  const { 
    state: dashboardConfig, 
    setState: setDashboardConfig, 
    reset: resetDashboardConfig,
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useUndoRedo<DashboardConfig | null>(null);

  // Collaboration Hook
  const { peers, broadcastConfigChange } = useCollaboration(
    dataset, 
    setDataset, 
    dashboardConfig, 
    setDashboardConfig
  );
  
  // Edit State
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [resizingState, setResizingState] = useState<{ id: string; cols: number; rows: number } | null>(null);
  
  // Limit / Membership State
  const [usageCount, setUsageCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isManualLogin, setIsManualLogin] = useState(false);
  
  // View State
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin'>('dashboard');

  // Language Hook
  const { t, language, setLanguage } = useLanguage();

  // Grid Ref
  const gridRef = useRef<HTMLDivElement>(null);
  // Dashboard Capture Ref
  const dashboardRef = useRef<HTMLDivElement>(null);

  /* Sensors for DND */
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8, // Avoid triggering drag when clicking resize handle
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /* Effects */
  useEffect(() => {
    // Check local storage for theme
    const isDark = localStorage.getItem('theme') === 'dark';
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');

    // Check usage limits and admin
    const savedUsage = parseInt(localStorage.getItem('vintec_usage') || '0', 10);
    const sessionStr = localStorage.getItem('vintec_session');
    
    // Set default free usage
    setUsageCount(savedUsage);

    if (sessionStr) {
       try {
         const session = JSON.parse(sessionStr);
         // Check expiry
         if (Date.now() > (session.expiresAt || 0)) {
           // Expired
           setIsPremium(false);
           setIsAdmin(false);
           localStorage.removeItem('vintec_session');
         } else {
           // Valid
           setIsPremium(true);
           setIsAdmin(session.role === 'admin');
         }
       } catch (e) {
         localStorage.removeItem('vintec_session');
       }
    }
  }, []);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  /* Computeds */
  const columns = useMemo(() => {
    if (!dataset?.data.length) return [];
    return Object.keys(dataset.data[0]);
  }, [dataset]);

  /* Handlers */
  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };
  
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'id' : 'en');
  };

  const handleManualLogin = () => {
    if (isPremium) return; // Already logged in
    setIsManualLogin(true);
    setShowLimitModal(true);
  };

  const handleLogout = () => {
    // Immediate logout
    setIsAdmin(false);
    setIsPremium(false);
    setCurrentView('dashboard');
    localStorage.removeItem('vintec_session');
  };

  const handleAttemptUnlock = (code: string): boolean => {
    const normalizedCode = code.trim();
    
    // 1. Check Master Admin Code
    if (normalizedCode === 'vintec') {
      setIsPremium(true);
      setIsAdmin(true);
      setShowLimitModal(false);
      setIsManualLogin(false);
      
      const session = {
        role: 'admin',
        expiresAt: 4102444800000 // Far future (Year 2100)
      };
      localStorage.setItem('vintec_session', JSON.stringify(session));

      alert(t('unlimited_access'));
      return true;
    }

    // 2. Check Generated Codes
    const storedCodesRaw = localStorage.getItem('vintec_codes');
    if (storedCodesRaw) {
      const storedCodes: AccessCode[] = JSON.parse(storedCodesRaw);
      const foundCode = storedCodes.find(c => c.code === normalizedCode);

      if (foundCode) {
        if (!foundCode.isActive) {
           return false;
        }
        if (Date.now() > foundCode.expiresAt) {
           return false;
        }
        
        // Success - Premium BUT NOT Admin
        setIsPremium(true);
        setIsAdmin(false); 
        setShowLimitModal(false);
        setIsManualLogin(false);
        
        const session = {
           role: 'user',
           expiresAt: foundCode.expiresAt
        };
        localStorage.setItem('vintec_session', JSON.stringify(session));

        alert(t('unlimited_access'));
        return true;
      }
    }

    return false;
  };

  const handleDataParsed = async (name: string, data: any[]) => {
    // Check Limit Logic
    if (!isPremium && usageCount >= 2) {
      setIsManualLogin(false);
      setShowLimitModal(true);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create Local Dataset
      const newDataset: Dataset = {
        id: Date.now().toString(),
        name,
        createdAt: Date.now(),
        data
      };
      
      // 2. Generate config via Gemini
      const widgets = await generateDashboardConfig(name, data);
      const newConfig: DashboardConfig = { id: newDataset.id, widgets };
      
      // Update state together
      setDataset(newDataset);
      resetDashboardConfig(newConfig);

      // Increment Usage if not premium
      if (!isPremium) {
        const newCount = usageCount + 1;
        setUsageCount(newCount);
        localStorage.setItem('vintec_usage', newCount.toString());
      }
      
    } catch (error) {
      console.error(error);
      alert("Error generating dashboard. Please try again.");
      setDataset(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    
    if (active.id !== over.id && dashboardConfig) {
      setDashboardConfig((prev) => {
        if (!prev) return null;
        const oldIndex = prev.widgets.findIndex((w) => w.id === active.id);
        const newIndex = prev.widgets.findIndex((w) => w.id === over.id);
        const newWidgets = arrayMove(prev.widgets, oldIndex, newIndex);
        
        const newConfig = { ...prev, widgets: newWidgets };
        broadcastConfigChange(newConfig); 
        return newConfig;
      }, 'push');
    }
  };

  const handleCreateWidget = () => {
    if (!columns.length) return;
    const newWidget: WidgetConfig = {
      id: `new-widget-${Date.now()}`,
      type: WidgetType.BAR,
      title: 'New Analysis',
      dataKey: columns[0],
      aggregation: 'count',
      cols: 6,
      rows: 2
    };
    setEditingWidget(newWidget);
  };
  
  const handleSaveWidget = (widgetToSave: WidgetConfig) => {
    setDashboardConfig((prev) => {
      if (!prev) return null;
      
      const exists = prev.widgets.find((w) => w.id === widgetToSave.id);
      let newConfig: DashboardConfig;

      if (exists) {
        newConfig = {
          ...prev,
          widgets: prev.widgets.map((w) => (w.id === widgetToSave.id ? widgetToSave : w)),
        };
      } else {
        newConfig = {
          ...prev,
          widgets: [widgetToSave, ...prev.widgets],
        };
      }
      broadcastConfigChange(newConfig);
      return newConfig;
    }, 'push');
    setEditingWidget(null);
  };

  const handleDeleteWidget = (widgetId: string) => {
    if (window.confirm(t('delete_widget_confirm'))) {
      setDashboardConfig((prev) => {
        if (!prev) return null;
        const newConfig = {
          ...prev,
          widgets: prev.widgets.filter((w) => w.id !== widgetId),
        };
        broadcastConfigChange(newConfig);
        return newConfig;
      }, 'push');
    }
  };

  // Export Logic
  const downloadContent = (content: string | Blob, filename: string, mimeType: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  const exportData = async (format: 'json' | 'xlsx' | 'csv' | 'html' | 'xml' | 'sql' | 'pdf') => {
    if (!dataset) return;
    const filename = dataset.name.replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '');

    switch (format) {
      case 'json': {
        if (!dashboardConfig) return;
        const jsonDataToExport = { dataset, dashboardConfig, timestamp: Date.now() };
        downloadContent(JSON.stringify(jsonDataToExport, null, 2), `${filename}_dashboard.json`, 'application/json');
        break;
      }

      case 'xlsx': {
        const safeData = dataset.data.map(row => {
            const newRow: any = {};
            Object.keys(row).forEach(k => {
                newRow[k] = preventFormulaInjection(row[k]);
            });
            return newRow;
        });
        const ws = XLSX.utils.json_to_sheet(safeData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${filename}.xlsx`);
        setExportMenuOpen(false);
        break;
      }

      case 'csv': {
        const safeDataCsv = dataset.data.map(row => {
            const newRow: any = {};
            Object.keys(row).forEach(k => {
                newRow[k] = preventFormulaInjection(row[k]);
            });
            return newRow;
        });
        const wsCsv = XLSX.utils.json_to_sheet(safeDataCsv);
        const csv = XLSX.utils.sheet_to_csv(wsCsv);
        downloadContent(csv, `${filename}.csv`, 'text/csv');
        break;
      }

      case 'html': {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: sans-serif; padding: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
          </head>
          <body>
            <h2>${escapeHtml(dataset.name)}</h2>
            <table>
              <thead>
                <tr>${columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${dataset.data.map(row => `<tr>${columns.map(c => `<td>${escapeHtml(row[c])}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </body>
          </html>`;
        downloadContent(html, `${filename}.html`, 'text/html');
        break;
      }

      case 'xml': {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<dataset>\n';
        dataset.data.forEach((row) => {
          xml += '  <row>\n';
          columns.forEach(col => {
            const tag = col.replace(/[^a-zA-Z0-9_-]/g, '_');
            xml += `    <${tag}>${escapeHtml(row[col])}</${tag}>\n`;
          });
          xml += '  </row>\n';
        });
        xml += '</dataset>';
        downloadContent(xml, `${filename}.xml`, 'application/xml');
        break;
      }

      case 'sql': {
        const tableName = filename.replace(/[^a-zA-Z0-9_]/g, '_');
        let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
        sql += columns.map(c => `  "${c.replace(/"/g, '""')}" TEXT`).join(',\n');
        sql += '\n);\n\n';
        sql += `INSERT INTO ${tableName} (${columns.map(c => `"${c.replace(/"/g, '""')}"`).join(', ')}) VALUES \n`;
        const values = dataset.data.map(row => {
          return `  (${columns.map(c => {
            return escapeSql(row[c]);
          }).join(', ')})`;
        }).join(',\n');
        sql += values + ';';
        downloadContent(sql, `${filename}.sql`, 'application/sql');
        break;
      }
        
      case 'pdf': {
        if (dashboardRef.current) {
          setExportMenuOpen(false);
          
          try {
            await new Promise(resolve => setTimeout(resolve, 150));

            const element = dashboardRef.current;
            const canvas = await html2canvas(element, {
              scale: 2,
              useCORS: true,
              backgroundColor: darkMode ? '#0f172a' : '#ffffff',
              logging: false,
              height: element.scrollHeight,
              windowHeight: element.scrollHeight,
              onclone: (clonedDoc) => {
                const ignoredElements = clonedDoc.querySelectorAll('.no-print');
                ignoredElements.forEach((el) => {
                  if (el instanceof HTMLElement) el.style.display = 'none';
                });
              }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
            
            while (heightLeft > 0) {
              position -= pdfHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
              heightLeft -= pdfHeight;
            }
            
            pdf.save(`${filename}_dashboard.pdf`);
          } catch (error) {
            console.error('PDF Export Failed', error);
            alert('Failed to generate PDF');
          }
        }
        break;
      }
    }
  };

  const handleReset = () => {
    setDataset(null);
    resetDashboardConfig(null);
  };

  const handleResizeStart = (e: React.MouseEvent, widget: WidgetConfig) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startCols = widget.cols || 4;
    const startRows = widget.rows || 2;
    
    const gridElement = gridRef.current;
    if (!gridElement) return;
    const colWidth = gridElement.offsetWidth / 12;

    setResizingState({ id: widget.id, cols: startCols, rows: startRows });

    let hasPushedHistory = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        const colsDiff = Math.round(deltaX / colWidth);
        const rowsDiff = Math.round(deltaY / ROW_HEIGHT);

        let newCols = Math.max(2, Math.min(12, startCols + colsDiff));
        let newRows = Math.max(1, Math.min(50, startRows + rowsDiff));

        if (widget.type !== WidgetType.STAT) {
            newRows = Math.max(2, newRows);
        }

        if (newCols !== widget.cols || newRows !== widget.rows) {
            setResizingState({ id: widget.id, cols: newCols, rows: newRows });

            setDashboardConfig((prev: any) => {
                if (!prev) return null;
                const newConfig = {
                    ...prev,
                    widgets: prev.widgets.map((w: any) => 
                        w.id === widget.id 
                            ? { ...w, cols: newCols, rows: newRows } 
                            : w
                    )
                };
                return newConfig;
            }, hasPushedHistory ? 'replace' : 'push');

            hasPushedHistory = true;
        }
    };

    const onMouseUp = () => {
        setResizingState(null);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        
        if (dashboardConfig) {
             broadcastConfigChange(dashboardConfig);
        }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark' : ''}`}>
      <CursorOverlay peers={peers} />

      <header className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-3 cursor-pointer select-none" 
              onDoubleClick={handleManualLogin}
              onClick={() => setCurrentView('dashboard')}
              title="Double click to login as Admin"
            >
              <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-lg relative group transition-transform hover:scale-105">
                <LayoutDashboard className="text-white" size={24} />
                {isPremium && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border-2 border-white dark:border-dark-card">
                    <Crown size={10} className="text-white fill-white" />
                  </div>
                )}
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary hidden sm:block">
                {t('app_title')}
              </h1>
            </div>

            {dataset && currentView === 'dashboard' && (
               <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-100/50 dark:bg-slate-800 rounded-md border border-gray-200/50 dark:border-gray-700 transition-all">
                 <FileSpreadsheet size={15} className="text-primary" />
                 <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 max-w-[200px] truncate">
                   {dataset.name}
                 </span>
               </div>
            )}
            
            {peers.length > 0 && currentView === 'dashboard' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800 animate-pulse">
                <Radio size={14} className="text-green-600 dark:text-green-400" />
                <span className="text-xs font-bold text-green-700 dark:text-green-300">
                   {t('live_session')}: {peers.length + 1} {t('tabs_active')}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            
            {isAdmin && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg mr-2 border border-gray-200 dark:border-gray-700">
                 <button
                   type="button"
                   onClick={() => setCurrentView(currentView === 'dashboard' ? 'admin' : 'dashboard')}
                   className={`
                     px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wide
                     ${currentView === 'admin' 
                       ? 'bg-primary text-white shadow-md' 
                       : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}
                   `}
                 >
                   {currentView === 'dashboard' ? <ShieldCheck size={16} /> : <LayoutTemplate size={16} />}
                   <span className="hidden sm:inline">
                     {currentView === 'dashboard' ? t('admin_panel') : t('dashboard')}
                   </span>
                 </button>

                 <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>

                 <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wide group"
                    title={t('logout')}
                 >
                    <LogOut size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">{t('logout')}</span>
                 </button>
               </div>
            )}

            {dataset && currentView === 'dashboard' && !isLoading && (
              <>
                <div className="relative no-print z-50">
                   <button 
                     type="button"
                     onClick={() => setExportMenuOpen(!exportMenuOpen)}
                     className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                   >
                     <Download size={18} />
                     <span className="hidden sm:inline">{t('export')}</span>
                     <ChevronDown size={14} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                   </button>
                   
                   {exportMenuOpen && (
                     <>
                        <div 
                          className="fixed inset-0 z-40 bg-transparent" 
                          onClick={() => setExportMenuOpen(false)}
                        ></div>
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-in-up">
                          <div className="py-1">
                             <button type="button" onClick={() => exportData('pdf')} className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                               <File size={16} className="mr-3 text-red-500" /> {t('export_pdf')}
                             </button>
                             <button type="button" onClick={() => exportData('xlsx')} className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                               <FileSpreadsheet size={16} className="mr-3 text-green-600" /> {t('export_xlsx')}
                             </button>
                             <button type="button" onClick={() => exportData('csv')} className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                               <FileText size={16} className="mr-3 text-blue-500" /> {t('export_csv')}
                             </button>
                             <button type="button" onClick={() => exportData('html')} className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                               <Code size={16} className="mr-3 text-orange-500" /> {t('export_html')}
                             </button>
                             <button type="button" onClick={() => exportData('xml')} className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                               <FileCode size={16} className="mr-3 text-yellow-500" /> {t('export_xml')}
                             </button>
                             <button type="button" onClick={() => exportData('sql')} className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                               <Database size={16} className="mr-3 text-purple-500" /> {t('export_sql')}
                             </button>
                             <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                             <button type="button" onClick={() => exportData('json')} className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                               <FileJson size={16} className="mr-3 text-gray-500" /> {t('export_json')}
                             </button>
                          </div>
                        </div>
                     </>
                   )}
                </div>
              </>
            )}
            
            <button 
              type="button"
              onClick={toggleLanguage} 
              className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors flex items-center gap-1 font-semibold text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              title={language === 'en' ? 'Switch to Indonesian' : 'Ganti ke Bahasa Inggris'}
            >
              <Languages size={18} />
              <span>{language.toUpperCase()}</span>
            </button>

            <button 
              type="button"
              onClick={toggleTheme} 
              className="p-2 text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-gray-50 dark:bg-dark transition-colors duration-300 p-4 md:p-8 overflow-x-hidden relative">
        
        {currentView === 'admin' ? (
           <AdminPanel />
        ) : (
          <div className="max-w-7xl mx-auto">
            
            {!dataset && !isLoading && (
              <div className="mt-12 flex flex-col items-center animate-fade-in-up">
                <div className="text-center mb-10 space-y-4">
                  <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {t('hero_title_1')} <br/>
                    <span className="text-primary">{t('hero_title_2')}</span>
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    {t('hero_desc')}
                  </p>
                </div>
                <FileUpload onDataParsed={handleDataParsed} isLoading={isLoading} />
              </div>
            )}

            {isLoading && (
               <DashboardSkeleton />
            )}

            {dataset && dashboardConfig && !isLoading && (
              <div className="space-y-6" ref={dashboardRef}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                     <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{dataset.name}</h2>
                     <p className="text-sm text-gray-500 dark:text-gray-400">
                       {dataset.data.length} {t('rows')}
                     </p>
                  </div>
                  <div className="flex gap-2 no-print">
                    
                    <div className="flex items-center gap-1 bg-white dark:bg-dark-card border border-gray-300 dark:border-gray-700 rounded-lg p-1 mr-2">
                        <button 
                            type="button" 
                            onClick={undo}
                            disabled={!canUndo}
                            className={`p-1.5 rounded-md transition-colors ${!canUndo ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-primary'}`}
                            title={`${t('undo')} (Ctrl+Z)`}
                        >
                            <Undo2 size={16} />
                        </button>
                        <button 
                            type="button" 
                            onClick={redo}
                            disabled={!canRedo}
                            className={`p-1.5 rounded-md transition-colors ${!canRedo ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-primary'}`}
                            title={`${t('redo')} (Ctrl+Y)`}
                        >
                            <Redo2 size={16} />
                        </button>
                    </div>

                    <button 
                      type="button"
                      onClick={handleCreateWidget}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all"
                    >
                      <Plus size={16} />
                      {t('add_widget')}
                    </button>
                    <button 
                      type="button"
                      onClick={handleReset} 
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-dark-card dark:text-gray-300 dark:border-gray-700"
                    >
                      <RefreshCw size={16} />
                      {t('upload_new')}
                    </button>
                  </div>
                </div>

                <DndContext 
                  sensors={sensors} 
                  collisionDetection={closestCenter} 
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={dashboardConfig.widgets.map(w => w.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div 
                      ref={gridRef}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20"
                    >
                      {dashboardConfig.widgets.map((widget) => (
                        <SortableItem key={widget.id} id={widget.id} widget={widget}>
                          <div className={`
                            bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 
                            overflow-hidden hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col print:break-inside-avoid
                            h-full w-full relative
                          `}>
                            {resizingState?.id === widget.id && (
                                <div className="absolute inset-0 bg-primary/10 border-2 border-primary z-50 rounded-2xl flex items-center justify-center pointer-events-none animate-pulse">
                                    <div className="bg-primary text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg backdrop-blur-md">
                                        {resizingState.cols} cols x {resizingState.rows} rows
                                    </div>
                                </div>
                            )}

                            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/30 flex justify-between items-center group/header select-none">
                              <h3 className="font-semibold text-gray-700 dark:text-gray-200 truncate pr-4 text-sm uppercase tracking-wide">
                                {widget.title}
                              </h3>
                              <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity no-print mr-6 relative z-20">
                                <button 
                                  type="button"
                                  onClick={() => setEditingWidget(widget)}
                                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                  title={t('edit_widget')}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWidget(widget.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                                  title={t('delete_widget')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 p-4 min-h-0 relative">
                               <ChartWidget widget={widget} data={dataset.data} />
                            </div>
                            
                            <div 
                              className="absolute bottom-0 right-0 p-1 cursor-se-resize hover:bg-gray-100 dark:hover:bg-slate-700 rounded-tl-lg transition-colors z-20 group/resize no-print"
                              onMouseDown={(e) => handleResizeStart(e, widget)}
                            >
                               <ArrowDownRight size={16} className="text-gray-300 group-hover/resize:text-primary" />
                            </div>
                          </div>
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                <ChatBot 
                   datasetName={dataset.name}
                   data={dataset.data}
                   dashboardConfig={dashboardConfig}
                />
              </div>
            )}
          </div>
        )}

        {editingWidget && (
          <EditWidgetModal
            widget={editingWidget}
            columns={columns}
            isOpen={!!editingWidget}
            onClose={() => setEditingWidget(null)}
            onSave={handleSaveWidget}
            title={editingWidget.id.startsWith('new-') ? t('modal_add_title') : t('modal_edit_title')}
          />
        )}

        <LimitModal 
          isOpen={showLimitModal} 
          onAttemptUnlock={handleAttemptUnlock} 
          isLimitReached={!isManualLogin}
        />
      </main>
    </div>
  );
}
