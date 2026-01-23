import React from 'react';

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
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
}

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'select';
  options?: string[]; // For select type
  placeholder?: string;
  required?: boolean;
}

export type StatusType = 'Todo' | 'In Progress' | 'Done' | 'Error';