# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Polecenia developerskie

```bash
npm install          # Instalacja zależności
npm run dev          # Serwer deweloperski (port 3000)
npm run build        # Build produkcyjny
npm run preview      # Podgląd buildu produkcyjnego
```

## Architektura projektu

**Poltel Hub** to aplikacja React (v19) służąca jako dashboard do zarządzania automatyzacjami contentowymi opartymi na Airtable. Zastępuje bezpośrednią interakcję z Airtable przyjaznym interfejsem użytkownika.

### Stack technologiczny
- **React 19.2** + **TypeScript 5.8** z Vite 6
- **Tailwind CSS** (CDN) ze stylami inline
- **Lucide React** - ikony
- **Airtable API** - backend danych
- Deploy na **Vercel** (SPA z rewrite do index.html)

### Struktura plików (flat, bez src/)
```
├── App.tsx              # Główny komponent aplikacji (dashboard + widok narzędzia)
├── index.tsx            # Entry point React
├── constants.tsx        # Konfiguracja narzędzi (AUTOMATION_TOOLS) + stałe statusów
├── types.ts             # Interfejsy TypeScript (AutomationConfig, FieldConfig, AirtableRecord)
├── services/
│   └── airtableService.ts  # Klient API Airtable (CRUD)
├── .n8n/
│   └── Generator opisów produktów/
│       ├── POLTEL - Generator opisów produktów v 1.1.json  # Główny workflow AI
│       ├── POLTEL - Import Excel to Airtable.json          # Import z Excel
│       ├── POLTEL - Export Airtable to Excel.json          # Eksport v1
│       └── POLTEL - Export Airtable to Excel v2.json       # Eksport v2 (zalecany)
├── index.html           # HTML z Tailwind CDN i importmap dla ESM
├── index.css            # Style globalne (Tailwind utilities)
├── vite.config.ts       # Konfiguracja Vite (alias @/ -> root)
├── vite-env.d.ts        # Deklaracje TypeScript dla import.meta.env
├── vercel.json          # Konfiguracja deploymentu (SPA rewrite)
└── .env.example         # Przykładowe zmienne środowiskowe
```

### Stan aplikacji (App.tsx)

**Konfiguracja:**
- `apiKey`, `baseId` - dane dostępowe Airtable (localStorage)
- `showSettings` - modal ustawień

**Nawigacja:**
- `viewMode` - 'dashboard' | 'tool'
- `activeToolId` - ID wybranego narzędzia

**Dane:**
- `records` - lista rekordów z Airtable
- `isLoading`, `isSaving` - stany ładowania
- `error` - komunikat błędu

**UI tabeli:**
- `columnWidths` - szerokości kolumn { [key]: number }
- `columnOrder` - kolejność kolumn string[]
- `hiddenColumns` - ukryte kolumny Set<string>
- `rowHeight` - wysokość wierszy (40-200px)
- `showColumnSettings` - panel ustawień kolumn

**Drag & drop kolumn:**
- `draggedColumn` - przeciągana kolumna
- `dragOverColumn` - kolumna nad którą jest kursor

**Inline editing:**
- `editingCell` - { recordId, columnKey } | null
- `cellEditValue` - wartość podczas edycji

**Upload plików:**
- `uploadingFile` - { recordId, columnKey, progress } | null - stan uploadu
- `dragOverFile` - { recordId, columnKey } | null - pole nad którym jest przeciągany plik

**Status dropdown:**
- `openStatusDropdown` - ID rekordu z otwartym dropdown statusu

**Modal:**
- `selectedRecord` - wybrany rekord (otwiera modal)
- `modalEditMode` - tryb edycji w modalu
- `modalFormData` - dane formularza w modalu

**Formularz tworzenia/edycji:**
- `showForm` - widoczność formularza
- `editingRecordId` - ID edytowanego rekordu (null = tworzenie)
- `formData` - dane formularza
- `selectedInputMode` - wybrany tryb wejścia
- `selectedFile` - wybrany plik

### Zmienne środowiskowe

Aplikacja obsługuje konfigurację przez zmienne środowiskowe (opcjonalnie):

```bash
VITE_AIRTABLE_API_KEY=pat...  # Personal Access Token z Airtable
VITE_AIRTABLE_BASE_ID=app...  # ID bazy Airtable
```

Priorytet konfiguracji: `localStorage` > `import.meta.env` (zmienne .env)

### Przepływ danych (integracja z n8n/Make)
```
Poltel Hub → Airtable API → n8n/Make Automatyzacje → Airtable API → Poltel Hub
```
1. Użytkownik konfiguruje `API Key` i `Base ID` Airtable (localStorage)
2. Dashboard wyświetla narzędzia z `AUTOMATION_TOOLS` (constants.tsx)
3. Każde narzędzie mapuje się na tabelę w Airtable
4. Nowe rekordy tworzone ze statusem "Do zrobienia"
5. Zewnętrzne automatyzacje (n8n) przetwarzają rekordy i aktualizują wyniki
6. Poltel Hub wyświetla wyniki (auto-refresh co 10s)

### Kluczowe wzorce

**Case-insensitive field matching**: Aplikacja obsługuje różnice w wielkości liter między konfiguracją a rzeczywistymi nazwami kolumn w Airtable (funkcje `findFieldKey`, `getFieldValue` w App.tsx).

**Status workflow**: Pole `Status` (stała `STATUS_FIELD_NAME`) z wartościami i kolorami zdefiniowanymi w `STATUS_OPTIONS`:
```typescript
const STATUS_OPTIONS = [
  { value: 'Generuj opis', bgColor: 'bg-amber-100', textColor: 'text-amber-800' },
  { value: 'Przetwórz plik Excel', bgColor: 'bg-amber-100', textColor: 'text-amber-800' },
  { value: 'W toku', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  { value: 'Zrobione', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
  { value: 'Błąd', bgColor: 'bg-rose-100', textColor: 'text-rose-800' },
  { value: 'Eksportuj dane do pliku', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  { value: 'Plik eksportu wysłany', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
  { value: 'Plik przetworzony', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
  { value: 'Błąd pliku', bgColor: 'bg-rose-100', textColor: 'text-rose-800' }
];
```

**Kolory statusów:**
| Status | Kolor | Znaczenie |
|--------|-------|-----------|
| Generuj opis, Przetwórz plik Excel | Żółty (amber) | Oczekuje na przetworzenie |
| W toku | Niebieski (blue) | W trakcie przetwarzania |
| Zrobione, Plik eksportu wysłany, Plik przetworzony | Zielony (emerald) | Zakończone sukcesem |
| Błąd, Błąd pliku | Czerwony (rose) | Błąd |
| Eksportuj dane do pliku | Fioletowy (purple) | Trigger eksportu |

Status można zmieniać:
- Bezpośrednio w tabeli (kolorowy dropdown w kolumnie Status)
- W modalu edycji (dropdown w sekcji Status)

**Auto-refresh**: Widok narzędzia automatycznie odświeża dane co 10 sekund.

**Sortowanie client-side**: Rekordy sortowane po `createdTime` (metadata Airtable), nie po custom polu, aby uniknąć błędów 422.

**HTML Output Viewer**: Komponent `HtmlOutputViewer` w App.tsx obsługuje renderowanie wyników z automatyzacji:
- Automatyczna detekcja HTML vs plain text
- Przełącznik podgląd/kod źródłowy
- Kopiowanie i pobieranie jako plik HTML

### Widok tabelaryczny

Rekordy wyświetlane są w interaktywnej tabeli z następującymi funkcjonalnościami:

**Kolumny:**
- Pola wejściowe z konfiguracji narzędzia (`inputFields`) - w tym pola plikowe
- Pola wynikowe (`outputFields`)
- Status (kolorowy dropdown do szybkiej zmiany)
- Utworzono (data z `createdTime`)
- Zmodyfikowano (data z `Last modified time`)

**Pola plikowe (typ `file`):**
- Wyświetlane jako zielony badge z ikoną pliku Excel
- Kliknięcie otwiera plik w nowej karcie
- Przycisk edycji pozwala zmienić URL
- **Drag & drop** - przeciągnij plik z komputera na pole
- **Kliknij** - otwiera dialog wyboru pliku
- Upload przez Cloudinary (patrz sekcja "Upload plików przez Cloudinary")

**Zarządzanie kolumnami:**
- **Ukrywanie/pokazywanie** - przycisk "Kolumny" w pasku narzędzi otwiera panel z checkboxami
- **Zmiana kolejności** - przeciągnij nagłówek kolumny (ikona ⠿) w inne miejsce
- **Zmiana szerokości** - przeciągnij prawą krawędź nagłówka kolumny
- **Regulacja wysokości wierszy** - suwak w pasku narzędzi (40-200px)

**Stan kolumn** przechowywany w:
- `columnWidths` - szerokości kolumn
- `columnOrder` - kolejność kolumn
- `hiddenColumns` - ukryte kolumny
- `rowHeight` - wysokość wierszy

### Inline editing (edycja w tabeli)

Wszystkie pola (oprócz dat systemowych) są edytowalne bezpośrednio w tabeli:

**Status:**
- Kolorowy custom dropdown z listą `STATUS_OPTIONS` w każdym wierszu
- Aktualny status wyświetlany jako kolorowy przycisk
- Lista opcji z kolorowymi kropkami wskazującymi kategorię
- Zmiana następuje natychmiast po wybraniu opcji
- Funkcja `handleQuickStatusChange()`
- Stan `openStatusDropdown` śledzi otwarty dropdown

**Pola plikowe:**
- Drag & drop plików Excel bezpośrednio na komórkę
- Klik otwiera dialog wyboru pliku
- Upload przez Cloudinary z wizualnym feedbackiem (spinner, progress)
- Funkcja `handleFileUpload()`

**Pozostałe pola:**
- **Dwuklik** na komórkę rozpoczyna edycję
- Pole tekstowe lub textarea (zależnie od typu)
- Przyciski Anuluj/Zapisz lub skróty klawiszowe:
  - `Enter` - zapisz (dla input)
  - `Ctrl+Enter` - zapisz (dla textarea)
  - `Escape` - anuluj

**Stan edycji:**
- `editingCell` - { recordId, columnKey } aktualnie edytowanej komórki
- `cellEditValue` - wartość podczas edycji
- Funkcje: `startCellEdit()`, `cancelCellEdit()`, `saveCellEdit()`

### Modal szczegółów/edycji

Po kliknięciu w wiersz tabeli otwiera się modal z dwoma trybami:

**Tryb podglądu (domyślny):**
- Wyświetla wszystkie dane rekordu
- Obie daty (utworzenia i modyfikacji) w nagłówku
- Przycisk "Edytuj" włącza tryb edycji

**Tryb edycji (`modalEditMode: true`):**
- Status jako dropdown
- Wszystkie pola wejściowe jako formularze
- Pola wynikowe jako textarea (do korekty wygenerowanych treści)
- Przyciski Anuluj/Zapisz

**Stan modalu:**
- `modalEditMode` - czy modal jest w trybie edycji
- `modalFormData` - dane formularza
- Funkcje: `initModalEdit()`, `cancelModalEdit()`, `handleModalSave()`, `handleModalFieldChange()`

### Dodawanie nowego narzędzia automatyzacji

1. Dodaj wpis do `AUTOMATION_TOOLS` w `constants.tsx`
2. Utwórz odpowiadającą tabelę w Airtable z wymaganymi kolumnami

```typescript
{
  id: 'unique-id',
  label: 'Nazwa wyświetlana',
  tableName: 'Nazwa tabeli w Airtable',
  icon: <IconComponent className="w-5 h-5" />,
  description: 'Opis funkcjonalności',
  inputFields: [
    { key: 'NazwaKolumny', label: 'Etykieta', type: 'text', required: true, placeholder: 'Podpowiedź...' }
  ],
  outputFields: ['Kolumna Wynikowa 1', 'Kolumna Wynikowa 2'],
  // Opcjonalne - dla narzędzi z wieloma źródłami danych:
  inputModes: [
    { id: 'url', label: 'Pojedynczy URL', description: 'Podaj link', initialStatus: 'Generuj opis' },
    { id: 'excel', label: 'Import z Excel', description: 'Wgraj plik', initialStatus: 'Przetwórz plik Excel' }
  ],
  supportsExport: true  // Włącza przycisk eksportu do Excel
}
```

### Typy pól formularza (FieldConfig)

| Typ | Opis | Dodatkowe właściwości |
|-----|------|----------------------|
| `text` | Pole tekstowe jednoliniowe | `placeholder` |
| `textarea` | Pole wieloliniowe | `placeholder` |
| `url` | Pole URL z walidacją | `placeholder` |
| `select` | Lista rozwijana | `options: string[]` |
| `file` | Upload pliku (wymaga URL) | `accept: '.xlsx,.xls'` |

**Właściwości wspólne**: `key`, `label`, `required`, `showForMode` (filtruje po wybranym trybie wejścia)

### Załączniki Airtable (AirtableAttachment)

Dla pól typu `file` Airtable wymaga formatu załącznika:
```typescript
interface AirtableAttachment {
  id?: string;      // Nadawane przez Airtable
  url: string;      // Publiczny URL do pliku
  filename?: string; // Opcjonalnie
}
// Przykład zapisu: fields['Plik Excel'] = [{ url: 'https://...' }]
```

### Upload plików przez Cloudinary

Aplikacja obsługuje **drag & drop** plików Excel bezpośrednio w tabeli. Pliki są uploadowane na Cloudinary, a URL jest zapisywany w Airtable.

**Konfiguracja Cloudinary:**
```typescript
// W App.tsx - funkcja uploadFileToHost()
Cloud name: 'dqba3j0s1'
Upload preset: 'n8n_uploads' (unsigned)
Endpoint: https://api.cloudinary.com/v1_1/dqba3j0s1/raw/upload
```

**Jak działa upload:**
1. Użytkownik przeciąga plik Excel na pole w tabeli (lub klika i wybiera plik)
2. Plik jest walidowany (tylko .xlsx, .xls)
3. Plik jest uploadowany na Cloudinary (endpoint `/raw/upload` dla plików nie-obrazowych)
4. Cloudinary zwraca `secure_url`
5. URL jest zapisywany jako załącznik w Airtable

**Stan podczas uploadu:**
- `uploadingFile` - pokazuje spinner z postępem
- `dragOverFile` - podświetla pole podczas przeciągania

**Wymagania Cloudinary:**
- Upload preset musi być ustawiony jako **Unsigned** (Settings → Upload → Upload presets)
- Pliki są przechowywane trwale w Cloudinary

## Automatyzacje n8n

Pliki workflow n8n znajdują się w katalogu `.n8n/` (lub w głównym katalogu projektu).

### Generator opisów produktów v 1.1

**Plik:** `POLTEL - Generator opisów produktów v 1.1.json`

**Trigger:** Webhook lub ręczne uruchomienie

**Przepływ:**
```
Webhook → Search (Status="Generuj opis") → HTTP Request (pobiera HTML) → Code (parsuje produkt) → Update (W toku) → Perplexity AI → Update (Zrobione)
```

**Kolumny Airtable:**
| Kolumna | Typ | Opis | Edytowalne w UI |
|---------|-----|------|-----------------|
| `URL` | URL | Link do strony produktu | ✅ Tak |
| `Plik Excel` | Attachment | Plik Excel z linkami (tryb masowy) | ✅ Tak |
| `Opis` | Long text | Dodatkowe informacje o produkcie (podawane przez użytkownika) | ✅ Tak |
| `Dodatkowe instrukcje dla automatyzacji` | Long text | Opcjonalne wytyczne dla AI | ✅ Tak |
| `Opis rozszerzony` | Long text | Finalny opis SEO wygenerowany przez AI | ✅ Tak |
| `Status` | Single select | Status przetwarzania (trigger automatyzacji) | ✅ Tak |
| `Uwagi do działania automatyzacji (komentarz)` | Long text | Komentarze systemowe od n8n | ❌ Tylko odczyt |
| `Created time` | Date | Data utworzenia rekordu | ❌ Systemowe |
| `Last modified time` | Date | Data ostatniej modyfikacji | ❌ Systemowe |

**Konfiguracja w constants.tsx:**
```typescript
{
  id: 'product-desc',
  label: 'Generator Opisów Produktów',
  tableName: 'Generator opisów produktowych',
  inputFields: [
    { key: 'URL', label: 'Link do produktu', type: 'url', showForMode: 'url', required: true },
    { key: 'Plik Excel', label: 'Plik Excel z linkami', type: 'file', showForMode: 'excel', required: true },
    { key: 'Opis', label: 'Dodatkowe informacje o produkcie', type: 'textarea' },
    { key: 'Dodatkowe instrukcje dla automatyzacji', label: 'Instrukcje dla AI', type: 'textarea' }
  ],
  outputFields: ['Opis rozszerzony'],
  inputModes: [
    { id: 'url', label: 'Pojedynczy URL', initialStatus: 'Generuj opis' },
    { id: 'excel', label: 'Import z Excel', initialStatus: 'Przetwórz plik Excel' }
  ],
  supportsExport: true
}
```

**Logika parsowania (Code node):**
- Nazwa produktu: `<h1 class="product-cart__name">`
- Opis: `<div class="desc-text desc-text--main">`

**AI (Perplexity sonar-pro):** Generuje opis SEO z FAQ na końcu.

### Import Excel to Airtable

**Plik:** `.n8n/Generator opisów produktów/POLTEL - Import Excel to Airtable.json`

**Trigger:** Webhook lub ręczne (uruchamiany gdy rekord ma status "Przetwórz plik Excel")

**Przepływ:**
```
Webhook → Search (Status="Przetwórz plik Excel") → Check Has File → Download Excel → Parse → Prepare Records → Create in Airtable → Update Parent (Plik przetworzony)
                                                        ↓ (brak pliku)
                                                  Update (Błąd pliku)
```

**Obsługiwane nazwy kolumn w Excel:**
- URL: `URL`, `url`, `Url`, `Link`, `link`, `Link do produktu`, `Adres URL`
- Instrukcje: `Instrukcje`, `Dodatkowe instrukcje`, `Notes`, `Uwagi`

**Logika:**
1. Pobiera plik Excel z załącznika Airtable
2. Parsuje wiersze, szukając kolumny URL
3. Tworzy nowe rekordy ze statusem "Generuj opis"
4. Dodaje komentarz o imporcie do każdego rekordu

### Export Airtable to Excel

**Plik:** `.n8n/Generator opisów produktów/POLTEL - Export Airtable to Excel.json` (v1)
**Plik:** `.n8n/Generator opisów produktów/POLTEL - Export Airtable to Excel v2.json` (v2 - zalecany)

**Trigger:** Webhook lub ręczne (uruchamiany przez zmianę statusu na "Eksportuj dane do pliku")

**Przepływ v2:**
```
Webhook → Search (Status="Eksportuj dane do pliku") → Create Spreadsheet → Fetch (Status="Zrobione") → Check Has Records → Prepare Data → Create Excel → Upload to Drive → Share → Update (Plik eksportu wysłany)
                                                                                                            ↓ (brak rekordów)
                                                                                                      Update (Błąd)
```

**Eksportowane kolumny (v2):**
- `URL`
- `Nazwa produktu` (pierwsza linia z Opis)
- `Opis rozszerzony`
- `Data utworzenia`

**Różnice między v1 a v2:**
| Funkcja | v1 | v2 |
|---------|----|----|
| Format | Google Sheets | Excel (.xlsx) + Google Drive |
| Powiadomienie | Email z linkiem | Link zapisany w rekordzie |
| Obsługa błędów | Brak | Walidacja pustych rekordów |
| Nazwa pliku | Stała | Z datą i godziną |

### Pełny cykl życia rekordu

```
┌─────────────────────────────────────────────────────────────────┐
│  TRYB URL                         TRYB EXCEL                    │
│  ─────────                        ──────────                    │
│  Poltel Hub                       Poltel Hub                    │
│  tworzy rekord                    tworzy rekord                 │
│  Status: "Generuj opis"           Status: "Przetwórz plik Excel"│
└─────────────────┬───────────────────────────┬───────────────────┘
                  │                           │
                  │                           ▼
                  │                   ┌─────────────────────────┐
                  │                   │ n8n: Import Excel       │
                  │                   │ - Pobiera plik Excel    │
                  │                   │ - Parsuje wiersze       │
                  │                   │ - Tworzy rekordy        │
                  │                   │   Status: "Generuj opis"│
                  │                   │ - Parent → "Plik        │
                  │                   │   przetworzony"         │
                  │                   └───────────┬─────────────┘
                  │                               │
                  ▼                               ▼
         ┌────────────────────────────────────────────┐
         │  n8n: Generator opisów produktów v 1.1    │
         │  - Pobiera HTML ze strony                  │
         │  - Parsuje nazwę i opis                    │
         │  - Status: "W toku"                        │
         │  - Generuje opis przez Perplexity AI       │
         │  - Status: "Zrobione" / "Błąd"             │
         └─────────────────────┬──────────────────────┘
                               │
                               ▼
         ┌────────────────────────────────────────────┐
         │  Poltel Hub: Przycisk "Eksportuj"          │
         │  - Zmienia status na "Eksportuj dane..."   │
         └─────────────────────┬──────────────────────┘
                               │
                               ▼
         ┌────────────────────────────────────────────┐
         │  n8n: Export Airtable to Excel (v2)       │
         │  - Tworzy plik Excel                       │
         │  - Upload do Google Drive                  │
         │  - Udostępnia publicznie                   │
         │  - Zapisuje link w rekordzie               │
         │  - Status: "Plik eksportu wysłany"         │
         └────────────────────────────────────────────┘
```

### Wszystkie statusy

| Status | Opis | Ustawiany przez |
|--------|------|-----------------|
| `Generuj opis` | Oczekuje na przetworzenie | Poltel Hub (tryb URL) / n8n Import |
| `Przetwórz plik Excel` | Oczekuje na import z Excel | Poltel Hub (tryb Excel) |
| `Plik przetworzony` | Import Excel zakończony | n8n Import Excel |
| `W toku` | Przetwarzanie przez AI | n8n Generator |
| `Zrobione` | Opis wygenerowany | n8n Generator |
| `Błąd` | Błąd podczas generowania | n8n Generator |
| `Błąd pliku` | Błąd importu Excel | n8n Import Excel |
| `Eksportuj dane do pliku` | Trigger eksportu | Poltel Hub (przycisk Eksportuj) |
| `Plik eksportu wysłany` | Eksport zakończony | n8n Export |

## Interakcje użytkownika

### Skróty klawiszowe

| Skrót | Kontekst | Akcja |
|-------|----------|-------|
| `Enter` | Edycja komórki (input) | Zapisz zmiany |
| `Ctrl+Enter` | Edycja komórki (textarea) | Zapisz zmiany |
| `Escape` | Edycja komórki | Anuluj edycję |
| `Dwuklik` | Komórka tabeli | Rozpocznij edycję inline |

### Gesty myszy

| Akcja | Element | Rezultat |
|-------|---------|----------|
| Klik | Wiersz tabeli | Otwórz modal szczegółów |
| Dwuklik | Komórka (nie-data) | Edycja inline |
| Przeciągnij | Nagłówek kolumny (⠿) | Zmień kolejność kolumn |
| Przeciągnij | Prawa krawędź nagłówka | Zmień szerokość kolumny |
| Klik | Dropdown Status | Otwórz kolorowy dropdown statusów |
| Przeciągnij plik | Pole plikowe | Upload pliku na Cloudinary |
| Klik | Pole plikowe (puste) | Otwórz dialog wyboru pliku |

### Pasek narzędzi tabeli

```
[Wysokość: ═══○═══ 80px] | [Kolumny (2)] | ⇄ Przeciągnij kolumny | ↔ Zmień szerokość | ✎ Kliknij 2x aby edytować
```

- **Suwak wysokości** - reguluje wysokość wszystkich wierszy (40-200px)
- **Przycisk Kolumny** - otwiera panel z checkboxami widoczności kolumn (badge pokazuje liczbę ukrytych)
- **Wskazówki** - informacje o dostępnych interakcjach

## Konwencje

- Używaj języka polskiego w komunikacji i komentarzach
- Nazwy pól Airtable: "sentence case" (np. "Słowa kluczowe" nie "Słowa Kluczowe")
- Komponenty React: functional components z hooks
- Styling: Tailwind utility classes inline
