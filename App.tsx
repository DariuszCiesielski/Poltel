import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { AirtableService } from './services/airtableService';
import { AUTOMATION_TOOLS, STATUS_FIELD_NAME, PRODUCT_DESC_STATUSES } from './constants';
import { AirtableRecord, AirtableRecordFields, AirtableFieldSchema, ToolFieldsConfig, ToolFieldsOrderConfig } from './types';
import { useAuth } from './contexts/AuthContext';
import {
  Settings,
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Database,
  LayoutGrid,
  ArrowLeft,
  Edit2,
  Save,
  AlertTriangle,
  Info,
  Copy,
  ExternalLink,
  List,
  Eye,
  EyeOff,
  Code,
  Download,
  Check,
  Upload,
  FileSpreadsheet,
  Link,
  Send,
  FileDown,
  Columns,
  X,
  LogOut,
  GripVertical
} from 'lucide-react';

// --- Helper Functions ---

// Finds the actual key in the record that matches the config key (case-insensitive)
const findFieldKey = (record: AirtableRecord, configKey: string): string | undefined => {
  if (!record || !record.fields) return undefined;
  
  // 1. Exact match
  if (record.fields[configKey] !== undefined) return configKey;
  
  // 2. Case-insensitive match
  const lowerConfig = configKey.toLowerCase();
  const foundKey = Object.keys(record.fields).find(k => k.toLowerCase() === lowerConfig);
  
  return foundKey;
};

// Gets value safely using case-insensitive key lookup
const getFieldValue = (record: AirtableRecord, configKey: string) => {
  const actualKey = findFieldKey(record, configKey);
  return actualKey ? record.fields[actualKey] : undefined;
};

const StatusBadge = ({ status }: { status: string }) => {
  let colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
  let icon = <Clock className="w-3 h-3 mr-1.5" />;

  const normalizedStatus = status?.toLowerCase() || '';

  // Statusy zakończone sukcesem
  if (normalizedStatus === 'done' || normalizedStatus === 'zrobione' || normalizedStatus === 'plik eksportu wysłany' || normalizedStatus === 'plik przetworzony') {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    icon = <CheckCircle className="w-3 h-3 mr-1.5" />;
  }
  // Statusy w trakcie przetwarzania
  else if (normalizedStatus === 'in progress' || normalizedStatus === 'w trakcie' || normalizedStatus === 'w toku') {
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    icon = <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />;
  }
  // Statusy błędów
  else if (normalizedStatus === 'error' || normalizedStatus === 'błąd' || normalizedStatus === 'błąd pliku') {
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    icon = <AlertCircle className="w-3 h-3 mr-1.5" />;
  }
  // Statusy oczekujące na przetworzenie
  else if (normalizedStatus === 'generuj opis' || normalizedStatus === 'przetwórz plik excel') {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    icon = <Clock className="w-3 h-3 mr-1.5" />;
  }
  // Status eksportu
  else if (normalizedStatus === 'eksportuj dane do pliku') {
    colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
    icon = <FileDown className="w-3 h-3 mr-1.5" />;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${colorClass}`}>
      {icon}
      {status || 'Oczekuje'}
    </span>
  );
};

// --- HTML Output Viewer Component ---
const HtmlOutputViewer = ({ content, fieldName }: { content: string; fieldName: string }) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const isHtml = content.trim().startsWith('<') && content.includes('>');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fieldName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1e293b; }
    h1, h2, h3, h4 { color: #0f172a; margin-top: 1.5em; }
    p { margin: 1em 0; }
    ul, ol { padding-left: 1.5em; }
    a { color: #2563eb; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; }
    th { background: #f8fafc; }
    blockquote { border-left: 4px solid #3b82f6; margin: 1em 0; padding-left: 1em; color: #64748b; }
    code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
    pre { background: #1e293b; color: #e2e8f0; padding: 1em; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
  </style>
</head>
<body>
${content}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fieldName.replace(/\s+/g, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Jeśli to nie HTML, renderuj jako zwykły tekst
  if (!isHtml) {
    return (
      <div className="p-6 md:p-8 bg-white min-h-[100px]">
        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm font-sans">{content}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        {/* View Mode Tabs */}
        <div className="flex bg-slate-200/70 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'preview'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Podgląd
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'code'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Kod HTML
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Skopiowano!' : 'Kopiuj kod'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Pobierz HTML
          </button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'preview' ? (
        <div className="p-6 md:p-8 bg-white min-h-[200px]">
          <div
            className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-blue-600 prose-strong:text-slate-800 prose-img:rounded-lg prose-table:border-collapse"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      ) : (
        <div className="relative">
          <pre className="p-6 md:p-8 bg-slate-900 text-slate-100 text-sm font-mono overflow-x-auto min-h-[200px] max-h-[500px] overflow-y-auto">
            <code>{content}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  // Auth State
  const { user, signOut } = useAuth();

  // Configuration State - prioritize localStorage, fallback to env vars
  const [apiKey, setApiKey] = useState(
    localStorage.getItem('AT_API_KEY') || import.meta.env.VITE_AIRTABLE_API_KEY || ''
  );
  const [baseId, setBaseId] = useState(
    localStorage.getItem('AT_BASE_ID') || import.meta.env.VITE_AIRTABLE_BASE_ID || ''
  );
  const [showSettings, setShowSettings] = useState(false);

  // Navigation State
  const [viewMode, setViewMode] = useState<'dashboard' | 'tool'>('dashboard');
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  // Data State
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [showForm, setShowForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AirtableRecord | null>(null);
  const [modalFormData, setModalFormData] = useState<AirtableRecordFields>({});
  const [originalModalData, setOriginalModalData] = useState<AirtableRecordFields>({});
  const [modalFileDragOver, setModalFileDragOver] = useState<string | null>(null); // Klucz pola z drag over
  const [modalFileNames, setModalFileNames] = useState<{ [key: string]: string }>({}); // Oryginalne nazwy plików
  const [modalStatusDropdownOpen, setModalStatusDropdownOpen] = useState(false); // Dropdown statusu w modalu

  // Form State
  const [formData, setFormData] = useState<AirtableRecordFields>({});
  const [selectedInputMode, setSelectedInputMode] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<Set<string>>(new Set());
  const [showAddFieldDropdown, setShowAddFieldDropdown] = useState(false);

  // --- Airtable Schema State ---
  const [airtableFields, setAirtableFields] = useState<AirtableFieldSchema[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [savedFieldsConfig, setSavedFieldsConfig] = useState<ToolFieldsConfig>(() => {
    const saved = localStorage.getItem('POLTEL_TOOL_FIELDS_CONFIG');
    return saved ? JSON.parse(saved) : {};
  });
  const [savedFieldsOrder, setSavedFieldsOrder] = useState<ToolFieldsOrderConfig>(() => {
    const saved = localStorage.getItem('POLTEL_TOOL_FIELDS_ORDER');
    return saved ? JSON.parse(saved) : {};
  });

  // --- Form Field Drag State ---
  const [draggedFormField, setDraggedFormField] = useState<string | null>(null);
  const [dragOverFormField, setDragOverFormField] = useState<string | null>(null);

  const activeTool = AUTOMATION_TOOLS.find(t => t.id === activeToolId);
  const airtable = new AirtableService(apiKey, baseId);
  const isConfigured = apiKey.length > 0 && baseId.length > 0;

  // --- Table Resize State ---
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [rowHeight, setRowHeight] = useState(80); // Domyślna wysokość wiersza
  const [columnOrder, setColumnOrder] = useState<string[]>([]); // Kolejność kolumn
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set()); // Ukryte kolumny
  const [showColumnSettings, setShowColumnSettings] = useState(false); // Panel ustawień kolumn
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ recordId: string; columnKey: string } | null>(null);
  const [cellEditValue, setCellEditValue] = useState<string>('');
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null); // ID rekordu z otwartym dropdown statusu
  const [uploadingFile, setUploadingFile] = useState<{ recordId: string; columnKey: string; progress: string } | null>(null);
  const [dragOverFile, setDragOverFile] = useState<{ recordId: string; columnKey: string } | null>(null);

  // --- Drag Fill State (przeciąganie wartości jak w Excel) ---
  const [selectedCell, setSelectedCell] = useState<{ recordId: string; columnKey: string } | null>(null);
  const [dragFillSource, setDragFillSource] = useState<{ recordId: string; columnKey: string; value: string } | null>(null);
  const [dragFillTarget, setDragFillTarget] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [isDraggingFill, setIsDraggingFill] = useState(false);

  // --- Modal Resize State ---
  const [modalWidth, setModalWidth] = useState(896); // Domyślna szerokość (max-w-4xl = 896px)
  const MIN_MODAL_WIDTH = 400;
  const MAX_MODAL_WIDTH = 1600;

  // --- Create Form Modal Resize State ---
  const [createModalWidth, setCreateModalWidth] = useState(672); // Domyślna szerokość (max-w-2xl = 672px)
  const [createModalHeight, setCreateModalHeight] = useState(600); // Domyślna wysokość
  const MIN_CREATE_MODAL_WIDTH = 400;
  const MAX_CREATE_MODAL_WIDTH = 1200;
  const MIN_CREATE_MODAL_HEIGHT = 300;
  const MAX_CREATE_MODAL_HEIGHT = window.innerHeight * 0.9;

  // Refs do przechowywania aktualnych wartości dla event handlers (unika problemu z closure)
  const dragFillSourceRef = useRef<{ recordId: string; columnKey: string; value: string } | null>(null);
  const dragFillTargetRef = useRef<{ startIndex: number; endIndex: number } | null>(null);

  const resizingColumn = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const resizingRow = useRef<{ startY: number; startHeight: number } | null>(null);
  const resizingModal = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null);
  const resizingCreateModal = useRef<{
    side: 'left' | 'right' | 'top' | 'bottom' | 'corner-bl' | 'corner-br';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number
  } | null>(null);
  const lastModalRecordId = useRef<string | null>(null); // Śledzenie ID rekordu w modalu
  const addFieldDropdownRef = useRef<HTMLDivElement>(null); // Ref dla dropdown "Dodaj pole"

  // Domyślne szerokości kolumn
  const getColumnWidth = (key: string, type?: string) => {
    if (columnWidths[key]) return columnWidths[key];
    if (type === 'url') return 220;
    if (type === 'textarea') return 200;
    if (type === 'file') return 160;
    if (key === 'Status') return 180;
    if (key === 'Utworzono') return 95;
    if (key === 'Zmodyfikowano') return 95;
    return 180;
  };

  // Obsługa zmiany szerokości kolumny
  const handleColumnResizeStart = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = getColumnWidth(key);
    resizingColumn.current = { key, startX: e.clientX, startWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColumn.current) return;
      const diff = moveEvent.clientX - resizingColumn.current.startX;
      const newWidth = Math.max(80, resizingColumn.current.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizingColumn.current!.key]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingColumn.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Obsługa zmiany wysokości wierszy
  const handleRowResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRow.current = { startY: e.clientY, startHeight: rowHeight };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRow.current) return;
      const diff = moveEvent.clientY - resizingRow.current.startY;
      const newHeight = Math.max(40, Math.min(200, resizingRow.current.startHeight + diff));
      setRowHeight(newHeight);
    };

    const handleMouseUp = () => {
      resizingRow.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Obsługa zmiany szerokości modalu
  const handleModalResizeStart = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    resizingModal.current = { side, startX: e.clientX, startWidth: modalWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingModal.current) return;
      const diff = moveEvent.clientX - resizingModal.current.startX;
      // Dla lewej strony - odejmujemy różnicę, dla prawej - dodajemy
      const widthChange = resizingModal.current.side === 'left' ? -diff * 2 : diff * 2;
      const newWidth = Math.max(MIN_MODAL_WIDTH, Math.min(MAX_MODAL_WIDTH, resizingModal.current.startWidth + widthChange));
      setModalWidth(newWidth);
    };

    const handleMouseUp = () => {
      resizingModal.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  // Obsługa zmiany rozmiaru modalu tworzenia
  const handleCreateModalResizeStart = (
    e: React.MouseEvent,
    side: 'left' | 'right' | 'top' | 'bottom' | 'corner-bl' | 'corner-br'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    resizingCreateModal.current = {
      side,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: createModalWidth,
      startHeight: createModalHeight
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingCreateModal.current) return;
      const diffX = moveEvent.clientX - resizingCreateModal.current.startX;
      const diffY = moveEvent.clientY - resizingCreateModal.current.startY;
      const { side, startWidth, startHeight } = resizingCreateModal.current;

      let newWidth = startWidth;
      let newHeight = startHeight;

      // Zmiana szerokości
      if (side === 'left' || side === 'corner-bl') {
        newWidth = Math.max(MIN_CREATE_MODAL_WIDTH, Math.min(MAX_CREATE_MODAL_WIDTH, startWidth - diffX * 2));
      } else if (side === 'right' || side === 'corner-br') {
        newWidth = Math.max(MIN_CREATE_MODAL_WIDTH, Math.min(MAX_CREATE_MODAL_WIDTH, startWidth + diffX * 2));
      }

      // Zmiana wysokości
      if (side === 'top') {
        newHeight = Math.max(MIN_CREATE_MODAL_HEIGHT, Math.min(MAX_CREATE_MODAL_HEIGHT, startHeight - diffY * 2));
      } else if (side === 'bottom' || side === 'corner-bl' || side === 'corner-br') {
        newHeight = Math.max(MIN_CREATE_MODAL_HEIGHT, Math.min(MAX_CREATE_MODAL_HEIGHT, startHeight + diffY * 2));
      }

      setCreateModalWidth(newWidth);
      setCreateModalHeight(newHeight);
    };

    const handleMouseUp = () => {
      resizingCreateModal.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Ustaw odpowiedni kursor
    if (side === 'left' || side === 'right') {
      document.body.style.cursor = 'ew-resize';
    } else if (side === 'top' || side === 'bottom') {
      document.body.style.cursor = 'ns-resize';
    } else {
      document.body.style.cursor = 'nwse-resize';
    }
    document.body.style.userSelect = 'none';
  };

  // Generowanie domyślnej kolejności kolumn
  const getDefaultColumnOrder = useCallback(() => {
    if (!activeTool) return [];
    // Pokazuj wszystkie kolumny wejściowe (włącznie z plikami Excel)
    const inputCols = activeTool.inputFields.map(f => f.key);
    const outputCols = activeTool.outputFields;
    return [...inputCols, ...outputCols, 'Status', 'Utworzono', 'Zmodyfikowano'];
  }, [activeTool]);

  // Pobierz aktualną kolejność kolumn (lub domyślną)
  const getColumnOrder = useCallback(() => {
    const defaultOrder = getDefaultColumnOrder();
    if (columnOrder.length === 0) return defaultOrder;
    // Upewnij się, że wszystkie kolumny są uwzględnione
    const missingCols = defaultOrder.filter(col => !columnOrder.includes(col));
    const validOrder = columnOrder.filter(col => defaultOrder.includes(col));
    return [...validOrder, ...missingCols];
  }, [columnOrder, getDefaultColumnOrder]);

  // Obsługa drag & drop kolumn
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnKey);
    // Ustaw niestandardowy obraz przeciągania
    const dragImage = document.createElement('div');
    dragImage.textContent = columnKey;
    dragImage.style.cssText = 'position: absolute; top: -1000px; background: #3b82f6; color: white; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: bold;';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 20);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumn && columnKey !== draggedColumn) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const currentOrder = getColumnOrder();
    const draggedIndex = currentOrder.indexOf(draggedColumn);
    const targetIndex = currentOrder.indexOf(targetColumnKey);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Pobierz informacje o kolumnie (typ, label)
  const getColumnInfo = (columnKey: string) => {
    if (!activeTool) return { label: columnKey, type: 'text' };

    const inputField = activeTool.inputFields.find(f => f.key === columnKey);
    if (inputField) return { label: inputField.label, type: inputField.type };

    if (activeTool.outputFields.includes(columnKey)) {
      return { label: columnKey, type: 'output' };
    }

    if (columnKey === 'Status') return { label: 'Status', type: 'status' };
    if (columnKey === 'Utworzono') return { label: 'Utworzono', type: 'date' };
    if (columnKey === 'Zmodyfikowano') return { label: 'Zmodyfikowano', type: 'date' };

    return { label: columnKey, type: 'text' };
  };

  // --- Methods ---

  const loadRecords = useCallback(async () => {
    if (!apiKey || !baseId || !activeTool) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await airtable.fetchRecords(activeTool.tableName);
      setRecords(data);
      setSelectedRecord(prev => {
        if (!prev) return null;
        const updated = data.find(r => r.id === prev.id);
        return updated || prev;
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Wystąpił nieznany błąd podczas pobierania danych.');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, baseId, activeTool]);

  useEffect(() => {
    if (viewMode === 'tool' && activeToolId) {
      loadRecords();
      const interval = setInterval(loadRecords, 10000);
      return () => clearInterval(interval);
    }
  }, [loadRecords, viewMode, activeToolId]);

  // Pobieranie schematu tabeli z Airtable
  const loadTableSchema = useCallback(async () => {
    if (!apiKey || !baseId || !activeTool) return;
    setIsLoadingSchema(true);
    try {
      const schema = await airtable.getTableSchema(activeTool.tableName);
      if (schema) {
        setAirtableFields(schema.fields);
      }
    } catch (err) {
      console.error('Błąd pobierania schematu:', err);
    } finally {
      setIsLoadingSchema(false);
    }
  }, [apiKey, baseId, activeTool]);

  useEffect(() => {
    if (viewMode === 'tool' && activeToolId) {
      loadTableSchema();
    }
  }, [loadTableSchema, viewMode, activeToolId]);

  // Inicjalizuj widoczne pola z zapisanej konfiguracji przy zmianie narzędzia
  useEffect(() => {
    if (activeToolId && savedFieldsConfig[activeToolId]) {
      setVisibleOptionalFields(new Set(savedFieldsConfig[activeToolId]));
    } else {
      setVisibleOptionalFields(new Set());
    }
  }, [activeToolId, savedFieldsConfig]);

  // Zamknij dropdown "Dodaj pole" przy kliknięciu poza nim
  useEffect(() => {
    if (!showAddFieldDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (addFieldDropdownRef.current && !addFieldDropdownRef.current.contains(event.target as Node)) {
        setShowAddFieldDropdown(false);
      }
    };

    // Dodaj listener z małym opóźnieniem żeby uniknąć natychmiastowego zamknięcia
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddFieldDropdown]);

  // Zapisz konfigurację pól w localStorage
  const saveFieldsConfig = useCallback((toolId: string, fields: Set<string>) => {
    const newConfig = { ...savedFieldsConfig, [toolId]: Array.from(fields) };
    setSavedFieldsConfig(newConfig);
    localStorage.setItem('POLTEL_TOOL_FIELDS_CONFIG', JSON.stringify(newConfig));
  }, [savedFieldsConfig]);

  // Zapisz kolejność pól w localStorage
  const saveFieldsOrder = useCallback((toolId: string, order: string[]) => {
    const newOrder = { ...savedFieldsOrder, [toolId]: order };
    setSavedFieldsOrder(newOrder);
    localStorage.setItem('POLTEL_TOOL_FIELDS_ORDER', JSON.stringify(newOrder));
  }, [savedFieldsOrder]);

  // Pobierz posortowaną listę pól formularza
  const getOrderedFormFields = useCallback(() => {
    if (!activeTool) return [];

    // Zbierz wszystkie widoczne pola
    const visibleFields: { key: string; label: string; isFromConfig: boolean; field?: typeof activeTool.inputFields[0] }[] = [];

    // Pola z konfiguracji
    activeTool.inputFields.forEach(field => {
      if (field.showForMode && field.showForMode !== selectedInputMode) return;
      if (field.optional && !visibleOptionalFields.has(field.key)) return;
      visibleFields.push({ key: field.key, label: field.label, isFromConfig: true, field });
    });

    // Pola dodane z Airtable
    const inputFieldKeys = new Set(activeTool.inputFields.map(f => f.key.toLowerCase()));
    Array.from(visibleOptionalFields)
      .filter(key => !inputFieldKeys.has(key.toLowerCase()))
      .forEach(key => {
        const airtableField = airtableFields.find(f => f.name === key);
        visibleFields.push({ key, label: key, isFromConfig: false, field: undefined });
      });

    // Zastosuj zapisaną kolejność
    const savedOrder = savedFieldsOrder[activeTool.id];
    if (savedOrder && savedOrder.length > 0) {
      visibleFields.sort((a, b) => {
        const indexA = savedOrder.indexOf(a.key);
        const indexB = savedOrder.indexOf(b.key);
        // Pola nieznajdujące się w zapisanej kolejności idą na koniec
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    return visibleFields;
  }, [activeTool, selectedInputMode, visibleOptionalFields, airtableFields, savedFieldsOrder]);

  // Obsługa drop pola formularza
  const handleFormFieldDrop = useCallback((targetKey: string) => {
    if (!draggedFormField || !activeTool || draggedFormField === targetKey) {
      setDraggedFormField(null);
      setDragOverFormField(null);
      return;
    }

    const orderedFields = getOrderedFormFields();
    const fieldKeys = orderedFields.map(f => f.key);

    const fromIndex = fieldKeys.indexOf(draggedFormField);
    const toIndex = fieldKeys.indexOf(targetKey);

    if (fromIndex !== -1 && toIndex !== -1) {
      // Przesuń element
      fieldKeys.splice(fromIndex, 1);
      fieldKeys.splice(toIndex, 0, draggedFormField);
      saveFieldsOrder(activeTool.id, fieldKeys);
    }

    setDraggedFormField(null);
    setDragOverFormField(null);
  }, [draggedFormField, activeTool, getOrderedFormFields, saveFieldsOrder]);

  // Inicjalizacja danych modalu gdy otworzymy NOWY rekord (nie przy każdym renderze)
  useEffect(() => {
    if (selectedRecord && activeTool) {
      // Tylko inicjalizuj gdy otwieramy inny rekord niż poprzednio
      if (lastModalRecordId.current === selectedRecord.id) {
        return; // Ten sam rekord - nie nadpisuj formularza
      }
      lastModalRecordId.current = selectedRecord.id;

      const newFormData: AirtableRecordFields = {};
      const newFileNames: { [key: string]: string } = {};

      // Pobierz wszystkie pola wejściowe
      activeTool.inputFields.forEach(field => {
        const val = getFieldValue(selectedRecord, field.key);
        if (val === undefined || val === null) {
          newFormData[field.key] = '';
        } else if (field.type === 'file') {
          // Dla pól typu file - wyciągnij URL i nazwę pliku z tablicy Airtable
          if (Array.isArray(val) && val.length > 0 && val[0]?.url) {
            newFormData[field.key] = val[0].url;
            newFileNames[field.key] = val[0].filename || 'plik.xlsx';
          } else if (typeof val === 'string') {
            newFormData[field.key] = val;
          } else {
            newFormData[field.key] = '';
          }
        } else {
          newFormData[field.key] = String(val);
        }
      });

      // Pobierz pola wynikowe
      activeTool.outputFields.forEach(fieldKey => {
        const val = getFieldValue(selectedRecord, fieldKey);
        newFormData[fieldKey] = val !== undefined && val !== null ? String(val) : '';
      });

      // Pobierz Status
      const statusVal = getFieldValue(selectedRecord, STATUS_FIELD_NAME);
      newFormData[STATUS_FIELD_NAME] = statusVal !== undefined && statusVal !== null ? String(statusVal) : '';

      setModalFormData(newFormData);
      setOriginalModalData(newFormData);
      setModalFileNames(newFileNames);
    } else {
      // Reset gdy zamykamy modal
      lastModalRecordId.current = null;
      setModalFormData({});
      setOriginalModalData({});
      setModalFileNames({});
    }
  }, [selectedRecord, activeTool]);

  // Sprawdź czy są zmiany w modalu
  const hasModalChanges = () => {
    const keys = Object.keys(modalFormData);
    if (keys.length === 0) return false;
    for (const key of keys) {
      if (String(modalFormData[key] || '') !== String(originalModalData[key] || '')) {
        return true;
      }
    }
    return false;
  };

  const handleSaveSettings = () => {
    localStorage.setItem('AT_API_KEY', apiKey);
    localStorage.setItem('AT_BASE_ID', baseId);
    setShowSettings(false);
    if (activeTool) loadRecords();
  };

  const handleToolSelect = (toolId: string) => {
    setActiveToolId(toolId);
    setViewMode('tool');
    setSelectedRecord(null);
    setShowForm(false);
    setRecords([]); 
    setError(null);
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setActiveToolId(null);
  };

  const initCreateForm = () => {
    setEditingRecordId(null);
    setSelectedRecord(null);
    setSelectedFile(null);
    // Przywróć zapisaną konfigurację pól lub ustaw pustą
    if (activeTool && savedFieldsConfig[activeTool.id]) {
      setVisibleOptionalFields(new Set(savedFieldsConfig[activeTool.id]));
    } else {
      setVisibleOptionalFields(new Set());
    }
    setShowAddFieldDropdown(false);

    // Ustaw domyślny tryb wejścia i status
    let defaultStatus = 'Generuj opis'; // Domyślny status
    if (activeTool?.inputModes && activeTool.inputModes.length > 0) {
      setSelectedInputMode(activeTool.inputModes[0].id);
      defaultStatus = activeTool.inputModes[0].initialStatus;
    } else {
      setSelectedInputMode('');
    }

    // Ustaw formData z domyślnym statusem
    setFormData({ Status: defaultStatus });
    setShowForm(true);
  };

  const initEditForm = (record: AirtableRecord) => {
    const newFormData: AirtableRecordFields = {};
    if (activeTool) {
        // Załaduj wartości dla pól z konfiguracji
        activeTool.inputFields.forEach(field => {
            const val = getFieldValue(record, field.key);
            if (val !== undefined) {
                newFormData[field.key] = val;
            }
        });

        // Załaduj wartości dla pól dodanych z Airtable (zapisanych w konfiguracji)
        const savedFields = savedFieldsConfig[activeTool.id] || [];
        savedFields.forEach(fieldKey => {
            // Pomiń pola które są już w inputFields
            if (!activeTool.inputFields.some(f => f.key.toLowerCase() === fieldKey.toLowerCase())) {
                const val = getFieldValue(record, fieldKey);
                if (val !== undefined) {
                    newFormData[fieldKey] = val;
                }
            }
        });
    }
    setFormData(newFormData);
    setEditingRecordId(record.id);
    setShowForm(true);
  };

  // Resetowanie zmian w modalu (przywraca oryginalne dane z Airtable)
  const resetModalChanges = () => {
    if (!selectedRecord || !activeTool) return;

    // Przywróć oryginalne dane formularza
    setModalFormData({ ...originalModalData });

    // Przywróć oryginalne nazwy plików z rekordu
    const originalFileNames: { [key: string]: string } = {};
    activeTool.inputFields.forEach(field => {
      if (field.type === 'file') {
        const val = getFieldValue(selectedRecord, field.key);
        if (Array.isArray(val) && val.length > 0 && val[0]?.filename) {
          originalFileNames[field.key] = val[0].filename;
        }
      }
    });
    setModalFileNames(originalFileNames);
  };

  // Zapisanie zmian z modalu
  const handleModalSave = async () => {
    if (!selectedRecord || !activeTool) return;

    setIsSaving(true);
    try {
      const finalFields: AirtableRecordFields = {};

      // Mapuj pola wejściowe
      activeTool.inputFields.forEach(field => {
        const configKey = field.key;
        const actualKey = findFieldKey(selectedRecord, configKey) || configKey;
        const value = modalFormData[configKey];

        if (field.type === 'file' && value) {
          // Zapisz plik z oryginalną nazwą
          const filename = modalFileNames[configKey] || 'plik.xlsx';
          finalFields[actualKey] = [{ url: String(value), filename }];
        } else if (value !== undefined && value !== '') {
          finalFields[actualKey] = value;
        }
      });

      // Mapuj pola wynikowe
      activeTool.outputFields.forEach(fieldKey => {
        const actualKey = findFieldKey(selectedRecord, fieldKey) || fieldKey;
        const value = modalFormData[fieldKey];
        if (value !== undefined && value !== '') {
          finalFields[actualKey] = value;
        }
      });

      // Mapuj Status - zawsze zapisuj jeśli jest ustawiony
      const statusValue = modalFormData[STATUS_FIELD_NAME];
      if (statusValue) {
        const actualStatusKey = findFieldKey(selectedRecord, STATUS_FIELD_NAME) || STATUS_FIELD_NAME;
        finalFields[actualStatusKey] = statusValue;
      }

      await airtable.updateRecord(activeTool.tableName, selectedRecord.id, finalFields);

      // Po zapisie zaktualizuj oryginalne dane (żeby przycisk Zapisz się dezaktywował)
      setOriginalModalData({ ...modalFormData });
      loadRecords();
    } catch (err) {
      console.error('Błąd zapisu:', err);
      alert('Wystąpił błąd podczas zapisu. Sprawdź konsolę.');
    } finally {
      setIsSaving(false);
    }
  };

  // Zmiana wartości pola w modalu
  const handleModalFieldChange = (key: string, value: string) => {
    setModalFormData(prev => ({ ...prev, [key]: value }));
  };

  // Obsługa uploadu pliku w modalu (drag & drop) - tylko upload, zapis do Airtable po kliknięciu "Zapisz"
  const handleModalFileUpload = async (file: File, fieldKey: string) => {
    // Sprawdź typ pliku
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      alert('Dozwolone są tylko pliki Excel (.xlsx, .xls)');
      return;
    }

    setModalFileDragOver(null);
    setIsSaving(true);

    try {
      // Upload pliku na Cloudinary (bez zapisu do Airtable)
      const fileUrl = await uploadFileToHost(file);

      // Zapisz URL i oryginalną nazwę pliku w formularzu
      setModalFormData(prev => ({ ...prev, [fieldKey]: fileUrl }));
      setModalFileNames(prev => ({ ...prev, [fieldKey]: file.name }));
    } catch (err) {
      console.error('Błąd uploadu pliku:', err);
      alert(`Wystąpił błąd podczas uploadu pliku: ${err instanceof Error ? err.message : 'Nieznany błąd'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Inline Cell Editing ---

  // Rozpoczęcie edycji komórki
  const startCellEdit = (recordId: string, columnKey: string, currentValue: string) => {
    setEditingCell({ recordId, columnKey });
    setCellEditValue(currentValue);
  };

  // Anulowanie edycji komórki
  const cancelCellEdit = () => {
    setEditingCell(null);
    setCellEditValue('');
  };

  // Zapisanie edycji komórki
  const saveCellEdit = async (record: AirtableRecord) => {
    if (!editingCell || !activeTool) return;

    const { columnKey } = editingCell;

    // Nie pozwalaj na edycję pól dat
    if (columnKey === 'Utworzono' || columnKey === 'Zmodyfikowano') {
      cancelCellEdit();
      return;
    }

    setIsSaving(true);
    try {
      const actualKey = findFieldKey(record, columnKey) || columnKey;
      const updateFields: AirtableRecordFields = {};

      // Dla pól typu file, przekształć na format załącznika
      const fieldConfig = activeTool.inputFields.find(f => f.key === columnKey);
      if (fieldConfig?.type === 'file' && cellEditValue) {
        updateFields[actualKey] = [{ url: cellEditValue }];
      } else {
        updateFields[actualKey] = cellEditValue;
      }

      await airtable.updateRecord(activeTool.tableName, record.id, updateFields);
      await loadRecords();
    } catch (err) {
      console.error('Błąd zapisu komórki:', err);
      alert('Wystąpił błąd podczas zapisu.');
    } finally {
      setIsSaving(false);
      cancelCellEdit();
    }
  };

  // Szybka zmiana statusu (bez wchodzenia w tryb edycji)
  const handleQuickStatusChange = async (record: AirtableRecord, newStatus: string) => {
    if (!activeTool) return;

    setIsSaving(true);
    try {
      const actualKey = findFieldKey(record, STATUS_FIELD_NAME) || STATUS_FIELD_NAME;
      await airtable.updateRecord(activeTool.tableName, record.id, { [actualKey]: newStatus });
      await loadRecords();
    } catch (err) {
      console.error('Błąd zmiany statusu:', err);
      alert('Wystąpił błąd podczas zmiany statusu.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Drag Fill (przeciąganie wartości jak w Excel) ---

  // Pobierz indeks rekordu w tablicy
  const getRecordIndex = (recordId: string): number => {
    return records.findIndex(r => r.id === recordId);
  };

  // Rozpoczęcie przeciągania wartości
  const handleDragFillStart = (e: React.MouseEvent, recordId: string, columnKey: string, value: string) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceIndex = getRecordIndex(recordId);
    const sourceData = { recordId, columnKey, value };
    const targetData = { startIndex: sourceIndex, endIndex: sourceIndex };

    // Ustaw zarówno stan (dla renderowania) jak i ref (dla event handlers)
    setDragFillSource(sourceData);
    setDragFillTarget(targetData);
    setIsDraggingFill(true);
    setSelectedCell({ recordId, columnKey });

    dragFillSourceRef.current = sourceData;
    dragFillTargetRef.current = targetData;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragFillSourceRef.current) return;

      // Znajdź komórkę pod kursorem
      const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const row = element?.closest('tr[data-record-id]');
      if (row) {
        const targetRecordId = row.getAttribute('data-record-id');
        if (targetRecordId) {
          const targetIndex = records.findIndex(r => r.id === targetRecordId);
          if (targetIndex !== -1 && dragFillTargetRef.current) {
            const newTarget = { ...dragFillTargetRef.current, endIndex: targetIndex };
            dragFillTargetRef.current = newTarget;
            setDragFillTarget(newTarget);
          }
        }
      }
    };

    const handleMouseUp = async () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Wykonaj wypełnienie używając refs
      const source = dragFillSourceRef.current;
      const target = dragFillTargetRef.current;

      if (source && target && activeTool) {
        const { columnKey: colKey, value: fillValue, recordId: sourceRecordId } = source;
        const { startIndex, endIndex } = target;

        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);

        const recordsToUpdate = records.slice(minIndex, maxIndex + 1).filter(r => r.id !== sourceRecordId);

        if (recordsToUpdate.length > 0) {
          setIsSaving(true);
          try {
            for (const record of recordsToUpdate) {
              const actualKey = findFieldKey(record, colKey) || colKey;
              const updateFields: AirtableRecordFields = {};

              const fieldConfig = activeTool.inputFields.find(f => f.key === colKey);
              if (fieldConfig?.type === 'file' && fillValue) {
                updateFields[actualKey] = [{ url: fillValue }];
              } else {
                updateFields[actualKey] = fillValue;
              }

              await airtable.updateRecord(activeTool.tableName, record.id, updateFields);
            }
            await loadRecords();
          } catch (err) {
            console.error('Błąd wypełniania komórek:', err);
            alert('Wystąpił błąd podczas wypełniania komórek.');
          } finally {
            setIsSaving(false);
          }
        }
      }

      // Wyczyść stan
      setIsDraggingFill(false);
      setDragFillSource(null);
      setDragFillTarget(null);
      dragFillSourceRef.current = null;
      dragFillTargetRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Sprawdź czy komórka jest w zakresie wypełnienia
  const isCellInFillRange = (recordId: string, columnKey: string): boolean => {
    if (!isDraggingFill || !dragFillSource || !dragFillTarget) return false;
    if (columnKey !== dragFillSource.columnKey) return false;

    const recordIndex = getRecordIndex(recordId);
    const { startIndex, endIndex } = dragFillTarget;
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    return recordIndex >= minIndex && recordIndex <= maxIndex && recordId !== dragFillSource.recordId;
  };

  // Sprawdź czy komórka jest źródłem przeciągania
  const isCellDragSource = (recordId: string, columnKey: string): boolean => {
    return selectedCell?.recordId === recordId && selectedCell?.columnKey === columnKey;
  };

  // --- Column Visibility ---

  // Przełącz widoczność kolumny
  const toggleColumnVisibility = (columnKey: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  // Pokaż wszystkie kolumny
  const showAllColumns = () => {
    setHiddenColumns(new Set());
  };

  // Pobierz widoczne kolumny
  const getVisibleColumns = () => {
    return getColumnOrder().filter(col => !hiddenColumns.has(col));
  };

  // Lista dostępnych statusów z kolorami (zgodne z Airtable)
  const STATUS_OPTIONS: { value: string; bgColor: string; textColor: string; borderColor: string }[] = [
    { value: 'Generuj opis', bgColor: 'bg-amber-100', textColor: 'text-amber-800', borderColor: 'border-amber-300' },
    { value: 'Przetwórz plik Excel', bgColor: 'bg-amber-100', textColor: 'text-amber-800', borderColor: 'border-amber-300' },
    { value: 'W toku', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300' },
    { value: 'Zrobione', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800', borderColor: 'border-emerald-300' },
    { value: 'Błąd', bgColor: 'bg-rose-100', textColor: 'text-rose-800', borderColor: 'border-rose-300' },
    { value: 'Eksportuj dane do pliku', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-300' },
    { value: 'Plik eksportu wysłany', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800', borderColor: 'border-emerald-300' },
    { value: 'Plik przetworzony', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800', borderColor: 'border-emerald-300' },
    { value: 'Błąd pliku', bgColor: 'bg-rose-100', textColor: 'text-rose-800', borderColor: 'border-rose-300' }
  ];

  // Pobierz kolory dla statusu
  const getStatusColors = (status: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.value.toLowerCase() === status.toLowerCase());
    return option || { bgColor: 'bg-slate-100', textColor: 'text-slate-700', borderColor: 'border-slate-300' };
  };

  // Upload pliku na Cloudinary i zwróć URL
  const uploadFileToHost = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'n8n_uploads');

    // Użyj Cloudinary - dla plików nie-obrazowych używamy "raw"
    const response = await fetch('https://api.cloudinary.com/v1_1/dqba3j0s1/raw/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Błąd podczas uploadu pliku');
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('Nie udało się uzyskać linku do pliku');
    }

    return data.secure_url;
  };

  // Obsługa uploadu pliku przez drag & drop lub input
  const handleFileUpload = async (file: File, record: AirtableRecord, columnKey: string) => {
    if (!activeTool) return;

    // Sprawdź typ pliku
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      alert('Dozwolone są tylko pliki Excel (.xlsx, .xls)');
      return;
    }

    setUploadingFile({ recordId: record.id, columnKey, progress: 'Przesyłanie...' });

    try {
      // Upload pliku na hosting
      setUploadingFile({ recordId: record.id, columnKey, progress: 'Wysyłanie na serwer...' });
      const fileUrl = await uploadFileToHost(file);

      // Zapisz URL w Airtable
      setUploadingFile({ recordId: record.id, columnKey, progress: 'Zapisywanie w Airtable...' });
      const actualKey = findFieldKey(record, columnKey) || columnKey;
      await airtable.updateRecord(activeTool.tableName, record.id, {
        [actualKey]: [{ url: fileUrl, filename: file.name }]
      });

      await loadRecords();
    } catch (err) {
      console.error('Błąd uploadu pliku:', err);
      alert(`Wystąpił błąd podczas uploadu pliku: ${err instanceof Error ? err.message : 'Nieznany błąd'}`);
    } finally {
      setUploadingFile(null);
      setDragOverFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTool) return;

    setIsSaving(true);
    try {
      // Prepare payload mapping back to actual keys if editing, or config keys if creating
      const finalFields: AirtableRecordFields = {};

      // Filtruj pola według wybranego trybu wejścia
      const relevantFields = activeTool.inputFields.filter(field => {
        if (!field.showForMode) return true; // Pole bez ograniczenia trybu
        return field.showForMode === selectedInputMode;
      });

      relevantFields.forEach(field => {
        const configKey = field.key;
        let targetKey = configKey;

        // If editing, try to find the existing column name to match exact case
        if (editingRecordId && records.length > 0) {
          const originalRecord = records.find(r => r.id === editingRecordId);
          if (originalRecord) {
            const actualKey = findFieldKey(originalRecord, configKey);
            if (actualKey) targetKey = actualKey;
          }
        }

        // Dla plików Excel, przekształć URL na format załącznika Airtable
        if (field.type === 'file' && formData[configKey]) {
          finalFields[targetKey] = [{ url: String(formData[configKey]) }];
        } else if (formData[configKey] !== undefined) {
          finalFields[targetKey] = formData[configKey];
        }
      });

      // Ustaw odpowiedni status początkowy na podstawie trybu wejścia
      if (!editingRecordId && activeTool.inputModes && selectedInputMode) {
        const mode = activeTool.inputModes.find(m => m.id === selectedInputMode);
        if (mode) {
          finalFields[STATUS_FIELD_NAME] = mode.initialStatus;
        }
      }

      if (editingRecordId) {
        await airtable.updateRecord(activeTool.tableName, editingRecordId, finalFields);
      } else {
        await airtable.createRecord(activeTool.tableName, finalFields);
      }

      setFormData({});
      setShowForm(false);
      setEditingRecordId(null);
      setSelectedFile(null);
      await loadRecords();
    } catch (err) {
      alert('Wystąpił błąd podczas zapisu. Sprawdź konsolę.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Improved title resolution using case-insensitive lookup
  const getRecordTitle = (record: AirtableRecord) => {
      if (!activeTool) return 'Record';

      // Priority 1: Configuration key (first input field)
      const configKey = activeTool.inputFields[0].key;
      const configVal = getFieldValue(record, configKey);
      if (configVal && String(configVal).trim()) return String(configVal);

      // Priority 2: Any configured input field
      for (const field of activeTool.inputFields) {
          const val = getFieldValue(record, field.key);
          if (val && String(val).trim() && !String(val).startsWith('http')) {
              return String(val);
          }
      }

      // Priority 3: Common fallback keys (case insensitive)
      const commonKeys = ['temat', 'nazwa', 'nazwa produktu', 'title', 'subject', 'name', 'produkt', 'tytuł'];
      for (const common of commonKeys) {
          const val = getFieldValue(record, common);
          if (val && String(val).trim()) return String(val);
      }

      // Priority 4: First non-empty string field in record
      for (const [key, val] of Object.entries(record.fields)) {
          if (typeof val === 'string' && val.trim() && !val.startsWith('http') && key.toLowerCase() !== 'status') {
              return String(val).slice(0, 60) + (String(val).length > 60 ? '...' : '');
          }
      }

      // Priority 5: Fallback ID
      return <span className="text-slate-400 font-normal italic">Bez tytułu ({record.id.slice(-4)})</span>;
  };

  // Get preview text for list item
  const getRecordPreview = (record: AirtableRecord) => {
      if (!activeTool) return null;

      // Check output fields first - show fragment of generated content
      for (const outputKey of activeTool.outputFields) {
          const content = getFieldValue(record, outputKey);
          if (content && String(content).trim()) {
              // Strip HTML tags and get preview
              const textContent = String(content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              if (textContent.length > 0) {
                  return textContent.slice(0, 80) + (textContent.length > 80 ? '...' : '');
              }
          }
      }

      // Fallback to second input field
      if (activeTool.inputFields.length > 1) {
          const secondField = activeTool.inputFields[1];
          const val = getFieldValue(record, secondField.key);
          if (val && String(val).trim()) {
              const text = String(val);
              if (text.startsWith('http')) {
                  return text.slice(0, 50) + '...';
              }
              return text.slice(0, 80) + (text.length > 80 ? '...' : '');
          }
      }

      return null;
  };

  // Check if record has output content
  const hasOutputContent = (record: AirtableRecord) => {
      if (!activeTool) return false;
      for (const outputKey of activeTool.outputFields) {
          const content = getFieldValue(record, outputKey);
          if (content && String(content).trim()) return true;
      }
      return false;
  };

  // Calculate remaining fields that were not displayed
  const getRemainingFields = () => {
      if (!selectedRecord || !activeTool) return [];
      
      const displayedKeys = new Set<string>();
      
      // Add Input keys
      activeTool.inputFields.forEach(f => {
          const k = findFieldKey(selectedRecord, f.key);
          if (k) displayedKeys.add(k);
      });
      
      // Add Output keys
      activeTool.outputFields.forEach(k_config => {
          const k = findFieldKey(selectedRecord, k_config);
          if (k) displayedKeys.add(k);
      });
      
      // Add special fields
      const statusKey = findFieldKey(selectedRecord, STATUS_FIELD_NAME);
      if (statusKey) displayedKeys.add(statusKey);
      
      // Filter record fields
      return Object.keys(selectedRecord.fields).filter(key => 
          !displayedKeys.has(key) && 
          key !== 'id' && 
          key !== 'createdTime'
      );
  };

  // --- Views ---

  if (viewMode === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-slate-900 text-white py-16 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 opacity-50"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-white">
                  POLTEL <span className="text-blue-400">Hub</span>
                </h1>
                <p className="text-slate-300 text-lg max-w-2xl font-light">
                  Centralny panel automatyzacji procesów contentowych i analitycznych.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg transition-all border border-white/10"
                >
                  <Settings className="w-4 h-4" />
                  Konfiguracja
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 text-sm bg-white/10 hover:bg-rose-500/80 backdrop-blur-md text-white px-4 py-2 rounded-lg transition-all border border-white/10"
                  title={`Wyloguj (${user?.email})`}
                >
                  <LogOut className="w-4 h-4" />
                  Wyloguj
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full p-8 -mt-8 z-20">
          {!isConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">Wymagana konfiguracja</h3>
                <p className="text-amber-700 text-sm">
                  Aby korzystać z aplikacji, kliknij przycisk <strong>Konfiguracja</strong> i wprowadź klucz API oraz Base ID z Airtable.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AUTOMATION_TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                className="group flex flex-col items-start bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-2xl hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 text-left relative overflow-hidden h-full"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  {tool.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">
                  {tool.tableName}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {tool.description}
                </p>
                <div className="mt-auto w-full pt-4 border-t border-slate-50 flex items-center justify-between text-blue-600 font-semibold text-sm">
                  <span>Otwórz narzędzie</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </main>
        
        {showSettings && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-slate-800">Ustawienia Połączenia</h2>
                 <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                 <div className="flex gap-3 items-start">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800 leading-relaxed">
                        <p className="font-bold mb-1">Status połączenia:</p>
                        <p>Baza: <span className="font-mono bg-blue-100 px-1 rounded">{baseId}</span></p>
                        <p>Token: <span className="font-mono bg-blue-100 px-1 rounded">{apiKey.slice(0,8)}...</span></p>
                    </div>
                 </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2">API Key</label>
                  <input
                    type="password"
                    className="w-full border-slate-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Base ID</label>
                  <input
                    type="text"
                    className="w-full border-slate-300 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={baseId}
                    onChange={e => setBaseId(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleSaveSettings}
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-lg shadow-lg transition-all mt-2"
                >
                  Zapisz Konfigurację
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tool View
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 flex items-center gap-3 bg-slate-950">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/50">P</div>
          <h1 className="text-lg font-bold tracking-tight text-white">POLTEL <span className="text-blue-500 font-normal">Hub</span></h1>
        </div>
        
        <div className="p-4">
            <button 
                onClick={handleBackToDashboard}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-all text-sm font-medium mb-6 border border-slate-700/50"
            >
                <LayoutGrid className="w-4 h-4" />
                Wróć do Menu
            </button>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-3">
                Narzędzia
            </div>
            
            <nav className="space-y-1">
              {AUTOMATION_TOOLS.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left text-sm ${
                    activeToolId === tool.id 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'hover:bg-slate-800 hover:text-white text-slate-400'
                  }`}
                >
                  {tool.icon}
                  <span className="font-medium truncate">{tool.tableName}</span>
                </button>
              ))}
            </nav>
        </div>
        
        <div className="mt-auto p-4 border-t border-slate-800">
           <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              System online
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-10 h-16">
          <div className="flex items-center gap-4">
             <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
               {activeTool?.tableName}
             </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadRecords}
              className="p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-colors"
              title="Odśwież dane"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Przycisk eksportu dla narzędzi obsługujących eksport */}
            {activeTool?.supportsExport && records.some(r => {
              const status = String(getFieldValue(r, STATUS_FIELD_NAME) || '').toLowerCase();
              return status === 'eksportuj dane do pliku';
            }) && (
              <button
                onClick={() => {
                  if (!activeTool) return;

                  // Filtruj rekordy ze statusem "Eksportuj dane do pliku"
                  const recordsToExport = records.filter(r => {
                    const status = String(getFieldValue(r, STATUS_FIELD_NAME) || '').toLowerCase();
                    return status === 'eksportuj dane do pliku';
                  });

                  if (recordsToExport.length === 0) {
                    alert('Brak rekordów do eksportu.');
                    return;
                  }

                  // Przygotuj dane do eksportu
                  const exportData = recordsToExport.map(record => ({
                    'Link do produktu': getFieldValue(record, 'URL') || '',
                    'Opis rozszerzony': getFieldValue(record, 'Opis rozszerzony') || ''
                  }));

                  // Utwórz arkusz i skoroszyt
                  const worksheet = XLSX.utils.json_to_sheet(exportData);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, 'Eksport');

                  // Ustaw szerokość kolumn
                  worksheet['!cols'] = [
                    { wch: 60 }, // Link do produktu
                    { wch: 100 } // Opis rozszerzony
                  ];

                  // Generuj i pobierz plik
                  const fileName = `eksport_${new Date().toISOString().slice(0, 10)}.xls`;
                  XLSX.writeFile(workbook, fileName);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all active:scale-95"
                title="Eksportuj rekordy do pliku Excel"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Eksportuj plik .xls</span>
              </button>
            )}

            <button
              onClick={initCreateForm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{activeTool?.newRecordLabel || 'Nowe zadanie'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Records Table View */}
          <div className={`${showForm ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-white overflow-hidden`}>
            {error ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <div className="bg-rose-50 text-rose-600 p-4 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">Błąd synchronizacji</h3>
                <p className="text-sm text-slate-500 mb-4 px-4">{error}</p>
                <button onClick={() => setShowSettings(true)} className="text-blue-600 text-sm font-medium hover:underline">Sprawdź konfigurację</button>
              </div>
            ) : records.length === 0 ? (
                <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Database className="w-8 h-8 opacity-30" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Brak zadań</p>
                    <p className="text-xs mt-1">Tabela jest pusta.</p>
                </div>
            ) : (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Pasek narzędzi tabeli */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs text-slate-600">
                    <span className="font-medium">Wysokość:</span>
                    <input
                      type="range"
                      min="40"
                      max="200"
                      value={rowHeight}
                      onChange={e => setRowHeight(Number(e.target.value))}
                      className="w-24 h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-slate-500 w-10">{rowHeight}px</span>

                    <div className="h-4 w-px bg-slate-300 mx-1"></div>

                    {/* Przycisk ustawień kolumn */}
                    <div className="relative">
                      <button
                        onClick={() => setShowColumnSettings(!showColumnSettings)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                          showColumnSettings ? 'bg-blue-100 text-blue-700' : 'bg-white hover:bg-slate-50 text-slate-600'
                        } border border-slate-200`}
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>Kolumny</span>
                        {hiddenColumns.size > 0 && (
                          <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            {hiddenColumns.size}
                          </span>
                        )}
                      </button>

                      {/* Panel ustawień kolumn */}
                      {showColumnSettings && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 min-w-[240px]">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                            <span className="font-semibold text-slate-700 text-sm">Widoczność kolumn</span>
                            <button
                              onClick={showAllColumns}
                              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                            >
                              Pokaż wszystkie
                            </button>
                          </div>
                          <div className="space-y-1 max-h-[300px] overflow-y-auto">
                            {getColumnOrder().map(columnKey => {
                              const colInfo = getColumnInfo(columnKey);
                              const isHidden = hiddenColumns.has(columnKey);
                              const isDateColumn = columnKey === 'Utworzono' || columnKey === 'Zmodyfikowano';

                              return (
                                <label
                                  key={columnKey}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                    isHidden ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!isHidden}
                                    onChange={() => toggleColumnVisibility(columnKey)}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="flex-1 text-sm">{colInfo.label}</span>
                                  {isDateColumn && (
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      systemowe
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-auto flex items-center gap-2 text-slate-400">
                      <span className="hidden lg:inline">
                        <span className="text-blue-500">⇄</span> Przeciągnij kolumny
                      </span>
                      <span className="hidden lg:inline text-slate-300">|</span>
                      <span className="hidden lg:inline">
                        <span className="text-blue-500">↔</span> Zmień szerokość
                      </span>
                      <span className="hidden lg:inline text-slate-300">|</span>
                      <span>
                        <span className="text-emerald-500">✎</span> Kliknij, aby edytować rekord
                      </span>
                      <span className="hidden lg:inline text-slate-300">|</span>
                      <span className="hidden lg:inline">
                        <span className="text-purple-500">▪</span> Przeciągnij róg komórki, aby wypełnić
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto" onClick={() => setShowColumnSettings(false)}>
                    <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {getVisibleColumns().map((columnKey, index) => {
                            const colInfo = getColumnInfo(columnKey);
                            const isDragging = draggedColumn === columnKey;
                            const isDragOver = dragOverColumn === columnKey;

                            return (
                              <th
                                key={columnKey}
                                draggable
                                onDragStart={e => handleDragStart(e, columnKey)}
                                onDragOver={e => handleDragOver(e, columnKey)}
                                onDragLeave={handleDragLeave}
                                onDrop={e => handleDrop(e, columnKey)}
                                onDragEnd={handleDragEnd}
                                className={`text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 relative group select-none transition-all
                                  ${isDragging ? 'opacity-50 bg-blue-100' : 'bg-slate-50'}
                                  ${isDragOver ? 'bg-blue-200 border-l-2 border-l-blue-500' : ''}
                                `}
                                style={{
                                  width: getColumnWidth(columnKey, colInfo.type),
                                  cursor: 'grab'
                                }}
                              >
                                <div className="pr-3 truncate flex items-center gap-1.5">
                                  <span className="text-slate-300 cursor-grab">⠿</span>
                                  {colInfo.label}
                                </div>
                                {/* Resize handle */}
                                <div
                                  onMouseDown={e => handleColumnResizeStart(e, columnKey)}
                                  onClick={e => e.stopPropagation()}
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors group-hover:bg-blue-200 z-10"
                                  title="Przeciągnij, aby zmienić szerokość"
                                  draggable={false}
                                />
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map(record => {
                          const statusVal = getFieldValue(record, STATUS_FIELD_NAME);
                          const status = String(statusVal || 'Oczekuje');
                          const isSelected = selectedRecord?.id === record.id;

                          return (
                            <tr
                              key={record.id}
                              data-record-id={record.id}
                              onClick={() => { if (!editingCell && !isDraggingFill) { setSelectedRecord(record); setShowForm(false); } }}
                              className={`border-b border-slate-100 cursor-pointer transition-all hover:bg-blue-50/50 ${
                                isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : ''
                              }`}
                              style={{ height: rowHeight }}
                            >
                              {/* Dynamiczne kolumny według widoczności */}
                              {getVisibleColumns().map(columnKey => {
                                const colInfo = getColumnInfo(columnKey);
                                const isEditing = editingCell?.recordId === record.id && editingCell?.columnKey === columnKey;
                                const isDateColumn = columnKey === 'Utworzono' || columnKey === 'Zmodyfikowano';

                                // Status - custom dropdown z kolorami
                                if (columnKey === 'Status') {
                                  const statusColors = getStatusColors(status);
                                  const isDropdownOpen = openStatusDropdown === record.id;
                                  const isFillSource = isCellDragSource(record.id, columnKey);
                                  const isInFillRange = isCellInFillRange(record.id, columnKey);

                                  return (
                                    <td
                                      key={columnKey}
                                      className={`px-2 py-1 border-r border-slate-100 align-middle relative group ${
                                        isFillSource ? 'ring-2 ring-blue-500 ring-inset' : ''
                                      } ${isInFillRange ? 'bg-blue-100' : ''}`}
                                      style={{ width: getColumnWidth('Status') }}
                                      onClick={e => {
                                        e.stopPropagation();
                                        if (!isDraggingFill) {
                                          setSelectedCell({ recordId: record.id, columnKey });
                                        }
                                      }}
                                    >
                                      {/* Przycisk pokazujący aktualny status */}
                                      <button
                                        onClick={() => setOpenStatusDropdown(isDropdownOpen ? null : record.id)}
                                        disabled={isSaving}
                                        className={`w-full text-xs font-semibold rounded-md border py-1.5 px-2 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-between gap-1 ${statusColors.bgColor} ${statusColors.textColor} ${statusColors.borderColor} hover:opacity-80`}
                                      >
                                        <span className="truncate">{status}</span>
                                        <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>

                                      {/* Lista opcji */}
                                      {isDropdownOpen && (
                                        <>
                                          {/* Overlay do zamknięcia */}
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setOpenStatusDropdown(null)}
                                          />
                                          {/* Dropdown menu */}
                                          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 max-h-[300px] overflow-y-auto">
                                            {STATUS_OPTIONS.map(opt => (
                                              <button
                                                key={opt.value}
                                                onClick={() => {
                                                  handleQuickStatusChange(record, opt.value);
                                                  setOpenStatusDropdown(null);
                                                }}
                                                className={`w-full text-left px-2 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-2`}
                                              >
                                                <span className={`inline-block w-3 h-3 rounded-full ${opt.bgColor} border ${opt.borderColor}`}></span>
                                                <span className={opt.textColor}>{opt.value}</span>
                                                {status === opt.value && (
                                                  <Check className="w-3 h-3 ml-auto text-blue-600" />
                                                )}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}

                                      {/* Uchwyt do przeciągania wartości (fill handle) */}
                                      {(isFillSource || true) && !isDropdownOpen && (
                                        <div
                                          className={`absolute bottom-0 right-0 w-3 h-3 bg-blue-600 cursor-crosshair z-10 ${
                                            isFillSource ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                          } transition-opacity`}
                                          style={{ transform: 'translate(50%, 50%)' }}
                                          onMouseDown={e => handleDragFillStart(e, record.id, columnKey, status)}
                                          title="Przeciągnij, aby wypełnić"
                                        />
                                      )}
                                    </td>
                                  );
                                }

                                // Data utworzenia (tylko odczyt)
                                if (columnKey === 'Utworzono') {
                                  return (
                                    <td
                                      key={columnKey}
                                      className="px-4 py-2 text-xs text-slate-500 align-top border-r border-slate-100"
                                      style={{ width: getColumnWidth('Utworzono') }}
                                    >
                                      {new Date(record.createdTime).toLocaleDateString('pl-PL')}
                                    </td>
                                  );
                                }

                                // Data modyfikacji (tylko odczyt)
                                if (columnKey === 'Zmodyfikowano') {
                                  const lastModified = getFieldValue(record, 'Last modified time');
                                  return (
                                    <td
                                      key={columnKey}
                                      className="px-4 py-2 text-xs text-slate-500 align-top"
                                      style={{ width: getColumnWidth('Zmodyfikowano') }}
                                    >
                                      {lastModified ? new Date(String(lastModified)).toLocaleDateString('pl-PL') : '—'}
                                    </td>
                                  );
                                }

                                // Pola wynikowe (edytowalne)
                                if (colInfo.type === 'output') {
                                  const content = getFieldValue(record, columnKey);
                                  const displayContent = content ? String(content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
                                  const isFillSource = isCellDragSource(record.id, columnKey);
                                  const isInFillRange = isCellInFillRange(record.id, columnKey);

                                  return (
                                    <td
                                      key={columnKey}
                                      className={`px-4 py-2 text-sm text-slate-700 border-r border-slate-100 align-top overflow-hidden relative group ${
                                        isEditing ? 'bg-blue-50 p-1' : 'hover:bg-slate-50'
                                      } ${isFillSource ? 'ring-2 ring-blue-500 ring-inset' : ''} ${isInFillRange ? 'bg-blue-100' : ''}`}
                                      style={{ width: getColumnWidth(columnKey), maxHeight: rowHeight }}
                                      onDoubleClick={e => {
                                        e.stopPropagation();
                                        startCellEdit(record.id, columnKey, String(content || ''));
                                      }}
                                      onClick={e => {
                                        if (isEditing) e.stopPropagation();
                                        if (!isDraggingFill && !isEditing) {
                                          setSelectedCell({ recordId: record.id, columnKey });
                                        }
                                      }}
                                    >
                                      {isEditing ? (
                                        <div className="flex flex-col gap-1">
                                          <textarea
                                            value={cellEditValue}
                                            onChange={e => setCellEditValue(e.target.value)}
                                            className="w-full text-sm border border-blue-300 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                            style={{ minHeight: rowHeight - 20 }}
                                            autoFocus
                                            onKeyDown={e => {
                                              if (e.key === 'Escape') cancelCellEdit();
                                              if (e.key === 'Enter' && e.ctrlKey) saveCellEdit(record);
                                            }}
                                          />
                                          <div className="flex gap-1 justify-end">
                                            <button onClick={() => cancelCellEdit()} className="text-xs px-2 py-0.5 text-slate-600 hover:bg-slate-200 rounded">Anuluj</button>
                                            <button onClick={() => saveCellEdit(record)} disabled={isSaving} className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                                              {isSaving ? '...' : 'Zapisz'}
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          className="break-words cursor-text"
                                          style={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: Math.floor((rowHeight - 16) / 20),
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            maxHeight: rowHeight - 16
                                          }}
                                          title="Kliknij, aby edytować rekord"
                                        >
                                          {displayContent ? (
                                            <span className="text-slate-600">{displayContent}</span>
                                          ) : (
                                            <span className="text-slate-300 italic">Kliknij, aby edytować rekord</span>
                                          )}
                                        </div>
                                      )}

                                      {/* Uchwyt do przeciągania wartości (fill handle) */}
                                      {!isEditing && (
                                        <div
                                          className={`absolute bottom-0 right-0 w-3 h-3 bg-blue-600 cursor-crosshair z-10 ${
                                            isFillSource ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                          } transition-opacity`}
                                          style={{ transform: 'translate(50%, 50%)' }}
                                          onMouseDown={e => handleDragFillStart(e, record.id, columnKey, String(content || ''))}
                                          title="Przeciągnij, aby wypełnić"
                                        />
                                      )}
                                    </td>
                                  );
                                }

                                // Pola plikowe (załączniki Airtable) z drag & drop
                                if (colInfo.type === 'file') {
                                  const attachments = getFieldValue(record, columnKey) as Array<{url: string; filename?: string}> | undefined;
                                  const hasFile = attachments && attachments.length > 0;
                                  const isUploading = uploadingFile?.recordId === record.id && uploadingFile?.columnKey === columnKey;
                                  const isDragOver = dragOverFile?.recordId === record.id && dragOverFile?.columnKey === columnKey;

                                  return (
                                    <td
                                      key={columnKey}
                                      className={`px-2 py-1 border-r border-slate-100 align-middle transition-colors ${isDragOver ? 'bg-blue-100' : ''}`}
                                      style={{ width: getColumnWidth(columnKey, 'file') }}
                                      onClick={e => e.stopPropagation()}
                                      onDragOver={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!isUploading) {
                                          setDragOverFile({ recordId: record.id, columnKey });
                                        }
                                      }}
                                      onDragLeave={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverFile(null);
                                      }}
                                      onDrop={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragOverFile(null);
                                        if (isUploading) return;
                                        const files = e.dataTransfer.files;
                                        if (files.length > 0) {
                                          handleFileUpload(files[0], record, columnKey);
                                        }
                                      }}
                                    >
                                      {/* Stan uploadu */}
                                      {isUploading ? (
                                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1.5 rounded-md border border-blue-200">
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                          <span className="truncate">{uploadingFile.progress}</span>
                                        </div>
                                      ) : isEditing ? (
                                        <div className="flex flex-col gap-1">
                                          <input
                                            type="url"
                                            value={cellEditValue}
                                            onChange={e => setCellEditValue(e.target.value)}
                                            placeholder="Wklej URL do pliku..."
                                            className="w-full text-xs border border-blue-300 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            autoFocus
                                            onKeyDown={e => {
                                              if (e.key === 'Escape') cancelCellEdit();
                                              if (e.key === 'Enter') {
                                                if (cellEditValue.trim()) {
                                                  const saveFileAttachment = async () => {
                                                    if (!activeTool) return;
                                                    setIsSaving(true);
                                                    try {
                                                      const actualKey = findFieldKey(record, columnKey) || columnKey;
                                                      await airtable.updateRecord(activeTool.tableName, record.id, {
                                                        [actualKey]: [{ url: cellEditValue.trim() }]
                                                      });
                                                      await loadRecords();
                                                    } catch (err) {
                                                      console.error('Błąd zapisu pliku:', err);
                                                      alert('Wystąpił błąd podczas zapisu pliku.');
                                                    } finally {
                                                      setIsSaving(false);
                                                      cancelCellEdit();
                                                    }
                                                  };
                                                  saveFileAttachment();
                                                } else {
                                                  cancelCellEdit();
                                                }
                                              }
                                            }}
                                          />
                                          <div className="flex gap-1 justify-end">
                                            <button onClick={() => cancelCellEdit()} className="text-xs px-2 py-0.5 text-slate-600 hover:bg-slate-200 rounded">Anuluj</button>
                                            <button
                                              onClick={async () => {
                                                if (!activeTool || !cellEditValue.trim()) {
                                                  cancelCellEdit();
                                                  return;
                                                }
                                                setIsSaving(true);
                                                try {
                                                  const actualKey = findFieldKey(record, columnKey) || columnKey;
                                                  await airtable.updateRecord(activeTool.tableName, record.id, {
                                                    [actualKey]: [{ url: cellEditValue.trim() }]
                                                  });
                                                  await loadRecords();
                                                } catch (err) {
                                                  console.error('Błąd zapisu pliku:', err);
                                                  alert('Wystąpił błąd podczas zapisu pliku.');
                                                } finally {
                                                  setIsSaving(false);
                                                  cancelCellEdit();
                                                }
                                              }}
                                              disabled={isSaving}
                                              className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                            >
                                              {isSaving ? '...' : 'Zapisz'}
                                            </button>
                                          </div>
                                        </div>
                                      ) : hasFile ? (
                                        <div className="flex items-center gap-1.5">
                                          <a
                                            href={attachments[0].url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200"
                                            title={attachments[0].filename || 'Pobierz plik'}
                                          >
                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                            <span className="truncate max-w-[80px]">
                                              {attachments[0].filename || 'Plik'}
                                            </span>
                                          </a>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              startCellEdit(record.id, columnKey, attachments[0].url);
                                            }}
                                            className="text-slate-400 hover:text-slate-600 p-1"
                                            title="Zmień plik (URL)"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ) : isDragOver ? (
                                        <div className="flex items-center justify-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1.5 rounded-md border-2 border-dashed border-blue-400 w-full">
                                          <Upload className="w-3.5 h-3.5" />
                                          <span>Upuść tutaj</span>
                                        </div>
                                      ) : (
                                        <label className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2 py-1.5 rounded-md border border-dashed border-slate-300 hover:border-blue-400 transition-colors w-full justify-center cursor-pointer">
                                          <Upload className="w-3.5 h-3.5" />
                                          <span>Przeciągnij lub kliknij</span>
                                          <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            className="hidden"
                                            onChange={e => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                handleFileUpload(file, record, columnKey);
                                              }
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                      )}
                                    </td>
                                  );
                                }

                                // Pola wejściowe (edytowalne)
                                const val = getFieldValue(record, columnKey);
                                const displayVal = val ? String(val) : '';
                                const isUrl = colInfo.type === 'url' || displayVal.startsWith('http');
                                const isFillSource = isCellDragSource(record.id, columnKey);
                                const isInFillRange = isCellInFillRange(record.id, columnKey);

                                return (
                                  <td
                                    key={columnKey}
                                    className={`px-4 py-2 text-sm text-slate-700 border-r border-slate-100 align-top overflow-hidden relative group ${
                                      isEditing ? 'bg-blue-50 p-1' : 'hover:bg-slate-50'
                                    } ${isFillSource ? 'ring-2 ring-blue-500 ring-inset' : ''} ${isInFillRange ? 'bg-blue-100' : ''}`}
                                    style={{ width: getColumnWidth(columnKey, colInfo.type), maxHeight: rowHeight }}
                                    onDoubleClick={e => {
                                      e.stopPropagation();
                                      startCellEdit(record.id, columnKey, displayVal);
                                    }}
                                    onClick={e => {
                                      if (isEditing) e.stopPropagation();
                                      if (!isDraggingFill && !isEditing) {
                                        setSelectedCell({ recordId: record.id, columnKey });
                                      }
                                    }}
                                  >
                                    {isEditing ? (
                                      <div className="flex flex-col gap-1">
                                        {colInfo.type === 'textarea' ? (
                                          <textarea
                                            value={cellEditValue}
                                            onChange={e => setCellEditValue(e.target.value)}
                                            className="w-full text-sm border border-blue-300 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                            style={{ minHeight: rowHeight - 20 }}
                                            autoFocus
                                            onKeyDown={e => {
                                              if (e.key === 'Escape') cancelCellEdit();
                                              if (e.key === 'Enter' && e.ctrlKey) saveCellEdit(record);
                                            }}
                                          />
                                        ) : (
                                          <input
                                            type={colInfo.type === 'url' ? 'url' : 'text'}
                                            value={cellEditValue}
                                            onChange={e => setCellEditValue(e.target.value)}
                                            className="w-full text-sm border border-blue-300 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            autoFocus
                                            onKeyDown={e => {
                                              if (e.key === 'Escape') cancelCellEdit();
                                              if (e.key === 'Enter') saveCellEdit(record);
                                            }}
                                          />
                                        )}
                                        <div className="flex gap-1 justify-end">
                                          <button onClick={() => cancelCellEdit()} className="text-xs px-2 py-0.5 text-slate-600 hover:bg-slate-200 rounded">Anuluj</button>
                                          <button onClick={() => saveCellEdit(record)} disabled={isSaving} className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                                            {isSaving ? '...' : 'Zapisz'}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="overflow-hidden cursor-text" style={{ maxHeight: rowHeight - 16 }} title="Kliknij, aby edytować rekord">
                                        {isUrl && displayVal ? (
                                          <a
                                            href={displayVal}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="text-blue-600 hover:underline break-all"
                                            style={{
                                              display: '-webkit-box',
                                              WebkitLineClamp: Math.floor((rowHeight - 16) / 20),
                                              WebkitBoxOrient: 'vertical',
                                              overflow: 'hidden'
                                            }}
                                          >
                                            {displayVal}
                                          </a>
                                        ) : (
                                          <div
                                            className="break-words whitespace-pre-wrap"
                                            style={{
                                              display: '-webkit-box',
                                              WebkitLineClamp: Math.floor((rowHeight - 16) / 20),
                                              WebkitBoxOrient: 'vertical',
                                              overflow: 'hidden'
                                            }}
                                          >
                                            {displayVal || <span className="text-slate-300 italic">Kliknij, aby edytować rekord</span>}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Uchwyt do przeciągania wartości (fill handle) */}
                                    {!isEditing && (
                                      <div
                                        className={`absolute bottom-0 right-0 w-3 h-3 bg-blue-600 cursor-crosshair z-10 ${
                                          isFillSource ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                        } transition-opacity`}
                                        style={{ transform: 'translate(50%, 50%)' }}
                                        onMouseDown={e => handleDragFillStart(e, record.id, columnKey, displayVal)}
                                        title="Przeciągnij, aby wypełnić"
                                      />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
            )}
          </div>

          {/* Record Detail/Edit Modal */}
          {selectedRecord && !showForm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { if (!hasModalChanges()) { setSelectedRecord(null); } }}>
              <div
                className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 relative"
                style={{ width: `${modalWidth}px`, maxWidth: '95vw' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Lewy uchwyt resize */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/20 transition-colors z-10 group"
                  onMouseDown={e => handleModalResizeStart(e, 'left')}
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-slate-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Prawy uchwyt resize */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/20 transition-colors z-10 group"
                  onMouseDown={e => handleModalResizeStart(e, 'right')}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-slate-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Modal Header */}
                <div className="flex justify-between items-start px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex-1 min-w-0 pr-4">
                    <h2 className="text-xl font-bold text-slate-900 truncate mb-1">
                      {getRecordTitle(selectedRecord)}
                    </h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Utworzono: {new Date(selectedRecord.createdTime).toLocaleString('pl-PL')}
                      </span>
                      {(() => {
                        const lastMod = getFieldValue(selectedRecord, 'Last modified time');
                        if (!lastMod) return null;
                        return (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Zmodyfikowano: {new Date(String(lastMod)).toLocaleString('pl-PL')}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasModalChanges() && (
                      <button
                        onClick={resetModalChanges}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Cofnij zmiany
                      </button>
                    )}
                    <button
                      onClick={handleModalSave}
                      disabled={isSaving || !hasModalChanges()}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        hasModalChanges()
                          ? 'text-white bg-blue-600 hover:bg-blue-700'
                          : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                      } disabled:opacity-50`}
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Zapisz
                    </button>
                    <button
                      onClick={() => { setSelectedRecord(null); }}
                      className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Status (zawsze edytowalny) */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Status
                    </h3>
                    <div className="relative w-full md:w-64">
                      {(() => {
                        const currentStatus = String(modalFormData[STATUS_FIELD_NAME] || '');
                        const statusColors = getStatusColors(currentStatus);
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => setModalStatusDropdownOpen(!modalStatusDropdownOpen)}
                              className={`w-full text-sm font-semibold rounded-lg border py-2.5 px-3 pr-8 cursor-pointer transition-all flex items-center gap-2 ${
                                currentStatus
                                  ? `${statusColors.bgColor} ${statusColors.textColor} ${statusColors.borderColor}`
                                  : 'bg-white text-slate-500 border-slate-300'
                              } hover:opacity-90`}
                            >
                              {currentStatus && (
                                <span className={`w-3 h-3 rounded-full ${statusColors.bgColor} border ${statusColors.borderColor}`}></span>
                              )}
                              <span className="truncate">{currentStatus || 'Wybierz status...'}</span>
                              <svg
                                className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${modalStatusDropdownOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {modalStatusDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setModalStatusDropdownOpen(false)}
                                />
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 max-h-[300px] overflow-y-auto">
                                  {STATUS_OPTIONS.map(opt => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        handleModalFieldChange(STATUS_FIELD_NAME, opt.value);
                                        setModalStatusDropdownOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                                    >
                                      <span className={`inline-block w-3 h-3 rounded-full ${opt.bgColor} border ${opt.borderColor}`}></span>
                                      <span className={opt.textColor}>{opt.value}</span>
                                      {currentStatus === opt.value && (
                                        <Check className="w-4 h-4 ml-auto text-blue-600" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Dane wejściowe */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Dane wejściowe
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeTool?.inputFields.map(field => {
                        const val = modalFormData[field.key] || '';

                        // Pole typu file - z drag & drop
                        if (field.type === 'file') {
                          return (
                            <div key={field.key}>
                              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                                {field.label}
                              </label>
                              <div
                                className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${
                                  modalFileDragOver === field.key
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                                }`}
                                onDragOver={e => { e.preventDefault(); setModalFileDragOver(field.key); }}
                                onDragLeave={() => setModalFileDragOver(null)}
                                onDrop={e => {
                                  e.preventDefault();
                                  const file = e.dataTransfer.files[0];
                                  if (file) handleModalFileUpload(file, field.key);
                                }}
                              >
                                {val ? (
                                  <div className="flex items-center gap-2">
                                    <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all flex items-center gap-1 text-sm flex-1">
                                      {modalFileNames[field.key] || 'plik.xlsx'} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                    </a>
                                    <button
                                      onClick={() => {
                                        handleModalFieldChange(field.key, '');
                                        setModalFileNames(prev => {
                                          const updated = { ...prev };
                                          delete updated[field.key];
                                          return updated;
                                        });
                                      }}
                                      className="text-slate-400 hover:text-red-500 p-1"
                                      title="Usuń plik"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center text-slate-400 text-sm">
                                    <Upload className="w-6 h-6 mx-auto mb-1" />
                                    <p>Przeciągnij plik Excel lub <label className="text-blue-600 hover:underline cursor-pointer">
                                      wybierz
                                      <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) handleModalFileUpload(file, field.key);
                                        }}
                                      />
                                    </label></p>
                                  </div>
                                )}
                                {isSaving && modalFileDragOver === field.key && (
                                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                                    <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Pole textarea
                        if (field.type === 'textarea') {
                          return (
                            <div key={field.key} className="md:col-span-2">
                              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                                {field.label}
                              </label>
                              <textarea
                                value={String(val)}
                                onChange={e => handleModalFieldChange(field.key, e.target.value)}
                                className="w-full rounded-lg border-slate-300 border bg-white p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                                placeholder={field.placeholder}
                              />
                            </div>
                          );
                        }

                        // Pole url lub text
                        // URL zajmuje pełną szerokość dla lepszej czytelności
                        const isUrlField = field.type === 'url';
                        return (
                          <div key={field.key} className={isUrlField ? 'md:col-span-2' : ''}>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                              {field.label}
                            </label>
                            <input
                              type={isUrlField ? 'url' : 'text'}
                              value={String(val)}
                              onChange={e => handleModalFieldChange(field.key, e.target.value)}
                              className="w-full rounded-lg border-slate-300 border bg-white p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 break-all"
                              placeholder={field.placeholder}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Wyniki */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Wyniki automatyzacji
                    </h3>
                    <div className="space-y-4">
                      {activeTool?.outputFields.map(fieldKey => {
                        const content = modalFormData[fieldKey] || '';

                        return (
                          <div key={fieldKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                              <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                {fieldKey}
                              </h4>
                            </div>
                            <div className="p-4">
                              <textarea
                                value={String(content)}
                                onChange={e => handleModalFieldChange(fieldKey, e.target.value)}
                                className="w-full rounded-lg border-slate-300 border bg-white p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px] font-mono resize-y"
                                style={{ maxHeight: '70vh' }}
                                placeholder="Wpisz lub wklej zawartość... (lub poczekaj na wynik automatyzacji)"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Uwagi systemowe (tylko odczyt) */}
                  {(() => {
                    const uwagi = getFieldValue(selectedRecord, 'Uwagi do działania automatyzacji (komentarz)');
                    if (!uwagi) return null;
                    return (
                      <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Uwagi systemowe
                        </h3>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 whitespace-pre-wrap">
                          {String(uwagi)}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Pozostałe dane (tylko odczyt) */}
                  {getRemainingFields().length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <List className="w-4 h-4" />
                        Pozostałe dane
                      </h3>
                      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
                        {getRemainingFields().map(key => (
                          <div key={key} className="flex flex-col sm:flex-row sm:gap-4 border-b border-slate-200 last:border-0 pb-2 last:pb-0">
                            <span className="text-xs font-semibold text-slate-500 min-w-[180px]">{key}</span>
                            <span className="text-sm text-slate-700 break-all">{String(selectedRecord.fields[key])}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create Form Modal */}
          {showForm && activeTool && (
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"
                style={{
                  width: `${createModalWidth}px`,
                  height: `${createModalHeight}px`,
                  maxWidth: '95vw',
                  maxHeight: '95vh'
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Uchwyty do resize */}
                {/* Lewy */}
                <div
                  className="absolute left-0 top-4 bottom-4 w-2 cursor-ew-resize hover:bg-blue-500/20 transition-colors z-10 group"
                  onMouseDown={e => handleCreateModalResizeStart(e, 'left')}
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-slate-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Prawy */}
                <div
                  className="absolute right-0 top-4 bottom-4 w-2 cursor-ew-resize hover:bg-blue-500/20 transition-colors z-10 group"
                  onMouseDown={e => handleCreateModalResizeStart(e, 'right')}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-slate-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Dolny */}
                <div
                  className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize hover:bg-blue-500/20 transition-colors z-10 group"
                  onMouseDown={e => handleCreateModalResizeStart(e, 'bottom')}
                >
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-16 bg-slate-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Róg dolny prawy */}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-blue-500/20 transition-colors z-20"
                  onMouseDown={e => handleCreateModalResizeStart(e, 'corner-br')}
                />
                {/* Róg dolny lewy */}
                <div
                  className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize hover:bg-blue-500/20 transition-colors z-20"
                  onMouseDown={e => handleCreateModalResizeStart(e, 'corner-bl')}
                />

                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex-shrink-0">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {activeTool.newRecordLabel || 'Nowe zadanie'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">{activeTool.tableName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Status w nagłówku */}
                    {(() => {
                      const currentStatus = String(formData.Status || '');
                      const statusColors = getStatusColors(currentStatus);
                      return (
                        <div className="relative">
                          <button
                            type="button"
                            className={`text-sm font-semibold rounded-lg border py-1.5 px-3 pr-7 cursor-pointer transition-all flex items-center gap-2 ${
                              currentStatus
                                ? `${statusColors.bgColor} ${statusColors.textColor} ${statusColors.borderColor}`
                                : 'bg-white text-slate-500 border-slate-300'
                            } hover:opacity-90`}
                          >
                            {currentStatus && (
                              <span className={`w-2.5 h-2.5 rounded-full ${statusColors.bgColor} border ${statusColors.borderColor}`}></span>
                            )}
                            <span className="truncate max-w-[140px]">{currentStatus || 'Status...'}</span>
                            <svg
                              className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <select
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            value={currentStatus}
                            onChange={e => handleInputChange('Status', e.target.value)}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.value}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                    <button
                      onClick={() => setShowForm(false)}
                      className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                  <form id="automation-form" onSubmit={handleSubmit} className="space-y-5">

                    {/* Wybór trybu wejścia */}
                    {activeTool.inputModes && activeTool.inputModes.length > 0 && !editingRecordId && (
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                          Wybierz źródło danych
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {activeTool.inputModes.map(mode => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                setSelectedInputMode(mode.id);
                                setFormData({ Status: mode.initialStatus });
                                setSelectedFile(null);
                              }}
                              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                                selectedInputMode === mode.id
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {mode.id === 'url' ? (
                                <Link className="w-6 h-6 mb-2" />
                              ) : (
                                <FileSpreadsheet className="w-6 h-6 mb-2" />
                              )}
                              <span className="font-semibold text-sm">{mode.label}</span>
                              <span className="text-xs mt-1 opacity-70">{mode.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pola formularza - z drag & drop do zmiany kolejności */}
                    {getOrderedFormFields().map(({ key, label, isFromConfig, field }) => {
                      const airtableField = !isFromConfig ? airtableFields.find(f => f.name === key) : undefined;
                      const isOptional = isFromConfig ? field?.optional : true;
                      const isDragging = draggedFormField === key;
                      const isDragOver = dragOverFormField === key;

                      return (
                        <div
                          key={key}
                          className={`relative group transition-all ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-t-2 border-blue-500 pt-2' : ''}`}
                          draggable
                          onDragStart={e => {
                            setDraggedFormField(key);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggedFormField(null);
                            setDragOverFormField(null);
                          }}
                          onDragOver={e => {
                            e.preventDefault();
                            if (draggedFormField && draggedFormField !== key) {
                              setDragOverFormField(key);
                            }
                          }}
                          onDragLeave={() => setDragOverFormField(null)}
                          onDrop={e => {
                            e.preventDefault();
                            handleFormFieldDrop(key);
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              {/* Uchwyt do przeciągania */}
                              <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <label className="block text-sm font-semibold text-slate-700">
                                {isFromConfig ? label : key}
                                {isFromConfig && field?.required && <span className="text-red-500 ml-1">*</span>}
                                {!isFromConfig && airtableField && (
                                  <span className="ml-2 text-xs font-normal text-slate-400">({airtableField.type})</span>
                                )}
                              </label>
                            </div>
                            {isOptional && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newFields = new Set(visibleOptionalFields);
                                  newFields.delete(key);
                                  setVisibleOptionalFields(newFields);
                                  saveFieldsConfig(activeTool.id, newFields);
                                  handleInputChange(key, '');
                                }}
                                className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Usuń pole"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Renderowanie pola w zależności od typu */}
                          {isFromConfig && field ? (
                            // Pola z konfiguracji
                            field.type === 'textarea' ? (
                              <textarea
                                required={field.required}
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm min-h-[140px]"
                                placeholder={field.placeholder}
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              />
                            ) : field.type === 'select' ? (
                              <select
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              >
                                <option value="">Wybierz opcję...</option>
                                {field.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : field.type === 'file' ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all">
                                    <Upload className="w-5 h-5 text-slate-500" />
                                    <span className="text-sm text-slate-600">
                                      {selectedFile ? selectedFile.name : 'Wybierz plik Excel'}
                                    </span>
                                    <input
                                      type="file"
                                      accept={field.accept}
                                      className="hidden"
                                      onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) setSelectedFile(file);
                                      }}
                                    />
                                  </label>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                  <p className="text-xs text-amber-800">
                                    <strong>Uwaga:</strong> Aby wgrać plik Excel, podaj publiczny URL do pliku
                                    (np. link z Google Drive, Dropbox). Airtable pobierze plik automatycznie.
                                  </p>
                                </div>
                                <input
                                  type="url"
                                  required={field.required}
                                  className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                  placeholder="https://drive.google.com/... lub https://www.dropbox.com/..."
                                  value={String(formData[key] || '')}
                                  onChange={e => handleInputChange(key, e.target.value)}
                                />
                              </div>
                            ) : (
                              <input
                                type={field.type}
                                required={field.required}
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                placeholder={field.placeholder}
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              />
                            )
                          ) : (
                            // Pola z Airtable
                            airtableField?.type === 'multilineText' || airtableField?.type === 'richText' ? (
                              <textarea
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm min-h-[100px] resize-y"
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              />
                            ) : airtableField?.type === 'singleSelect' && airtableField?.options?.choices ? (
                              <select
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              >
                                <option value="">Wybierz...</option>
                                {airtableField.options.choices.map((choice: { name: string }) => (
                                  <option key={choice.name} value={choice.name}>{choice.name}</option>
                                ))}
                              </select>
                            ) : airtableField?.type === 'checkbox' ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  checked={Boolean(formData[key])}
                                  onChange={e => handleInputChange(key, e.target.checked)}
                                />
                                <span className="text-sm text-slate-600">Tak</span>
                              </label>
                            ) : airtableField?.type === 'number' || airtableField?.type === 'currency' || airtableField?.type === 'percent' ? (
                              <input
                                type="number"
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              />
                            ) : airtableField?.type === 'url' ? (
                              <input
                                type="url"
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                placeholder="https://..."
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              />
                            ) : airtableField?.type === 'email' ? (
                              <input
                                type="email"
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                placeholder="email@example.com"
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              />
                            ) : airtableField?.type === 'date' || airtableField?.type === 'dateTime' ? (
                              <input
                                type={airtableField?.type === 'dateTime' ? 'datetime-local' : 'date'}
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              />
                            ) : (
                              <input
                                type="text"
                                className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                value={String(formData[key] || '')}
                                onChange={e => handleInputChange(key, e.target.value)}
                              />
                            )
                          )}
                        </div>
                      );
                    })}

                    {/* Przycisk "Dodaj pole" - pola z Airtable które nie są jeszcze widoczne */}
                    {(() => {
                      // Zbierz klucze pól już widocznych (wymagane + dodane przez użytkownika)
                      const visibleFieldKeys = new Set<string>();
                      activeTool.inputFields.forEach(field => {
                        // Pola wymagane lub już widoczne
                        if (!field.optional || visibleOptionalFields.has(field.key)) {
                          // Sprawdź czy nie ma filtra trybu
                          if (!field.showForMode || field.showForMode === selectedInputMode) {
                            visibleFieldKeys.add(field.key.toLowerCase());
                          }
                        }
                      });
                      // Dodaj też pola dodane przez użytkownika z Airtable
                      visibleOptionalFields.forEach(key => visibleFieldKeys.add(key.toLowerCase()));
                      // Wyklucz pole Status - jest osobno
                      visibleFieldKeys.add('status');

                      // Pola z konfiguracji (optional) które jeszcze nie są widoczne
                      const hiddenConfigFields = activeTool.inputFields.filter(field => {
                        if (field.showForMode && field.showForMode !== selectedInputMode) return false;
                        return field.optional && !visibleOptionalFields.has(field.key);
                      });

                      // Pola z Airtable które nie są w konfiguracji i nie są jeszcze widoczne
                      const hiddenAirtableFields = airtableFields.filter(field => {
                        const keyLower = field.name.toLowerCase();
                        // Wyklucz pola już widoczne
                        if (visibleFieldKeys.has(keyLower)) return false;
                        // Wyklucz pola systemowe
                        if (['created time', 'last modified time', 'created', 'modified'].includes(keyLower)) return false;
                        // Wyklucz pola które są w konfiguracji (zarówno wymagane jak i optional)
                        const isInConfig = activeTool.inputFields.some(f => f.key.toLowerCase() === keyLower);
                        if (isInConfig) return false;
                        // Wyklucz pola wyjściowe
                        const isOutput = activeTool.outputFields.some(o => o.toLowerCase() === keyLower);
                        if (isOutput) return false;
                        return true;
                      });

                      const hasHiddenFields = hiddenConfigFields.length > 0 || hiddenAirtableFields.length > 0;
                      if (!hasHiddenFields) return null;

                      return (
                        <div className="relative" ref={addFieldDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setShowAddFieldDropdown(!showAddFieldDropdown)}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Dodaj pole
                            {isLoadingSchema && <RefreshCw className="w-3 h-3 animate-spin" />}
                          </button>
                          {showAddFieldDropdown && (
                              <div
                                className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 min-w-[250px] max-h-[300px] overflow-y-auto"
                              >
                                {/* Pola z konfiguracji (opcjonalne) */}
                                {hiddenConfigFields.length > 0 && (
                                  <>
                                    <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                      Pola zdefiniowane
                                    </div>
                                    {hiddenConfigFields.map(field => (
                                      <button
                                        key={field.key}
                                        type="button"
                                        onClick={() => {
                                          const newFields = new Set([...visibleOptionalFields, field.key]);
                                          setVisibleOptionalFields(newFields);
                                          saveFieldsConfig(activeTool.id, newFields);
                                          setShowAddFieldDropdown(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                      >
                                        {field.label}
                                      </button>
                                    ))}
                                  </>
                                )}
                                {/* Pola z Airtable */}
                                {hiddenAirtableFields.length > 0 && (
                                  <>
                                    <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide border-t border-slate-100 mt-1 pt-2">
                                      Pola z Airtable
                                    </div>
                                    {hiddenAirtableFields.map(field => (
                                      <button
                                        key={field.id}
                                        type="button"
                                        onClick={() => {
                                          const newFields = new Set([...visibleOptionalFields, field.name]);
                                          setVisibleOptionalFields(newFields);
                                          saveFieldsConfig(activeTool.id, newFields);
                                          setShowAddFieldDropdown(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
                                      >
                                        <span>{field.name}</span>
                                        <span className="text-xs text-slate-400">{field.type}</span>
                                      </button>
                                    ))}
                                  </>
                                )}
                              </div>
                          )}
                        </div>
                      );
                    })()}

                  </form>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-medium transition-all"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    form="automation-form"
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                    Dodaj do bazy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}