# Poltel Hub

Dashboard do zarządzania automatyzacjami contentowymi opartymi na Airtable. Zastępuje bezpośrednią interakcję z Airtable przyjaznym interfejsem użytkownika.

🔗 **Demo:** [https://poltel-hub.vercel.app](https://poltel-hub.vercel.app)

## Funkcjonalności

### Narzędzia automatyzacji
- **Artykuły z Internetu** - generowanie artykułów na podstawie linków źródłowych
- **Generator Opisów Produktów** - opisy zoptymalizowane pod SEO
- **Wyszukiwarka Odpowiedników** - analiza konkurencji i alternatywnych produktów
- **Artykuły Eksperckie SEO** - rozbudowane artykuły blogowe
- **Artykuły Ogólne** - proste treści na stronę

### Interakcje w tabeli
- **Edycja inline** - dwuklik na komórkę otwiera edytor
- **Kolorowy dropdown statusów** - szybka zmiana statusu rekordu
- **Przeciąganie wartości (drag-fill)** - jak w Excelu, przeciągnij róg komórki aby skopiować wartość
- **Eksport do XLS** - pobierz wybrane rekordy jako plik Excel
- **Drag & drop plików** - przeciągnij plik Excel na pole w tabeli
- **Zarządzanie kolumnami** - ukrywanie, zmiana kolejności i szerokości

## Stack technologiczny

- **React 19** + **TypeScript**
- **Vite** - bundler i dev server
- **Tailwind CSS** - styling
- **Lucide React** - ikony
- **xlsx (SheetJS)** - generowanie plików Excel
- **Airtable API** - backend danych

## Uruchomienie lokalne

```bash
# Instalacja zależności
npm install

# Uruchomienie serwera deweloperskiego (port 3000)
npm run dev

# Build produkcyjny
npm run build
```

## Konfiguracja

### Opcja 1: Przez interfejs (zalecane)
1. Otwórz aplikację
2. Kliknij przycisk **Konfiguracja** (prawy górny róg)
3. Wprowadź:
   - **API Key** - Personal Access Token z Airtable
   - **Base ID** - ID bazy Airtable (zaczyna się od `app...`)

Dane są przechowywane w localStorage przeglądarki.

### Opcja 2: Zmienne środowiskowe
Skopiuj `.env.example` do `.env` i uzupełnij:

```bash
cp .env.example .env
```

```bash
VITE_AIRTABLE_API_KEY=pat...  # Token z https://airtable.com/create/tokens
VITE_AIRTABLE_BASE_ID=app...  # ID z URL bazy Airtable
```

**Priorytet**: localStorage > zmienne środowiskowe

## Struktura projektu

```
├── App.tsx              # Główny komponent (dashboard + widok narzędzia)
├── constants.tsx        # Konfiguracja narzędzi automatyzacji
├── types.ts             # Interfejsy TypeScript
├── services/
│   └── airtableService.ts   # Klient API Airtable
├── index.html           # HTML z Tailwind CDN
├── vite.config.ts       # Konfiguracja Vite
└── vercel.json          # Konfiguracja deploymentu
```

## Dodawanie nowego narzędzia

Dodaj wpis do tablicy `AUTOMATION_TOOLS` w `constants.tsx`:

```typescript
{
  id: 'unique-id',
  label: 'Nazwa wyświetlana',
  tableName: 'Nazwa tabeli w Airtable',
  icon: <IconComponent className="w-5 h-5" />,
  description: 'Opis funkcjonalności',
  inputFields: [
    { key: 'NazwaKolumny', label: 'Etykieta', type: 'text', required: true }
  ],
  outputFields: ['Kolumna Wynikowa 1', 'Kolumna Wynikowa 2']
}
```

## Przepływ danych

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Poltel    │────▶│   Airtable   │────▶│  n8n/Make    │
│    Hub      │◀────│     API      │◀────│ Automatyzacje│
└─────────────┘     └──────────────┘     └──────────────┘
```

1. Użytkownik wprowadza dane w Poltel Hub
2. Dane zapisywane są w Airtable ze statusem "Do zrobienia"
3. Automatyzacje n8n przetwarzają rekordy i aktualizują wyniki
4. Poltel Hub wyświetla wyniki (auto-refresh co 10s)

## Planowany rozwój

- [ ] Migracja z Airtable na Supabase
- [ ] System uwierzytelniania użytkowników
- [ ] Bezpieczne przechowywanie kluczy API

## Licencja

Projekt prywatny - wszystkie prawa zastrzeżone.
