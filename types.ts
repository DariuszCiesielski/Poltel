import React from 'react';

export interface AirtableAttachment {
  id?: string;      // Opcjonalne przy tworzeniu - Airtable nadaje automatycznie
  url: string;
  filename?: string; // Opcjonalne przy tworzeniu - Airtable pobiera z URL
}

export interface AirtableRecordFields {
  [key: string]: string | number | boolean | AirtableAttachment[] | undefined;
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: AirtableRecordFields;
}

export interface AutomationConfig {
  id: string;
  label: string;
  tableName: string;
  icon: React.ReactNode;
  description: string;
  inputFields: FieldConfig[];
  outputFields: string[]; // Field names to display as results
  inputModes?: InputMode[]; // Opcjonalne tryby wejścia (np. URL vs Excel)
  supportsExport?: boolean; // Czy narzędzie obsługuje eksport do pliku
}

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'select' | 'file';
  options?: string[]; // For select type
  placeholder?: string;
  required?: boolean;
  accept?: string; // For file type (e.g., '.xlsx,.xls')
  showForMode?: string; // Show field only for specific input mode
}

// Tryb wejścia dla narzędzi z wieloma źródłami danych
export interface InputMode {
  id: string;
  label: string;
  description: string;
  initialStatus: string; // Status ustawiany przy tworzeniu rekordu
}

export type StatusType = 'Todo' | 'In Progress' | 'Done' | 'Error';