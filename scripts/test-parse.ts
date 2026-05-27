import fs from 'node:fs';
import { parseCBEText, extractPdfText } from '../lib/parseCBE';

const file = process.argv[2] ?? '/Users/anishsuman/Downloads/1316728.pdf';

(async () => {
  const buf = fs.readFileSync(file);
  const text = await extractPdfText(buf);
  console.log('\n=== RAW TEXT (first 2000 chars) ===\n');
  console.log(text.substring(0, 2000));
  console.log('\n=== PARSED ROW ===\n');
  const row = parseCBEText(text);
  console.log(JSON.stringify(row, null, 2));
})();
