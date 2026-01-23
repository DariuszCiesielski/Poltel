import React, { useState, useEffect, useCallback } from 'react';
import { AirtableService } from './services/airtableService';
import { AUTOMATION_TOOLS, STATUS_FIELD_NAME, STATUS_DONE, STATUS_IN_PROGRESS, STATUS_TODO } from './constants';
import { AirtableRecord, AirtableRecordFields } from './types';
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
  List
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

  if (normalizedStatus === 'done' || normalizedStatus === 'zrobione') {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    icon = <CheckCircle className="w-3 h-3 mr-1.5" />;
  } else if (normalizedStatus === 'in progress' || normalizedStatus === 'w trakcie') {
    colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
    icon = <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />;
  } else if (normalizedStatus === 'error' || normalizedStatus === 'błąd') {
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
    icon = <AlertCircle className="w-3 h-3 mr-1.5" />;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${colorClass}`}>
      {icon}
      {status || 'Oczekuje'}
    </span>
  );
};

// --- Main App ---

export default function App() {
  // Configuration State
  const [apiKey, setApiKey] = useState(localStorage.getItem('AT_API_KEY') || '');
  const [baseId, setBaseId] = useState(localStorage.getItem('AT_BASE_ID') || '');
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

  // Form State
  const [formData, setFormData] = useState<AirtableRecordFields>({});

  const activeTool = AUTOMATION_TOOLS.find(t => t.id === activeToolId);
  const airtable = new AirtableService(apiKey, baseId);
  const isConfigured = apiKey.length > 0 && baseId.length > 0;

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
    setFormData({});
    setEditingRecordId(null);
    setSelectedRecord(null);
    setShowForm(true);
  };

  const initEditForm = (record: AirtableRecord) => {
    const newFormData: AirtableRecordFields = {};
    if (activeTool) {
        activeTool.inputFields.forEach(field => {
            // Use getFieldValue to find data even if case mismatches
            const val = getFieldValue(record, field.key);
            if (val !== undefined) {
                newFormData[field.key] = val;
            }
        });
    }
    setFormData(newFormData);
    setEditingRecordId(record.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTool) return;

    setIsSaving(true);
    try {
      // Prepare payload mapping back to actual keys if editing, or config keys if creating
      const finalFields: AirtableRecordFields = {};
      
      Object.keys(formData).forEach(configKey => {
          let targetKey = configKey;
          
          // If editing, try to find the existing column name to match exact case
          if (editingRecordId && records.length > 0) {
              const originalRecord = records.find(r => r.id === editingRecordId);
              if (originalRecord) {
                  const actualKey = findFieldKey(originalRecord, configKey);
                  if (actualKey) targetKey = actualKey;
              }
          }
          finalFields[targetKey] = formData[configKey];
      });

      if (editingRecordId) {
        await airtable.updateRecord(activeTool.tableName, editingRecordId, finalFields);
      } else {
        await airtable.createRecord(activeTool.tableName, finalFields);
      }
      
      setFormData({});
      setShowForm(false);
      setEditingRecordId(null);
      await loadRecords(); 
    } catch (err) {
      alert('Wystąpił błąd podczas zapisu. Sprawdź konsolę.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Improved title resolution using case-insensitive lookup
  const getRecordTitle = (record: AirtableRecord) => {
      if (!activeTool) return 'Record';
      
      // Priority 1: Configuration key
      const configKey = activeTool.inputFields[0].key;
      const configVal = getFieldValue(record, configKey);
      if (configVal) return String(configVal);

      // Priority 2: Common fallback keys (case insensitive)
      const commonKeys = ['temat', 'nazwa', 'nazwa produktu', 'title', 'subject', 'name', 'produkt'];
      for (const common of commonKeys) {
          const val = getFieldValue(record, common);
          if (val) return String(val);
      }

      // Priority 3: Fallback ID
      return <span className="text-slate-400 font-normal italic">Bez tytułu ({record.id.slice(-4)})</span>;
  };

  const renderContent = (content: any) => {
    if (!content) return <span className="text-slate-400 italic flex items-center gap-2"><div className="w-4 h-0.5 bg-slate-300"></div> Puste pole...</span>;
    
    if (typeof content !== 'string') return JSON.stringify(content);
    
    // Check if looks like HTML
    if (content.trim().startsWith('<') && content.includes('>')) {
        return (
            <div 
                className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-sm" 
                dangerouslySetInnerHTML={{ __html: content }} 
            />
        );
    }
    // Markdown-like or plain text
    return <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm font-sans">{content}</div>;
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
              <button 
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg transition-all border border-white/10"
              >
                <Settings className="w-4 h-4" />
                Konfiguracja
              </button>
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
                  {tool.label}
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
                  <span className="font-medium truncate">{tool.label}</span>
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
               {activeTool?.label}
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
            <button 
              onClick={initCreateForm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nowe Zadanie</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Records List Column */}
          <div className={`${selectedRecord || showForm ? 'hidden lg:block w-80 xl:w-96' : 'w-full'} flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto transition-all duration-300`}>
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
                <div className="p-10 text-center text-slate-400 flex flex-col items-center mt-20">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Database className="w-8 h-8 opacity-30" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Brak zadań</p>
                    <p className="text-xs mt-1">Tabela jest pusta.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                {records.map(record => {
                    const statusVal = getFieldValue(record, STATUS_FIELD_NAME);
                    const status = String(statusVal || 'Unknown');
                    const isSelected = selectedRecord?.id === record.id;
                    
                    return (
                    <div 
                        key={record.id}
                        onClick={() => { setSelectedRecord(record); setShowForm(false); }}
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-all border-l-4 group ${
                        isSelected 
                            ? 'bg-blue-50/60 border-blue-600' 
                            : 'border-transparent'
                        }`}
                    >
                        <div className="flex justify-between items-start gap-3 mb-2">
                            <h3 className={`font-semibold text-sm line-clamp-2 leading-snug ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                {getRecordTitle(record)}
                            </h3>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                {new Date(record.createdTime).toLocaleDateString()}
                            </span>
                            <StatusBadge status={status} />
                        </div>
                    </div>
                    );
                })}
                </div>
            )}
          </div>

          {/* Main Detail/Form Area */}
          <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-8 relative">
            
            {/* Create/Edit Form */}
            {showForm && activeTool && (
              <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full md:h-auto animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {editingRecordId ? 'Edytuj Zadanie' : 'Nowe Zadanie'}
                        </h3>
                        <p className="text-slate-400 text-xs">{activeTool.label}</p>
                    </div>
                    <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full">✕</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form id="automation-form" onSubmit={handleSubmit} className="space-y-5">
                    {activeTool.inputFields.map(field => (
                        <div key={field.key}>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea
                            required={field.required}
                            className="w-full rounded-lg border-slate-200 border bg-slate-50 p-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm min-h-[140px]"
                            placeholder={field.placeholder}
                            value={String(formData[field.key] || '')}
                            onChange={e => handleInputChange(field.key, e.target.value)}
                            />
                        ) : field.type === 'select' ? (
                            <select
                            className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                            value={String(formData[field.key] || '')}
                            onChange={e => handleInputChange(field.key, e.target.value)}
                            >
                            <option value="">Wybierz opcję...</option>
                            {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                            </select>
                        ) : (
                            <input
                            type={field.type}
                            required={field.required}
                            className="w-full rounded-lg border-slate-200 border bg-slate-50 p-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                            placeholder={field.placeholder}
                            value={String(formData[field.key] || '')}
                            onChange={e => handleInputChange(field.key, e.target.value)}
                            />
                        )}
                        </div>
                    ))}
                    </form>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl">
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
                      {editingRecordId ? 'Zapisz' : 'Uruchom Automat'}
                    </button>
                </div>
              </div>
            )}

            {/* Record Detail View */}
            {!showForm && selectedRecord && activeTool && (
              <div className="max-w-4xl mx-auto space-y-8 pb-10 animate-in fade-in duration-300">
                
                {/* Mobile Back Button */}
                <div className="lg:hidden">
                     <button onClick={() => setSelectedRecord(null)} className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-sm font-medium transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Wróć do listy
                     </button>
                </div>

                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
                           {getRecordTitle(selectedRecord)}
                        </h2>
                        <div className="flex items-center gap-3">
                            <StatusBadge status={String(getFieldValue(selectedRecord, STATUS_FIELD_NAME) || 'Unknown')} />
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">ID: {selectedRecord.id}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => initEditForm(selectedRecord)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edytuj Dane
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                    {activeTool.inputFields.slice(1).map(field => {
                        const val = getFieldValue(selectedRecord, field.key);
                        const isUrl = field.type === 'url' || (typeof val === 'string' && val.startsWith('http'));
                        
                        return (
                            <div key={field.key} className="group">
                                <span className="block text-slate-500 mb-1.5 text-[10px] font-bold uppercase tracking-widest">{field.label}</span>
                                <div className="text-slate-800 break-words bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                    {val ? (
                                        isUrl ? (
                                            <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                {String(val).slice(0, 40)}... <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : String(val)
                                    ) : <span className="text-slate-300 italic">Brak danych</span>}
                                </div>
                            </div>
                        )
                    })}
                  </div>
                </div>

                {/* Outputs Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Wyniki</h3>
                         <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    
                    {activeTool.outputFields.map(fieldKey => {
                        const content = getFieldValue(selectedRecord, fieldKey);
                        const hasContent = content && String(content).trim().length > 0;

                        return (
                            <div key={fieldKey} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-all">
                                <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-200/60 flex justify-between items-center">
                                    <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        {fieldKey}
                                    </h4>
                                    {hasContent && (
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(String(content))}
                                            className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-white transition-colors"
                                            title="Kopiuj do schowka"
                                        >
                                            <Copy className="w-3 h-3" /> Kopiuj
                                        </button>
                                    )}
                                </div>
                                <div className="p-6 md:p-8 bg-white min-h-[100px]">
                                    {renderContent(content)}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Remaining Data Section - Fallback for fields not in config */}
                {getRemainingFields().length > 0 && (
                    <div className="space-y-4 pt-6">
                        <div className="flex items-center gap-4">
                             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <List className="w-4 h-4" /> Pozostałe dane
                             </h3>
                             <div className="h-px bg-slate-200 flex-1"></div>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 grid grid-cols-1 gap-4">
                            {getRemainingFields().map(key => (
                                <div key={key} className="flex flex-col sm:flex-row sm:gap-4 border-b border-slate-200 last:border-0 pb-3 last:pb-0">
                                    <span className="text-xs font-semibold text-slate-500 min-w-[150px] pt-1">{key}</span>
                                    <span className="text-sm text-slate-700 font-mono break-all">{String(selectedRecord.fields[key])}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!showForm && !selectedRecord && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8">
                {error ? (
                     <div className="text-center">
                        <div className="text-red-300 mb-4 flex justify-center"><AlertTriangle className="w-12 h-12 opacity-50" /></div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Problem z załadowaniem danych</h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">Wystąpił błąd podczas komunikacji z bazą Airtable.</p>
                     </div>
                ) : (
                    <div className="text-center opacity-60">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <LayoutGrid className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Wybierz zadanie</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto">Kliknij zadanie na liście po lewej, aby zobaczyć szczegóły, lub utwórz nowe.</p>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}