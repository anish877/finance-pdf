import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { parseCBEText, CBERow, extractPdfText } from '@/lib/parseCBE';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll('files') as File[];
  if (!files.length) {
    return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
  }

  const rows: Array<CBERow & { _file: string; _error?: string }> = [];
  for (const file of files) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const text = await extractPdfText(buf);
      const row = parseCBEText(text);
      rows.push({ _file: file.name, ...row });
    } catch (e: any) {
      rows.push({ _file: file.name, _error: e?.message ?? 'parse failed' });
    }
  }

  return NextResponse.json({ rows });
}
