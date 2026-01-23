# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Polecenia developerskie

```bash
# Instalacja zależności
npm install

# Uruchomienie serwera deweloperskiego (port 3000)
npm run dev

# Build produkcyjny
npm run build

# Podgląd buildu produkcyjnego
npm run preview
```

## Architektura projektu

**Poltel Hub** to aplikacja React (v19) służąca jako dashboard do zarządzania automatyzacjami contentowymi opartymi na Airtable. Zastępuje bezpośrednią interakcję z Airtable przyjaznym interfejsem użytkownika.

### Stack technologiczny
- **React 19** + **TypeScript** z Vite
- **Tailwind CSS** (CDN) ze stylami inline
- **Lucide React** - ikony
- **Airtable API** - backend danych
- Deploy na **Vercel** (SPA z rewrite do index.html)

### Struktura plików (flat, bez src/)
```
├── App.tsx           # Główny komponent aplikacji (dashboard + widok narzędzia)
├── index.tsx         # Entry point React
├── constants.tsx     # Konfiguracja narzędzi automatyzacji (AUTOMATION_TOOLS)
├── types.ts          # Interfejsy TypeScript
├── services/
│   └── airtableService.ts  # Klient API Airtable (CRUD)
├── index.html        # HTML z Tailwind CDN i importmap dla ESM
└── vite.config.ts    # Konfiguracja Vite (alias @/ -> root)
```

### Przepływ danych
1. Użytkownik konfiguruje `API Key` i `Base ID` Airtable (przechowywane w localStorage)
2. Dashboard wyświetla listę narzędzi zdefiniowanych w `AUTOMATION_TOOLS` (constants.tsx)
3. Każde narzędzie mapuje się na tabelę w Airtable z polami wejściowymi/wyjściowymi
4. `AirtableService` obsługuje operacje CRUD z automatycznym ustawianiem statusu

### Kluczowe wzorce

**Case-insensitive field matching**: Aplikacja obsługuje różnice w wielkości liter między konfiguracją a rzeczywistymi nazwami kolumn w Airtable (funkcje `findFieldKey`, `getFieldValue` w App.tsx).

**Status workflow**: Rekordy mają pole `Status` z wartościami: "Do zrobienia" / "W trakcie" / "Zrobione" / "Błąd".

**Auto-refresh**: Widok narzędzia automatycznie odświeża dane co 10 sekund.

### Dodawanie nowego narzędzia automatyzacji

Dodaj wpis do tablicy `AUTOMATION_TOOLS` w `constants.tsx`:
```typescript
{
  id: 'unique-id',
  label: 'Nazwa wyświetlana',
  tableName: 'Nazwa tabeli w Airtable',
  icon: <IconComponent className="w-5 h-5" />,
  description: 'Opis funkcjonalności',
  inputFields: [
    { key: 'NazwaKolumny', label: 'Etykieta', type: 'text|textarea|url|select', required: true }
  ],
  outputFields: ['Kolumna Wynikowa 1', 'Kolumna Wynikowa 2']
}
```

## Konwencje

- Używaj języka polskiego w komunikacji i komentarzach
- Nazwy pól Airtable: "sentence case" (np. "Słowa kluczowe" nie "Słowa Kluczowe")
- Komponenty React: functional components z hooks
- Styling: Tailwind utility classes inline
