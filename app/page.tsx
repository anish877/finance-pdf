'use client';

import { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

type Row = Record<string, string | number | null | undefined>;

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (incoming: FileList | File[]) => {
    const pdfs = Array.from(incoming).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...pdfs.filter((f) => !seen.has(f.name + f.size))];
    });
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, []);

  const parse = async () => {
    if (!files.length) return;
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const res = await fetch('/api/parse', { method: 'POST', body: fd });
      const data = await res.json();
      setRows((prev) => [...prev, ...(data.rows ?? [])]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
    // Put _file first, _error last
    const all = Array.from(set);
    return [
      ...(all.includes('_file') ? ['_file'] : []),
      ...all.filter((k) => k !== '_file' && k !== '_error').sort(),
      ...(all.includes('_error') ? ['_error'] : []),
    ];
  }, [rows]);

  const exportXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(rows, { header: columns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CBE-XIII');
    XLSX.writeFile(wb, `cbe-xiii-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(rows, { header: columns });
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cbe-xiii-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-semibold">CBE-XIII PDF → Spreadsheet</h1>
      <p className="mt-1 text-sm text-slate-600">
        Drop one or more Courier Bill of Entry (CBE-XIII) PDFs. Each becomes a row; fields are columns.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-6 rounded-lg border-2 border-dashed p-10 text-center transition ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'
        }`}
      >
        <p className="text-slate-700">Drag &amp; drop PDFs here</p>
        <p className="text-sm text-slate-500">or</p>
        <label className="mt-2 inline-block cursor-pointer rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
          Choose files
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-4 rounded border bg-white p-4">
          <div className="mb-2 text-sm font-medium">Queued ({files.length})</div>
          <ul className="max-h-40 space-y-1 overflow-auto text-sm text-slate-700">
            {files.map((f, i) => (
              <li key={i} className="flex justify-between">
                <span className="truncate">{f.name}</span>
                <button
                  className="ml-2 text-slate-400 hover:text-red-600"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={parse}
            disabled={loading}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Parsing…' : `Parse ${files.length} file${files.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">{rows.length} row{rows.length === 1 ? '' : 's'} parsed</div>
            <div className="flex gap-2">
              <button onClick={exportXlsx} className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700">
                Download .xlsx
              </button>
              <button onClick={exportCsv} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
                Download .csv
              </button>
              <button onClick={() => setRows([])} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
                Clear
              </button>
            </div>
          </div>
          <div className="overflow-auto rounded border bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="whitespace-nowrap border-b px-2 py-2 text-left font-medium text-slate-700">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="even:bg-slate-50">
                    {columns.map((c) => (
                      <td key={c} className="whitespace-nowrap border-b px-2 py-1.5 align-top">
                        {String(r[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
