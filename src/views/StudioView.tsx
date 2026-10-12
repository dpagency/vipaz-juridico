import React, { useState } from 'react';
import { inspectStudioStructure, renderStudioDocx, type StudioParagraph, type StudioMarker } from '../services/studioTemplateEngine';

const exampleData = {
  processo: { numero: '0000000-00.2026.8.00.0000' },
  partes: { parte_adversa: 'PARTE FICTÍCIA' },
  flags: { tutela_indef: true },
  custom_texts: { tutela_indef_paragrafos: ['Primeiro parágrafo fictício.', 'Segundo parágrafo fictício.'] },
};

export function StudioView() {
  const [file, setFile] = useState<File | null>(null);
  const [markers, setMarkers] = useState<StudioMarker[]>([]);
  const [paragraphs, setParagraphs] = useState<StudioParagraph[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const [filter, setFilter] = useState('');
  const [selectedMarker, setSelectedMarker] = useState('');
  const [json, setJson] = useState(JSON.stringify(exampleData, null, 2));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function openTemplate(selected: File | undefined) {
    if (!selected) return;
    setBusy(true); setStatus('');
    try {
      const inspection = await inspectStudioStructure(selected);
      setMarkers(inspection.markers); setParagraphs(inspection.paragraphs); setTableCount(inspection.tables); setFile(selected);
      setStatus(inspection.markers.length + ' marcadores encontrados. Revise os campos antes de exportar.');
    } catch (error) {
      setFile(null); setMarkers([]); setParagraphs([]); setTableCount(0);
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
      {file && <p className="text-sm">{file.name} — {markers.length} expressões · {paragraphs.length} parágrafos · {tableCount} tabelas</p>}
      <p className="text-xs opacity-60">Arquivo processado localmente no navegador. Use apenas modelos sem dados pessoais reais durante a homologação.</p>
    </section>
    <div className="grid md:grid-cols-2 gap-5">
      <section className="rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold">2. Placeholders encontrados</h2>
        <input aria-label="Filtrar placeholders" className="w-full rounded-lg border bg-transparent p-2 text-sm" placeholder="Filtrar por nome ou tipo" value={filter} onChange={event => setFilter(event.target.value)} />
        <div className="max-h-96 overflow-auto space-y-2">{markers.filter(marker => (marker.expression + marker.kind).toLowerCase().includes(filter.toLowerCase())).map(marker =>
          <button type="button" onClick={() => setSelectedMarker(marker.expression)} key={marker.expression} className={`block w-full text-left rounded border p-2 text-xs break-all ${selectedMarker === marker.expression ? 'border-cyan-500 bg-cyan-500/10' : ''}`}>
            <code>{'{d.' + marker.expression + '}'}</code>
            <span className="ml-2 opacity-60">{marker.kind} · {marker.count} ocorrência(s)</span>
          </button>)}</div>
      </section>
      <section className="rounded-xl border p-5 space-y-3">
        <label htmlFor="studio-data" className="font-semibold">3. Dados fictícios (JSON)</label>
        <textarea id="studio-data" className="w-full h-96 rounded-lg border bg-transparent p-3 font-mono text-xs" value={json} onChange={event => setJson(event.target.value)} spellCheck={false} />
      </section>
    </div>
    {file && <section className="rounded-xl border p-5 space-y-3">
      <h2 className="font-semibold">4. Estrutura do documento (visualização textual)</h2>
      <p className="text-xs opacity-60">Parágrafos e estilos extraídos do DOCX; esta visualização não reproduz a paginação do Word.</p>
      <div className="max-h-[420px] overflow-auto space-y-2">{paragraphs.filter(p => p.text.trim()).map(p =>
        <div key={p.index} className={`rounded border p-3 text-sm ${selectedMarker && p.markers.includes(selectedMarker) ? 'border-cyan-500 bg-cyan-500/10' : ''}`}>
          <span className="block text-[10px] opacity-50 mb-1">Parágrafo {p.index + 1} · {p.style}</span>
          <span className="whitespace-pre-wrap break-words">{p.text}</span>
        </div>)}</div>
    </section>}
    <button type="button" disabled={!file || busy} onClick={() => void exportDocument()} className="rounded-lg bg-cyan-700 text-white px-5 py-3 font-semibold disabled:opacity-50">
      {busy ? 'Processando…' : '5. Gerar e baixar DOCX'}
    </button>
    {status && <p role="status" className="rounded-lg border p-3 text-sm whitespace-pre-wrap">{status}</p>}
    <p className="text-xs opacity-60">Versão experimental: ainda não há edição visual de posições, tratamento completo de condições nem fidelidade verificada de modelos complexos. Não utilizar com dados reais antes da homologação.</p>
  </div>;
}
