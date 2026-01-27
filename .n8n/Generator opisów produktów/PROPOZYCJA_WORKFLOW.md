# Propozycja workflow n8n dla Generatora Opisów Produktów

## Podsumowanie analizy

### Istniejące workflow

#### 1. POLTEL - Generator opisów produktów v 1.1
**Cel:** Generowanie opisów SEO dla pojedynczych produktów

**Przepływ:**
```
Webhook/Manual → Search (Status="Generuj opis") 
→ HTTP Request (pobierz HTML strony produktu)
→ Code JS (ekstrakcja nazwy i opisu)
→ Update (Status="W toku", wstępny opis)
→ Perplexity API (model sonar-pro, szczegółowy prompt SEO)
→ Update (Status="Zrobione", Opis rozszerzony)
```

**Obsługa błędów:** Przy błędzie parsowania HTML → Status="Błąd"

**Mocne strony:**
- Rozbudowany prompt dla Perplexity z instrukcjami SEO
- Ekstrakcja danych z HTML strony produktu
- Obsługa dodatkowych instrukcji użytkownika

---

#### 2. POLTEL - Export Airtable to Excel
**Cel:** Eksport gotowych opisów do Google Sheets

**Przepływ:**
```
Webhook/Manual → Search (Status="Eksportuj dane do pliku")
→ Create Spreadsheet (Google Sheets)
→ Fetch (Status="Zrobione")
→ Edit Fields (URL, Opis rozszerzony)
→ Append rows → Aggregate
→ Share file (Google Drive)
→ Send email (Gmail)
→ Update Status="Plik eksportu wysłany"
```

**Ograniczenia:**
- Link do pliku wysyłany tylko mailem, nie jest widoczny w interfejsie
- Eksport do Google Sheets zamiast natywnego pliku Excel

---

## Zidentyfikowane luki

1. **Brak workflow do importu Excel** - Interfejs obsługuje tryb "Import z Excel" ze statusem "Przetwórz plik Excel", ale nie ma workflow, który to przetwarza.

2. **Brak widoczności linku do eksportu** - Obecny eksport wysyła link mailem, ale nie zapisuje go w Airtable, więc użytkownik nie widzi go w interfejsie Poltel Hub.

---

## Proponowane nowe workflow

### 1. POLTEL - Import Excel to Airtable (NOWY)

**Plik:** `POLTEL - Import Excel to Airtable.json`

**Cel:** Przetwarzanie pliku Excel z adresami URL produktów i tworzenie rekordów do generowania opisów.

**Przepływ:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Webhook/Manual Trigger                                                      │
│         │                                                                    │
│         ▼                                                                    │
│  Search Excel Records (Status = "Przetwórz plik Excel")                     │
│         │                                                                    │
│         ▼                                                                    │
│  Check Has Excel File ───────────────────┐                                  │
│         │ TAK                            │ NIE                               │
│         ▼                                ▼                                   │
│  Download Excel File              Update - No File Error                    │
│         │                         (Status = "Błąd pliku")                   │
│         ▼                                                                    │
│  Parse Excel File                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  Prepare Records for Airtable ───────────┐                                  │
│  (Code: szuka URL w różnych              │ BŁĄD                              │
│   nazwach kolumn)                        ▼                                   │
│         │                         Update - Parse Error                      │
│         │ OK                      (Status = "Błąd pliku")                   │
│         ▼                                                                    │
│  Create Product Records                                                      │
│  (Status = "Generuj opis" dla każdego URL)                                  │
│         │                                                                    │
│         ▼                                                                    │
│  Aggregate Created Records                                                   │
│         │                                                                    │
│         ▼                                                                    │
│  Update Parent - Success                                                     │
│  (Status = "Plik przetworzony")                                             │
│  (Uwagi = "Utworzono X rekordów...")                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Kluczowe funkcjonalności:**
- Automatyczne wykrywanie kolumny URL (obsługuje różne nazwy: URL, Link, Adres URL, itp.)
- Obsługa dodatkowych instrukcji na poziomie wiersza Excel
- Łączenie instrukcji z rekordu głównego i wiersza Excel
- Śledzenie źródła importu w komentarzach
- Pełna obsługa błędów z informacją dla użytkownika

**Oczekiwany format pliku Excel:**
```
| URL                          | Instrukcje (opcjonalnie)        |
|------------------------------|----------------------------------|
| https://poltel.com/produkt1  | Użyj formalnego tonu            |
| https://poltel.com/produkt2  |                                 |
| https://poltel.com/produkt3  | Dodaj FAQ o gwarancji           |
```

---

### 2. POLTEL - Export Airtable to Excel v2 (ZAKTUALIZOWANY)

**Plik:** `POLTEL - Export Airtable to Excel v2.json`

**Cel:** Eksport gotowych opisów do natywnego pliku Excel z widocznym linkiem w interfejsie.

**Przepływ:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Webhook/Manual Trigger                                                      │
│         │                                                                    │
│         ▼                                                                    │
│  Search Export Request (Status = "Eksportuj dane do pliku")                 │
│         │                                                                    │
│         ▼                                                                    │
│  Create Spreadsheet (Google Sheets - tymczasowy)                            │
│         │                                                                    │
│         ▼                                                                    │
│  Fetch Done Records (Status = "Zrobione")                                   │
│         │                                                                    │
│         ▼                                                                    │
│  Check Has Records ──────────────────────┐                                  │
│         │ TAK                            │ NIE                               │
│         ▼                                ▼                                   │
│  Prepare Export Data              Update - No Records Error                 │
│  (URL, Nazwa produktu,            (Status = "Błąd")                         │
│   Opis rozszerzony,                                                         │
│   Data utworzenia)                                                          │
│         │                                                                    │
│         ▼                                                                    │
│  Create Excel File (.xlsx)                                                   │
│         │                                                                    │
│         ▼                                                                    │
│  Upload to Google Drive                                                      │
│         │                                                                    │
│         ▼                                                                    │
│  Share File (anyone with link)                                              │
│         │                                                                    │
│         ▼                                                                    │
│  Update Export Status                                                        │
│  (Status = "Plik eksportu wysłany")                                         │
│  (Opis rozszerzony = linki do pliku)  ← WIDOCZNE W INTERFEJSIE             │
│  (Uwagi = "Wyeksportowano X rekordów")                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Ulepszenia względem v1:**
- Eksport do natywnego pliku .xlsx (nie tylko Google Sheets)
- Link do pliku zapisywany w polu "Opis rozszerzony" - widoczny w interfejsie
- Dodatkowe kolumny: Nazwa produktu, Data utworzenia
- Lepsza obsługa błędów (brak rekordów do eksportu)
- Informacja o liczbie wyeksportowanych rekordów

---

## Pełny przepływ danych z perspektywy użytkownika

### Scenariusz 1: Pojedynczy URL

```
1. Użytkownik w Poltel Hub wybiera "Pojedynczy URL"
2. Wprowadza URL produktu i opcjonalne instrukcje
3. System tworzy rekord z Status = "Generuj opis"
4. Workflow v1.1 przetwarza rekord:
   - Pobiera HTML
   - Generuje opis przez Perplexity
   - Aktualizuje Status = "Zrobione"
5. Użytkownik widzi wynik w interfejsie
```

### Scenariusz 2: Import z Excel (NOWY)

```
1. Użytkownik w Poltel Hub wybiera "Import z Excel"
2. Wgrywa plik Excel z adresami URL
3. System tworzy rekord z Status = "Przetwórz plik Excel"
4. Nowy workflow importu:
   - Pobiera plik Excel z Airtable
   - Parsuje wiersze
   - Tworzy osobne rekordy dla każdego URL (Status = "Generuj opis")
   - Aktualizuje oryginalny rekord (Status = "Plik przetworzony")
5. Workflow v1.1 przetwarza każdy utworzony rekord
6. Użytkownik widzi postęp wszystkich produktów w interfejsie
```

### Scenariusz 3: Eksport do Excel

```
1. Użytkownik klika "Eksportuj do Excel" w interfejsie
2. System tworzy rekord z Status = "Eksportuj dane do pliku"
3. Zaktualizowany workflow eksportu:
   - Pobiera wszystkie rekordy ze statusem "Zrobione"
   - Tworzy plik .xlsx
   - Uploaduje na Google Drive
   - Zapisuje link w polu "Opis rozszerzony"
   - Aktualizuje Status = "Plik eksportu wysłany"
4. Użytkownik widzi link do pobrania w interfejsie
```

---

## Wymagania do wdrożenia

### Konfiguracja n8n

1. **Import workflow:**
   - Zaimportuj `POLTEL - Import Excel to Airtable.json`
   - Zaimportuj `POLTEL - Export Airtable to Excel v2.json`

2. **Credentials (już skonfigurowane):**
   - Airtable Personal Access Token
   - Google Sheets OAuth2
   - Google Drive OAuth2

3. **Aktywacja:**
   - Ustaw `"active": true` w obu workflow
   - Skonfiguruj triggery (Schedule lub pozostaw Webhook)

### Opcjonalne: Schedule Trigger

Zamiast Webhook można użyć Schedule Trigger do automatycznego sprawdzania:

```json
{
  "parameters": {
    "rule": {
      "interval": [{ "field": "minutes", "minutesInterval": 5 }]
    }
  },
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.2,
  "position": [0, 0],
  "id": "schedule-trigger",
  "name": "Every 5 minutes"
}
```

---

## Statusy w systemie

| Status | Opis | Workflow |
|--------|------|----------|
| `Generuj opis` | Rekord czeka na generowanie opisu | Generator v1.1 |
| `Przetwórz plik Excel` | Plik Excel czeka na przetworzenie | Import Excel |
| `W toku` | Trwa generowanie opisu | Generator v1.1 |
| `Zrobione` | Opis wygenerowany pomyślnie | - |
| `Błąd` | Błąd podczas generowania opisu | Generator v1.1 |
| `Błąd pliku` | Błąd podczas importu pliku Excel | Import Excel |
| `Plik przetworzony` | Excel przetworzony, rekordy utworzone | Import Excel |
| `Eksportuj dane do pliku` | Żądanie eksportu | Export v2 |
| `Plik eksportu wysłany` | Eksport zakończony, link dostępny | Export v2 |

---

## Uwagi implementacyjne

1. **Kompatybilność wsteczna:** Nowe workflow nie wpływają na istniejący Generator v1.1

2. **Obsługa błędów:** Każdy workflow ma pełną obsługę błędów z informacją dla użytkownika

3. **Śledzenie:** Komentarze w rekordach śledzą źródło importu i liczbę przetworzonych elementów

4. **Elastyczność Excel:** Import obsługuje różne nazwy kolumn (URL, Link, Adres URL, itp.)
