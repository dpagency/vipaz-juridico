import React, { useRef, useState } from 'react';
import { FilePenLine, FileUp, Upload } from 'lucide-react';
import { StudioVisualEditor } from '../components/StudioVisualEditor';
import { inspectStudioStructure, type StudioParagraph, type StudioMarker } from '../services/studioTemplateEngine';

export function StudioView() {
  const [file, setFile] = useState<File | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [markers, setMarkers] = useState<StudioMarker[]>([]);
  const [paragraphs, setParagraphs] = useState<StudioParagraph[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function openTemplate(selected: File | undefined) {
    if (!selected) return;
    if (!/\.docx$/i.test(selected.name)) { setStatus('Selecione um documento DOCX válido.'); return; }
    setBusy(true); setStatus('');
    try {
      const inspection = await inspectStudioStructure(selected);
      setMarkers(inspection.markers); setParagraphs(inspection.paragraphs); setTableCount(inspection.tables); setFile(selected);
      setStatus('Documento carregado. Clique em um bloco para configurar suas propriedades.');
    } catch (error) {
      setFile(null); setMarkers([]); setParagraphs([]); setTableCount(0);
      setStatus(error instanceof Error ? error.message : 'Falha ao importar DOCX');
    } finally { setBusy(false); }
  }

  return <div className="max-w-6xl mx-auto px-5 py-8 space-y-6 text-slate-800 dark:text-slate-100">
    {file && <header><h1 className="text-2xl font-bold">VIPAZ Studio — Composição de Modelos</h1>
      <p className="text-sm opacity-70">Importação, inspeção e preenchimento experimental de DOCX, com motor documental próprio em desenvolvimento.</p></header>}
    {!file ? <section className="min-h-[65vh] flex items-center justify-center py-8">
      <div className="w-full max-w-3xl rounded-[24px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3"><FilePenLine className="h-5 w-5 text-cyan-700 dark:text-cyan-400" /><h1 className="text-xl font-semibold">VIPAZ Studio</h1></div>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs">Nova peça-modelo</span>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40 px-5 py-12 sm:py-16 flex flex-col items-center text-center gap-4"
          onDragOver={event => event.preventDefault()}
          onDrop={event => { event.preventDefault(); const dropped = event.dataTransfer.files?.[0]; if (dropped) void openTemplate(dropped); }}>
          <div className="rounded-xl bg-white dark:bg-slate-800 p-3 shadow-sm"><FileUp className="h-8 w-8 text-cyan-700 dark:text-cyan-400" /></div>
          <h2 className="text-2xl font-semibold">Comece com seu documento</h2>
          <p className="max-w-md text-sm sm:text-base text-slate-500 dark:text-slate-400">Importe uma peça jurídica em formato DOCX para abrir o editor visual.</p>
          <input ref={uploadRef} className="sr-only" aria-label="Selecionar documento DOCX" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => { void openTemplate(event.target.files?.[0]); event.target.value = ''; }} />
          <button type="button" disabled={busy} onClick={() => uploadRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-slate-950 dark:bg-cyan-700 px-6 py-3 font-semibold text-white hover:bg-slate-800 dark:hover:bg-cyan-600 disabled:opacity-50">
            <Upload className="h-4 w-4" />{busy ? 'Importando documento…' : 'Importar documento DOCX'}
          </button>
          <span className="text-xs text-slate-400">Ou arraste o arquivo para esta área</span>
        </div>
      </div>
    </section> : <section className="rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold">Modelo DOCX</h2><p className="text-sm opacity-70 break-all">{file.name} · {paragraphs.length} parágrafos · {tableCount} tabelas</p></div>
      <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm">Trocar documento<input className="sr-only" type="file" accept=".docx" onChange={event => { void openTemplate(event.target.files?.[0]); event.target.value = ''; }}/></label>
    </section>}
    {file && <StudioVisualEditor key={"visual-" + file.name + file.size + file.lastModified} filename={file.name} markers={markers} paragraphs={paragraphs} />}
    {status && <p role="status" className="rounded-lg border p-3 text-sm whitespace-pre-wrap">{status}</p>}
    {file && <p className="text-xs opacity-60">Editor visual em desenvolvimento. A configuração ainda não gera automaticamente peças no Delivery.</p>}
  </div>;
}
