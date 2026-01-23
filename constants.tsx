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
      { key: 'Temat', label: 'Temat / Tytuł', type: 'text', required: true, placeholder: 'Wpisz temat artykułu...' },
      { key: 'Link', label: 'Link do artykułu źródłowego', type: 'url', required: true, placeholder: 'https://...' },
      { key: 'Słowa kluczowe', label: 'Słowa kluczowe', type: 'text', placeholder: 'fraza1, fraza2' }
    ],
    outputFields: ['Treść', 'Podsumowanie', 'Social Media']
  },
  {
    id: 'product-desc',
    label: 'Generator Opisów Produktów',
    tableName: 'Generator opisów produktowych',
    icon: <ShoppingBag className="w-5 h-5" />,
    description: 'Generuje zoptymalizowane pod SEO opisy produktów na podstawie nazwy lub URL.',
    inputFields: [
      { key: 'Nazwa produktu', label: 'Nazwa Produktu', type: 'text', required: true, placeholder: 'np. Kabel światłowodowy...' },
      { key: 'URL', label: 'Link do źródła (opcjonalnie)', type: 'url', placeholder: 'https://...' },
      { key: 'Słowa kluczowe', label: 'Słowa kluczowe', type: 'text', placeholder: 'cena, opinie, sklep' }
    ],
    outputFields: ['Opis produktu', 'Tytuł SEO', 'Meta opis']
  },
  {
    id: 'competitor-search',
    label: 'Wyszukiwarka Odpowiedników',
    tableName: 'Wyszukiwarka odpowiedników produktów',
    icon: <Search className="w-5 h-5" />,
    description: 'Wyszukuje odpowiedniki produktów i analizuje konkurencję.',
    inputFields: [
      { key: 'Nazwa produktu', label: 'Nazwa szukanego produktu', type: 'text', required: true },
      { key: 'Marka', label: 'Marka / Producent', type: 'text' }
    ],
    outputFields: ['Znalezione odpowiedniki', 'Raport']
  },
  {
    id: 'expert-article',
    label: 'Artykuły Eksperckie SEO',
    tableName: 'Generator artykułów eksperckich SEO',
    icon: <PenTool className="w-5 h-5" />,
    description: 'Tworzy rozbudowane, profesjonalne artykuły blogowe pod pozycjonowanie.',
    inputFields: [
      { key: 'Temat', label: 'Temat artykułu', type: 'text', required: true, placeholder: 'np. Zalety sieci 5G' },
      { key: 'Słowa kluczowe', label: 'Słowa kluczowe SEO', type: 'text', placeholder: '5g, internet, prędkość' },
      { key: 'Wytyczne', label: 'Dodatkowe wytyczne', type: 'textarea' }
    ],
    outputFields: ['Treść artykułu', 'Nagłówki', 'Meta description']
  },
  {
    id: 'general-article',
    label: 'Artykuły Ogólne',
    tableName: 'Generator artykułów ogólnych',
    icon: <Newspaper className="w-5 h-5" />,
    description: 'Generuje proste artykuły ogólne i treści na stronę.',
    inputFields: [
      { key: 'Temat', label: 'Temat', type: 'text', required: true },
      { key: 'Cel', label: 'Cel tekstu', type: 'select', options: ['Informacyjny', 'Rozrywkowy', 'News'] }
    ],
    outputFields: ['Treść artykułu']
  }
];

export const STATUS_FIELD_NAME = 'Status'; 
export const STATUS_TODO = 'Do zrobienia';
export const STATUS_DONE = 'Zrobione';
export const STATUS_IN_PROGRESS = 'W trakcie';