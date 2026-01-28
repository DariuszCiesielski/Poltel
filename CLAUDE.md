# CLAUDE.md

## Polecenia developerskie

```bash
npm install          # Instalacja zależności
npm run dev          # Serwer deweloperski (port 3000)
npm run build        # Build produkcyjny
```

## Architektura projektu

**Poltel Hub** - dashboard React do zarządzania automatyzacjami contentowymi opartymi na Airtable.

### Stack technologiczny
- **React 19** + **TypeScript 5.8** + **Vite 6**
- **Tailwind CSS** (CDN), **Lucide React** (ikony), **xlsx** (eksport Excel)
- **Airtable API** - backend, deploy na **Vercel**

### Struktura plików
```
├── App.tsx              # Główny komponent (dashboard + widok narzędzia)
├── constants.tsx        # Konfiguracja narzędzi (AUTOMATION_TOOLS) + STATUS_OPTIONS
├── types.ts             # Interfejsy TypeScript
├── services/airtableService.ts  # Klient API Airtable (CRUD + Meta API)
├── components/auth/     # Komponenty autoryzacji (LoginForm, AuthGuard)
├── contexts/AuthContext.tsx  # Context autoryzacji użytkownika
├── .n8n/                # Workflow n8n (Generator opisów, Import/Export Excel)
└── index.html, vite.config.ts, vercel.json
```

### Zmienne środowiskowe (opcjonalne)
```bash
VITE_AIRTABLE_API_KEY=pat...  # Personal Access Token
VITE_AIRTABLE_BASE_ID=app...  # ID bazy
```
Priorytet: `localStorage` > `import.meta.env`

## Przepływ danych

```
Poltel Hub → Airtable API → n8n Automatyzacje → Airtable API → Poltel Hub
```

1. Użytkownik konfiguruje API Key i Base ID (localStorage)
2. Dashboard wyświetla narzędzia z `AUTOMATION_TOOLS` (constants.tsx)
3. Każde narzędzie = tabela w Airtable
4. Nowe rekordy ze statusem triggerującym automatyzację
5. n8n przetwarza rekordy i aktualizuje wyniki
6. Auto-refresh co 10s

## Kluczowe wzorce

**Case-insensitive field matching**: funkcje `findFieldKey`, `getFieldValue` w App.tsx

**Airtable Meta API**: `fetchTableSchema()` w airtableService.ts pobiera schemat pól tabeli (typy, opcje select)

**Statusy workflow** (STATUS_OPTIONS w constants.tsx):
| Kolor | Statusy |
|-------|---------|
| Żółty (amber) | Generuj opis, Przetwórz plik Excel |
| Niebieski (blue) | W toku |
| Zielony (emerald) | Zrobione, Plik przetworzony, Plik eksportu wysłany |
| Czerwony (rose) | Błąd, Błąd pliku |
| Fioletowy (purple) | Eksportuj dane do pliku |

**Sortowanie**: po `createdTime` (metadata Airtable), nie custom polu

## Dodawanie nowego narzędzia

1. Dodaj wpis do `AUTOMATION_TOOLS` w `constants.tsx`
2. Utwórz tabelę w Airtable

```typescript
{
  id: 'unique-id',
  tableName: 'Nazwa tabeli w Airtable',
  icon: <IconComponent className="w-5 h-5" />,
  description: 'Opis funkcjonalności',
  newRecordLabel: 'Nowy rekord',  // etykieta w nagłówku modala
  inputFields: [
    { key: 'NazwaKolumny', label: 'Etykieta', type: 'text', required: true },
    { key: 'OpcjonalnePole', label: 'Opcjonalne', type: 'textarea', optional: true }
  ],
  outputFields: ['Kolumna Wynikowa'],
  inputModes: [  // opcjonalne
    { id: 'url', label: 'URL', initialStatus: 'Generuj opis' },
    { id: 'excel', label: 'Excel', initialStatus: 'Przetwórz plik Excel' }
  ],
  supportsExport: true
}
```

### Typy pól (FieldConfig)
- `text`, `textarea`, `url` - pola tekstowe
- `select` - lista z `options: string[]`
- `file` - upload z `accept: '.xlsx,.xls'`
- Wspólne: `key`, `label`, `required`, `showForMode`, `optional`, `placeholder`
- `optional: true` - pole ukryte domyślnie, dostępne przez przycisk "Dodaj pole"

### Załączniki Airtable
```typescript
// Dla pól typu file:
fields['Plik Excel'] = [{ url: 'https://...' }]
```

## Upload plików (Cloudinary)

Drag & drop plików Excel → upload na Cloudinary → URL do Airtable

```typescript
// Konfiguracja w App.tsx - uploadFileToHost()
Cloud name: 'dqba3j0s1'
Upload preset: 'n8n_uploads' (unsigned)
```

## Automatyzacje n8n

Pliki w `.n8n/Generator opisów produktów/`:

| Workflow | Trigger status | Rezultat |
|----------|---------------|----------|
| Generator opisów v1.1 | Generuj opis | Opis rozszerzony + Zrobione/Błąd |
| Import Excel | Przetwórz plik Excel | Nowe rekordy + Plik przetworzony |
| Export Excel v2 | Eksportuj dane do pliku | Plik XLS + Plik eksportu wysłany |

**Kolumny tabeli "Generator opisów produktowych":**
- `URL`, `Plik Excel`, `Opis`, `Dodatkowe instrukcje dla automatyzacji`
- `Opis rozszerzony` (wynik AI), `Status`, `Uwagi do działania automatyzacji`
- `Created time`, `Last modified time` (systemowe)

## Funkcjonalności UI

**Tabela:**
- Inline editing (dwuklik), kolorowy dropdown statusu
- Drag & drop kolumn, zmiana szerokości, ukrywanie
- Drag-fill (jak Excel - przeciągnij róg komórki)
- Upload plików przez drag & drop

**Modal edycji:** podgląd/edycja rekordu (klik na wiersz), resize przez uchwyty

**Modal tworzenia:**
- Dynamiczne pola z Airtable Meta API (pobiera schemat tabeli)
- Pola opcjonalne dostępne przez "Dodaj pole"
- Drag & drop do zmiany kolejności pól (zapisywane w localStorage)
- Resize przez uchwyty na krawędziach

**Eksport XLS:** przycisk gdy są rekordy ze statusem "Eksportuj dane do pliku"

**Skróty:** Enter (zapisz), Ctrl+Enter (zapisz textarea), Escape (anuluj)

## Konwencje

- Język polski w komunikacji i komentarzach
- Nazwy pól Airtable: sentence case
- Komponenty React: functional + hooks
- Styling: Tailwind inline
