# CBE-XIII PDF → Spreadsheet

Local Next.js app that turns Indian customs **Form CBE-XIII (Courier Bill Of Entry For Dutiable Goods)** PDFs into a spreadsheet. One row per PDF, every field as a column.

No database, no LLM, no auth. Pure regex parsing — assumes all input PDFs share the standard CBE-XIII layout.

## Run

```bash
npm install
npm run dev
# open http://localhost:3000  (or whatever port it logs)
```

Drag PDFs onto the page → click **Parse** → download `.xlsx` or `.csv`.

## Deploy (optional)

Push to a Git repo and import on [vercel.com](https://vercel.com) — works as-is. The parsing API uses the Node.js runtime (not Edge) because `pdf-parse` needs it; this is already configured in [app/api/parse/route.ts](app/api/parse/route.ts).

## Project layout

| Path | Purpose |
|---|---|
| [app/page.tsx](app/page.tsx) | UI: drag-drop, table, Excel/CSV export |
| [app/api/parse/route.ts](app/api/parse/route.ts) | POST endpoint that accepts PDFs |
| [lib/parseCBE.ts](lib/parseCBE.ts) | PDF text extraction + field parser |
| [scripts/test-parse.ts](scripts/test-parse.ts) | CLI for parsing a single PDF locally |

## Test the parser without the UI

```bash
npx tsx scripts/test-parse.ts /path/to/your.pdf
```

Prints the raw extracted text and the parsed JSON row.

## Known limitations

- The PDF text layer sometimes runs adjacent fields together (e.g. multi-line address values come out as `Varun Path- MansarovarJaipurRAJASTHANINDIA302020`). The parser de-hyphenates soft-wraps but cannot recover spaces that were never in the PDF.
- Designed for the exact CBE-XIII layout. A PDF with a different layout will produce missing or wrong values.
- Each PDF is currently parsed as **one row** even if it has multiple items in the `DETAILS OF ITEM` section. Only the first item is captured.
# finance-pdf
