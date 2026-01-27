import React from 'react';
import { AutomationConfig } from './types';
import { 
  FileText, 
  Search, 
  PenTool, 
  ShoppingBag,
  Globe,
  Newspaper
} from 'lucide-react';

// Konfiguracja nazw tabel i pól w Airtable.
// Zaktualizowano nazwy pól na "sentence case" (np. Słowa kluczowe zamiast Słowa Kluczowe), 
// co jest częstszą konwencją i może rozwiązać problem "Brak danych".

export const AUTOMATION_TOOLS: AutomationConfig[] = [
  {
    id: 'internet-articles',
    label: 'Artykuły z Internetu',
    tableName: 'Artykuły z Internetu',
    icon: <Globe className="w-5 h-5" />,
    description: 'Generuje artykuły na podstawie podanych linków i tematów znalezionych w sieci.',
    inputFields: [
      { key: 'Text', label: 'Temat / Tytuł', type: 'text', required: true, placeholder: 'Wpisz temat artykułu...' },
    ],
    outputFields: ['Article OpenAI', 'Article Anthropic', 'Excerpt', 'LinkedIn Post', 'Facebook Post']
  },
  {
    id: 'product-desc',
    label: 'Generator Opisów Produktów',
    tableName: 'Generator opisów produktowych',
    icon: <ShoppingBag className="w-5 h-5" />,
    description: 'Generuje zoptymalizowane pod SEO opisy produktów. Możesz podać pojedynczy link lub zaimportować wiele produktów z pliku Excel.',
    inputModes: [
      { id: 'url', label: 'Pojedynczy URL', description: 'Podaj link do produktu', initialStatus: 'Generuj opis' },
      { id: 'excel', label: 'Import z Excel', description: 'Wgraj plik Excel z linkami', initialStatus: 'Przetwórz plik Excel' }
    ],
    inputFields: [
      { key: 'URL', label: 'Link do produktu', type: 'url', placeholder: 'https://...', showForMode: 'url', required: true },
      { key: 'Plik Excel', label: 'Plik Excel z linkami', type: 'file', accept: '.xlsx,.xls', showForMode: 'excel', required: true },
      { key: 'Opis', label: 'Dodatkowe informacje o produkcie', type: 'textarea', placeholder: 'Opcjonalne informacje o produkcie niedostępne w internecie (np. specyfikacja techniczna, cechy szczególne)...' },
      { key: 'Dodatkowe instrukcje dla automatyzacji', label: 'Instrukcje dla AI', type: 'textarea', placeholder: 'Opcjonalne wytyczne dla AI (np. pomiń marki, skup się na funkcjach)...' }
    ],
    outputFields: ['Opis rozszerzony'],
    supportsExport: true
  },
  {
    id: 'competitor-search',
    label: 'Wyszukiwarka Odpowiedników',
    tableName: 'Wyszukiwarka odpowiedników produktów',
    icon: <Search className="w-5 h-5" />,
    description: 'Wyszukuje odpowiedniki produktów i analizuje konkurencję.',
    inputFields: [
      { key: 'Opis produktu', label: 'Opis szukanego produktu', type: 'textarea', required: true }
    ],
    outputFields: ['Opis odpowiednik 1', 'URL odpowiednik 1', 'Opis odpowiednik 2', 'URL odpowiednik 2', 'Opis odpowiednik 3', 'URL odpowiednik 3']
  },
  {
    id: 'expert-article',
    label: 'Artykuły Eksperckie SEO',
    tableName: 'Generator artykułów eksperckich SEO',
    icon: <PenTool className="w-5 h-5" />,
    description: 'Tworzy rozbudowane, profesjonalne artykuły blogowe pod pozycjonowanie.',
    inputFields: [
      { key: 'Słowo Kluczowe', label: 'Słowo kluczowe', type: 'text', required: true, placeholder: 'np. okablowanie strukturalne' },
      { key: 'Język', label: 'Język', type: 'select', options: ['Polish', 'English'] },
      { key: 'Lokalizacja', label: 'Lokalizacja', type: 'text', placeholder: 'Poland' }
    ],
    outputFields: ['Article', 'Title', 'Intro', 'Conclusion', 'Faq', 'Excerpt']
  },
  {
    id: 'general-article',
    label: 'Artykuły Ogólne',
    tableName: 'Generator artykułów ogólnych',
    icon: <Newspaper className="w-5 h-5" />,
    description: 'Generuje artykuły ogólne i treści na stronę z wsparciem POLTEL.',
    inputFields: [
      { key: 'Tytuł artykułu', label: 'Tytuł artykułu', type: 'text', required: true },
      { key: 'Co ma zawierać artykuł', label: 'Co ma zawierać artykuł', type: 'textarea' },
      { key: 'Ton w jakim pisać', label: 'Ton pisania', type: 'text', placeholder: 'Ekspercki, techniczny...' }
    ],
    outputFields: ['Article OpenAI', 'Excerpt', 'LinkedIn Post', 'Facebook Post']
  }
];

export const STATUS_FIELD_NAME = 'Status';
export const STATUS_TODO = 'Do zrobienia';
export const STATUS_DONE = 'Zrobione';
export const STATUS_IN_PROGRESS = 'W trakcie';

// Statusy specyficzne dla Generatora opisów produktów
export const PRODUCT_DESC_STATUSES = {
  GENERATE: 'Generuj opis',
  PROCESS_EXCEL: 'Przetwórz plik Excel',
  FILE_PROCESSED: 'Plik przetworzony',  // Nowy status po przetworzeniu Excel
  IN_PROGRESS: 'W toku',
  DONE: 'Zrobione',
  ERROR: 'Błąd',
  FILE_ERROR: 'Błąd pliku',
  EXPORT: 'Eksportuj dane do pliku',
  EXPORTED: 'Plik eksportu wysłany'
};