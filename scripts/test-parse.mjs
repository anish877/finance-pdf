import fs from 'node:fs';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Use tsx-style import: require the TS file via a tiny compile step.
// Simpler: compile parseCBE.ts to JS on the fly with esbuild? Avoid extra dep —
// instead we re-implement the import by reading and using node's experimental TS loader.
// To keep this script dep-free, we'll just dynamically require ts-node? No.
// Easier: shell out to npx tsx. But to avoid adding tsx, just read the TS file with
// a minimal hand strip: not worth it. We invoke `npx tsx scripts/test-parse.ts` instead.
console.log('Use the .ts variant: npx tsx scripts/test-parse.ts');
