import React, { useState } from 'react';
import { inspectStudioDocx, renderStudioDocx, type StudioMarker } from '../services/studioTemplateEngine';

const exampleData = {
  processo: { numero: '0000000-00.2026.8.00.0000' },
  partes: { parte_adversa: 'PARTE FICTÍCIA' },
  flags: { tutela_indef: true },
  custom_texts: { tutela_indef_paragrafos: ['Primeiro parágrafo fictício.', 'Segundo parágrafo fictício.'] },
};

export function StudioView() {
  const [file, setFile] = useState<File | null>(null);
  const [markers, setMarkers] = useState<StudioMarker[]>([]);
  const [json, setJson] = useState(JSON.stringify(exampleData, null, 2));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function openTemplate(selected: File | undefined) {
    if (!selected) return;
    setBusy(true); setStatus('');
    try {
      const found = await inspectStudioDocx(selected);
      setMarkers(found); setFile(selected);
      setStatus(found.length + ' marcadores encontrados. Revise os campos antes de exportar.');
    } catch (error) {
      setFile(null); setMarkers([]);
      setStatus(error instanceof Error ? error.message : 'Falha ao importar DOCX');
    } finally { setBusy(false); }
  }

  async function exportDocument() {
    if (!file) return;
    setBusy(true); setStatus('');
    try {
      const data = JSON.parse(json) as Record<string, unknown>;
      const blob = await renderStudioDocx(file, data);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name.replace(/\.docx$/i, '') + '-preenchido.docx';
      document.body.appendChild(anchor);
      anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus('Documento exportado localmente. Confira o resultado antes do uso jurídico.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao gerar DOCX');
    } finally { setBusy(false); }
  }

  return <div className="max-w-6xl mx-auto px-5 py-8 space-y-6 text-slate-800 dark:text-slate-100">
    <header><h1 className="text-2xl font-bold">VIPAZ Studio — Laboratório de Modelos</h1>
      <p className="text-sm opacity-70">Importação, inspeção e preenchimento experimental de DOCX, sem Carbone ou OpenAI.</p></header>
    <section className="rounded-xl border p-5 space-y-3">
      <h2 className="font-semibold">1. Importar modelo DOCX</h2>
      <input aria-label="Importar modelo DOCX" type="file" accept=".docx" onChange={event => void openTemplate(event.target.files?.[0])} />
      {file && <p className="text-sm">{file.name} — {markers.length} expressões</p>}
    </section>
    <div className="grid md:grid-cols-2 gap-5">
      <section className="rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold">2. Placeholders encontrados</h2>
        <div className="max-h-96 overflow-auto space-y-2">{markers.map(marker =>
          <div key={marker.expression} className="rounded border p-2 text-xs break-all">
            <code>{'{d.' + marker.expression + '}'}</code>
            <span className="ml-2 opacity-60">{marker.kind} · {marker.count} ocorrência(s)</span>
          </div>)}</div>
      </section>
      <section className="rounded-xl border p-5 space-y-3">
        <label htmlFor="studio-data" className="font-semibold">3. Dados fictícios (JSON)</label>
        <textarea id="studio-data" className="w-full h-96 rounded-lg border bg-transparent p-3 font-mono text-xs" value={json} onChange={event => setJson(event.target.value)} spellCheck={false} />
      </section>
    </div>
    <button type="button" disabled={!file || busy} onClick={() => void exportDocument()} className="rounded-lg bg-cyan-700 text-white px-5 py-3 font-semibold disabled:opacity-50">
      {busy ? 'Processando…' : '4. Gerar e baixar DOCX'}
    </button>
    {status && <p role="status" className="rounded-lg border p-3 text-sm whitespace-pre-wrap">{status}</p>}
    <p className="text-xs opacity-60">Versão experimental: ainda não há edição visual de posições, tratamento completo de condições nem fidelidade verificada de modelos complexos. Não utilizar com dados reais antes da homologação.</p>
  </div>;
}
