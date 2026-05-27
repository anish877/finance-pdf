// CBE-XIII (Courier Bill Of Entry) PDF text → structured row.
//
// Two-stage pipeline:
//   1. extractPdfText(buffer): runs pdf-parse with a custom page renderer
//      that joins adjacent text items with a tab so table columns stay separated.
//      (Default pdf-parse concatenates same-line items with no delimiter,
//       smashing "1 BCD 20 0 0 486" into "1BCD2000486".)
//   2. parseCBEText(text): normalizes whitespace and walks a known label list,
//      slicing each value from a label position to the next.

import pdfParse from 'pdf-parse';

export type CBERow = Record<string, string | number | null>;

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const options = {
    pagerender: async (pageData: any) => {
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      });
      let lastY: number | null = null;
      let out = '';
      for (const item of textContent.items) {
        const y = item.transform[5];
        if (lastY !== null && Math.abs(lastY - y) > 1) {
          out += '\n';
        } else if (out.length && !out.endsWith('\n')) {
          out += '\t'; // separate same-line items
        }
        out += item.str;
        lastY = y;
      }
      return out;
    },
  };
  const parsed = await pdfParse(buffer, options as any);
  return parsed.text;
}

// Labels in the order they appear in the PDF. The parser walks this list and
// for each label takes everything between it and the next label as the value.
const LABELS: Array<{ key: string; label: string; squashWs?: boolean }> = [
  { key: 'status', label: 'Current Status of the CBE' },
  { key: 'courier_registration_number', label: 'Courier Registration Number', squashWs: true },
  { key: 'cbe_xiii_number', label: 'CBE-XIII Number', squashWs: true },
  { key: 'authorized_courier_name', label: 'Name of the Authorized Courier' },
  { key: 'authorized_courier_address', label: 'Address of Authorized Courier' },
  { key: '_igm_anchor', label: 'IGM DETAILS' },
  { key: '_igm_headers', label: 'Airlines Flight No. Airport Of Arrival First Port Of Arrival Date Of Arrival Time Of Arrival' },
  { key: 'airport_of_shipment', label: 'Airport of Shipment' },
  { key: 'country_of_exportation', label: 'Country of Exportation' },
  { key: 'hawb_number', label: 'HAWB Number', squashWs: true },
  { key: 'unique_consignment_number', label: 'Unique Consignment Number', squashWs: true },
  { key: 'consignor_name', label: 'Name of Consignor' },
  { key: 'consignor_address', label: 'Address of Consignor' },
  { key: 'consignee_name', label: 'Name of Consignee' },
  { key: 'consignee_address', label: 'Address of Consignee' },
  { key: 'import_export_code', label: 'Import Export Code', squashWs: true },
  { key: 'iec_branch_code', label: 'IEC Branch Code', squashWs: true },
  { key: 'special_request', label: 'Special Request' },
  { key: 'no_of_packages', label: 'No of Packages' },
  { key: 'gross_weight', label: 'Gross Weight' },
  { key: 'net_weight', label: 'Net Weight' },
  { key: 'assessable_value', label: 'Assessable Value' },
  { key: 'duty_rs', label: 'Duty(Rs.)' },
  { key: 'invoice_value', label: 'Invoice Value' },
  { key: 'case_of_crn', label: 'Case of CRN' },
  { key: 'kyc_document', label: 'KYC Document' },
  { key: 'kyc_id', label: 'KYC ID', squashWs: true },
  { key: 'state_code', label: 'State Code' },
  { key: 'interest_amount', label: 'Interest Amount' },
  { key: 'government_non_government', label: 'Government / Non-Government' },
  { key: 'ad_code', label: 'AD Code', squashWs: true },
  { key: 'import_using_e_commerce', label: 'Import Using e-Commerce' },
  { key: '_crn_anchor', label: 'DETAILS OF CRN' },
  { key: '_item_anchor', label: 'DETAILS OF ITEM' },
  { key: 'license_type', label: 'License Type' },
  { key: 'license_number', label: 'License Number' },
  { key: 'item_ctsh', label: 'CTSH', squashWs: true },
  { key: 'item_cetsh', label: 'CETSH', squashWs: true },
  { key: 'item_country_of_origin', label: 'Country of Origin' },
  { key: 'item_description', label: 'Description of Goods' },
  { key: 'item_manufacturer_name', label: 'Name of Manufacturer' },
  { key: 'item_manufacturer_address', label: 'Address of Manufacturer' },
  { key: 'item_number_of_packages', label: 'Number of Packages' },
  { key: 'item_marks_on_packages', label: 'Marks on Packages' },
  { key: 'item_unit_of_measure', label: 'Unit of Measure' },
  { key: 'item_quantity', label: 'Quantity' },
  { key: 'item_invoice_number', label: 'Invoice Number', squashWs: true },
  { key: 'item_invoice_value', label: 'Invoice Value' },
  { key: 'item_unit_price', label: 'Unit Price' },
  { key: 'item_currency_of_unit_price', label: 'Currency of Unit Price' },
  { key: 'item_currency_of_invoice', label: 'Currency of Invoice' },
  { key: 'item_rate_of_exchange', label: 'Rate of Exchange' },
  { key: 'item_invoice_term', label: 'Invoice Term' },
  { key: 'item_landing_charges', label: 'Landing Charges' },
  { key: 'item_insurance', label: 'Insurance' },
  { key: 'item_freight', label: 'Freight' },
  { key: 'item_discount_amount', label: 'Discount Amount' },
  { key: 'item_currency_of_discount', label: 'Currency of Discount' },
  { key: 'item_assessable_value', label: 'Assessable Value' },
  { key: 'item_duty_rs', label: 'Duty(Rs.)' },
  { key: '_notif_anchor', label: 'NOTIFICATION USED FOR THE ITEM' },
  { key: '_charges_anchor', label: 'CHARGES USED FOR THE ITEM' },
  { key: '_duty_anchor', label: 'DUTY DETAILS' },
  { key: '_payment_anchor', label: 'PAYMENT DETAILS' },
  { key: '_declaration_anchor', label: 'DECLARATION' },
  { key: '_port_anchor', label: 'Port' },
];

function findOccurrencePositions(text: string, label: string): number[] {
  const positions: number[] = [];
  let from = 0;
  while (true) {
    const idx = text.indexOf(label, from);
    if (idx === -1) break;
    positions.push(idx);
    from = idx + label.length;
  }
  return positions;
}

function normalize(raw: string): string {
  let t = raw;
  // Strip page footers like "Page 1 of 2" — they appear mid-document and
  // confuse table parsers (notifications, duty rows).
  t = t.replace(/Page\s+\d+\s+of\s+\d+/gi, ' ');
  // Preserve hyphens in known compound labels before generic soft-wrap removal.
  t = t.replace(/Non-\s+Government/g, 'Non-Government');
  // Soft-wrap de-hyphenation across any whitespace (renderer emits \t or \n
  // between text items). Covers letter-lowercase, ALLCAPS, and mixed-case
  // address wraps like "Path- Mansarovar" → "PathMansarovar".
  t = t.replace(/([A-Za-z])-\s+([a-zA-Z])/g, '$1$2');
  // Collapse all whitespace (incl. injected tabs) to single space.
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function cleanValue(s: string, squashWs?: boolean): string {
  let v = s.trim();
  v = v.replace(/^:\s*/, '').trim();
  if (squashWs) v = v.replace(/\s+/g, '');
  return v;
}

function parseIGMRow(text: string): Record<string, string> {
  const headerLabel = 'Airlines Flight No. Airport Of Arrival First Port Of Arrival Date Of Arrival Time Of Arrival';
  const idx = text.indexOf(headerLabel);
  if (idx === -1) return {};
  const after = text.substring(idx + headerLabel.length);
  const end = after.indexOf('Airport of Shipment');
  const slice = (end === -1 ? after : after.substring(0, end)).trim();
  // "<Airlines ...> <FlightNo e.g. 6E 0854> <Arrival> <FirstPort> <DD/MM/YYYY> <HH:MM>"
  const m = slice.match(/^(.*?)\s+([A-Z0-9]+\s+\d+)\s+([A-Z]{3})\s+([A-Z]{3})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})$/);
  if (!m) return { igm_raw: slice };
  return {
    igm_airlines: m[1].trim(),
    igm_flight_no: m[2].trim(),
    igm_airport_of_arrival: m[3].trim(),
    igm_first_port_of_arrival: m[4].trim(),
    igm_date_of_arrival: m[5].trim(),
    igm_time_of_arrival: m[6].trim(),
  };
}

function parseDutyDetails(text: string): Record<string, string> {
  const start = text.indexOf('DUTY DETAILS');
  const end = text.indexOf('PAYMENT DETAILS');
  if (start === -1 || end === -1) return {};
  const block = text.substring(start, end);
  const out: Record<string, string> = {};
  const heads = ['BCD', 'AIDC', 'SW Srchrg', 'IGST', 'CMPNSTRY'];
  for (const head of heads) {
    const re = new RegExp(`\\d+\\s+${head.replace(/\s/g, '\\s')}\\s+(-?[\\d.]+)\\s+(-?[\\d.]+)\\s+(-?[\\d.]+)\\s+(-?[\\d.]+)`);
    const m = block.match(re);
    const safe = head.toLowerCase().replace(/\s+/g, '_');
    if (m) {
      out[`duty_${safe}_ad_valorem`] = m[1];
      out[`duty_${safe}_specific_rate`] = m[2];
      out[`duty_${safe}_duty_forgon`] = m[3];
      out[`duty_${safe}_duty_amount`] = m[4];
    }
  }
  return out;
}

function parsePayment(text: string): Record<string, string> {
  const start = text.indexOf('PAYMENT DETAILS');
  const end = text.indexOf('DECLARATION');
  if (start === -1) return {};
  const block = text.substring(start, end === -1 ? text.length : end);
  const m = block.match(/\b1\s+(\d{10,})\s+(-?[\d.]+)\s+(\d{2}\/\d{2}\/\d{4})/);
  if (!m) return {};
  return {
    payment_challan_number: m[1],
    payment_total_amount: m[2],
    payment_challan_date: m[3],
  };
}

function parseNotifications(text: string): Record<string, string> {
  const start = text.indexOf('NOTIFICATION USED FOR THE ITEM');
  if (start === -1) return {};
  const afterStart = start + 'NOTIFICATION USED FOR THE ITEM'.length;
  const endIdx = (() => {
    const a = text.indexOf('CHARGES USED FOR THE ITEM', afterStart);
    const b = text.indexOf('DUTY DETAILS', afterStart);
    const candidates = [a, b].filter((x) => x !== -1);
    return candidates.length ? Math.min(...candidates) : text.length;
  })();
  const block = text.substring(afterStart, endIdx);
  const cleaned = block.replace(/Sr\.No\.\s*Notification Number\s*Serial Number of Notification/, '');
  const rows = Array.from(cleaned.matchAll(/(\d+)\s+([\d/]+)\s+(\S+)/g));
  const out: Record<string, string> = {};
  rows.forEach((r, i) => {
    out[`notification_${i + 1}_number`] = r[2];
    out[`notification_${i + 1}_serial`] = r[3];
  });
  out['notification_count'] = String(rows.length);
  return out;
}

function parsePort(text: string): Record<string, string> {
  const m = text.match(/Port\s*:\s*(.+?)\s*Note\s*:\s*This is an electronic copy/);
  return m ? { port: m[1].trim() } : {};
}

export function parseCBEText(rawText: string): CBERow {
  const text = normalize(rawText);

  const occurrenceCounters: Record<string, number> = {};
  type Resolved = { key: string; label: string; squashWs?: boolean; pos: number };
  const resolved: Resolved[] = [];

  for (const entry of LABELS) {
    const count = occurrenceCounters[entry.label] ?? 0;
    const positions = findOccurrencePositions(text, entry.label);
    const pos = positions[count];
    resolved.push({ ...entry, pos: pos ?? -1 });
    if (pos !== undefined) occurrenceCounters[entry.label] = count + 1;
  }

  const row: CBERow = {};
  for (let i = 0; i < resolved.length; i++) {
    const cur = resolved[i];
    if (cur.pos === -1 || cur.key.startsWith('_')) continue;
    let nextPos = text.length;
    for (let j = i + 1; j < resolved.length; j++) {
      if (resolved[j].pos > cur.pos) {
        nextPos = resolved[j].pos;
        break;
      }
    }
    const valueRaw = text.substring(cur.pos + cur.label.length, nextPos);
    row[cur.key] = cleanValue(valueRaw, cur.squashWs);
  }

  Object.assign(row, parseIGMRow(text));
  Object.assign(row, parseNotifications(text));
  Object.assign(row, parseDutyDetails(text));
  Object.assign(row, parsePayment(text));
  Object.assign(row, parsePort(text));

  return row;
}
