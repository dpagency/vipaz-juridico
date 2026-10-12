import React, { useState } from 'react';
import { groupStudioLegalSections, inspectStudioStructure, renderStudioDocx, setStudioDataPath, validateStudioData, type StudioParagraph, type StudioMarker } from '../services/studioTemplateEngine';

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
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  const [json, setJson] = useState(JSON.stringify(exampleData, null, 2));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

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

  const parsedData = (() => { try { const value: unknown = JSON.parse(json); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { return null; } })();
  const validation = parsedData ? validateStudioData(markers, parsedData) : null;
  const selected = markers.find(marker => marker.expression === selectedMarker);
  function updateSelectedValue(value: string) {
    if (!selected || !parsedData || selected.kind !== 'field') return;
    try { setJson(JSON.stringify(setStudioDataPath(parsedData, selected.path, value), null, 2)); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Campo inválido'); }
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
    {selectedMarker && <section className="rounded-xl border border-cyan-500/40 p-4 space-y-2">
      <h2 className="font-semibold">Configuração do campo selecionado</h2>
      <code className="block text-xs break-all">{'{d.' + selectedMarker + '}'}</code>
      <label className="block text-xs">Descrição funcional / regra de preenchimento (rascunho local)</label>
      <textarea aria-label="Descrição do placeholder" className="w-full rounded-lg border bg-transparent p-2 text-sm" rows={2} value={fieldNotes[selectedMarker] || ''} onChange={event => setFieldNotes(previous => ({ ...previous, [selectedMarker]: event.target.value }))} />
      {selected?.kind === 'field' && <label className="block text-xs">Valor fictício vinculado ao campo<input aria-label="Valor do placeholder" className="mt-1 block w-full rounded-lg border bg-transparent p-2 text-sm" value={selected.path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, parsedData || {}) as string || ''} onChange={event => updateSelectedValue(event.target.value)} /></label>}
      {selected?.kind !== 'field' && <p className="text-sm text-amber-600">Condição ou repetição Carbone: requer migração e homologação; geração bloqueada.</p>}
      <p className="text-xs opacity-60">Anotações não persistidas; a edição modifica apenas os dados fictícios, não as posições do modelo.</p>
    </section>}
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
    {file && <section className="rounded-xl border p-5 space-y-2">
      <button type="button" onClick={() => setPreview(value => !value)} className="rounded-lg border px-4 py-2 text-sm">{preview ? 'Ocultar pré-visualização' : 'Pré-visualizar substituições'}</button>
      {preview && <div className="max-h-72 overflow-auto space-y-2">{paragraphs.filter(p => p.text.trim()).map(p => {
        const text = p.text.replace(/\{d\.([^{}]+)\}/g, (_match, expression: string) => {
          const path = expression.split(':')[0];
          const value = path.split('.').reduce<unknown>((v, key) => v && typeof v === 'object' ? (v as Record<string, unknown>)[key] : undefined, parsedData || {});
          return value === undefined ? '[CAMPO AUSENTE]' : typeof value === 'object' ? '[EXPRESSÃO NÃO HOMOLOGADA]' : String(value);
        });
        return <p key={p.index} className="text-sm whitespace-pre-wrap border-b pb-2">{text}</p>;
      })}</div>}
      <p className="text-xs opacity-60">Prévia textual, não representa a diagramação final; condições e repetições permanecem bloqueadas.</p>
    </section>}
    {file && <section className="rounded-xl border p-5 space-y-2">
      <h2 className="font-semibold">Validação prévia do modelo</h2>
      {!parsedData && <p role="alert" className="text-red-600 text-sm">JSON inválido: corrija os dados antes de gerar.</p>}
      {validation && <p className="text-sm">{validation.available.length} campos preenchidos · {validation.missing.length} ausentes · {validation.unsupported.length} expressões não homologadas</p>}
      {validation?.missing.map(path => <p key={path} className="text-xs text-red-600">Campo obrigatório sem valor: {path}</p>)}
      {validation?.unsupported.map(path => <p key={path} className="text-xs text-amber-600">Expressão não homologada: {path}</p>)}
      <p className="text-xs opacity-60">Teses e pedidos identificados nos parágrafos exigem revisão humana; nenhuma tese é ativada automaticamente.</p>
    </section>}
    {file && <section className="rounded-xl border p-5 space-y-3">
      <h2 className="font-semibold">Estrutura jurídica sugerida (revisão obrigatória)</h2>
      <p className="text-xs opacity-60">Classificação heurística por títulos; não representa validação de teses nem pedidos.</p>
      <div className="max-h-64 overflow-auto space-y-2">{groupStudioLegalSections(paragraphs).map(section =>
        <div key={section.heading.index} className="rounded border p-2 text-sm"><span className="font-medium">{section.heading.text}</span><span className="ml-2 text-xs opacity-60">{section.category} · {section.paragraphs.length} parágrafos</span></div>)}</div>
    </section>}
    {file && <section className="rounded-xl border p-5 space-y-3">
      <h2 className="font-semibold">4. Estrutura do documento (visualização textual)</h2>
      <p className="text-xs opacity-60">Parágrafos e estilos extraídos do DOCX; esta visualização não reproduz a paginação do Word.</p>
      <div className="max-h-[420px] overflow-auto space-y-2">{paragraphs.filter(p => p.text.trim()).map(p =>
        <div key={p.index} className={`rounded border p-3 text-sm ${selectedMarker && p.markers.includes(selectedMarker) ? 'border-cyan-500 bg-cyan-500/10' : ''}`}>
          <span className="block text-[10px] opacity-50 mb-1">Parágrafo {p.index + 1} · {p.style}</span>
          <span className="whitespace-pre-wrap break-words">{p.text}</span>
        </div>)}</div>
    </section>}
    <button type="button" disabled={!file || busy || !validation || validation.missing.length > 0 || validation.unsupported.length > 0} onClick={() => void exportDocument()} className="rounded-lg bg-cyan-700 text-white px-5 py-3 font-semibold disabled:opacity-50">
      {busy ? 'Processando…' : '5. Gerar e baixar DOCX'}
    </button>
    {status && <p role="status" className="rounded-lg border p-3 text-sm whitespace-pre-wrap">{status}</p>}
    <p className="text-xs opacity-60">Versão experimental: ainda não há edição visual de posições, tratamento completo de condições nem fidelidade verificada de modelos complexos. Não utilizar com dados reais antes da homologação.</p>
  </div>;
}
