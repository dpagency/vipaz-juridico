import React, { useRef, useState } from 'react';
import { FilePenLine, FileUp, Upload } from 'lucide-react';
import { StudioVisualEditor, type StudioCompositionMap } from '../components/StudioVisualEditor';
import { inspectStudioStructure, type StudioParagraph, type StudioMarker } from '../services/studioTemplateEngine';
import type { DocumentType, Organization } from '../types';
import { legalProductionService } from '../services/legalProductionService';
import { WorkspacePage, WorkspacePageHeader } from '../components/WorkspacePage';

export function StudioView({ organization }: { organization: Organization }) {
  const [file, setFile] = useState<File | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [markers, setMarkers] = useState<StudioMarker[]>([]);
  const [paragraphs, setParagraphs] = useState<StudioParagraph[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [documentType, setDocumentType] = useState<DocumentType>('Contestação');

  async function openTemplate(selected: File | undefined) {
    if (!selected) return;
    if (!/\.docx$/i.test(selected.name)) { setStatus('Selecione um documento DOCX válido.'); return; }
    setBusy(true); setStatus('');
    try {
      const inspection = await inspectStudioStructure(selected);
      setMarkers(inspection.markers); setParagraphs(inspection.paragraphs); setTableCount(inspection.tables); setFile(selected);
      setTemplateName(selected.name.replace(/\.docx$/i, ''));
      setStatus('Documento carregado. Clique em um bloco para configurar suas propriedades.');
    } catch (error) {
      setFile(null); setMarkers([]); setParagraphs([]); setTableCount(0);
      setStatus(error instanceof Error ? error.message : 'Falha ao importar DOCX');
    } finally { setBusy(false); }
  }

  async function persistTemplate(map: StudioCompositionMap, submit: boolean) {
    if (!file || !templateName.trim() || !version.trim()) throw new Error('Informe nome e versão do modelo.');
    setStatus(submit ? 'Enviando modelo para homologação…' : 'Salvando versão do modelo…');
    const saved = await legalProductionService.saveTemplate({ organizationId: organization.id, file, name: templateName, version, documentType, map, submit });
    setStatus(`${saved.name} v${saved.version} ${submit ? 'enviado para homologação' : 'salvo como rascunho'}.`);
  }

  return <WorkspacePage className="text-slate-800 dark:text-slate-100">
    <WorkspacePageHeader
      eyebrow={organization.name}
      title="Studio"
      description="Importe, inspecione e configure visualmente modelos DOCX para os fluxos de produção jurídica."
    />
    {!file ? <section className="flex min-h-[440px] items-center justify-center">
      <div className="w-full max-w-3xl rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3"><FilePenLine className="h-5 w-5 text-cyan-700 dark:text-cyan-400" /><h1 className="text-xl font-semibold">VIPAZ Studio</h1></div>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs">Nova peça-modelo</span>
        </div>
        <div className="rounded-[5px] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40 px-5 py-12 sm:py-16 flex flex-col items-center text-center gap-4"
          onDragOver={event => event.preventDefault()}
          onDrop={event => { event.preventDefault(); const dropped = event.dataTransfer.files?.[0]; if (dropped) void openTemplate(dropped); }}>
          <div className="rounded-xl bg-white dark:bg-slate-800 p-3 shadow-sm"><FileUp className="h-8 w-8 text-cyan-700 dark:text-cyan-400" /></div>
          <h2 className="text-2xl font-semibold">Comece com seu documento</h2>
          <p className="max-w-md text-sm sm:text-base text-slate-500 dark:text-slate-400">Importe uma peça jurídica em formato DOCX para abrir o editor visual.</p>
          <input ref={uploadRef} className="sr-only" aria-label="Selecionar documento DOCX" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => { void openTemplate(event.target.files?.[0]); event.target.value = ''; }} />
          <button type="button" disabled={busy} onClick={() => uploadRef.current?.click()} className="vipaz-button-primary px-6 py-3 disabled:opacity-50">
            <Upload className="h-4 w-4" />{busy ? 'Importando documento…' : 'Importar documento DOCX'}
          </button>
          <span className="text-xs text-slate-400">Ou arraste o arquivo para esta área</span>
        </div>
      </div>
    </section> : <section className="rounded-[5px] border p-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold">Modelo DOCX</h2><p className="text-sm opacity-70 break-all">{file.name} · {paragraphs.length} parágrafos · {tableCount} tabelas</p></div>
      <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm">Trocar documento<input className="sr-only" type="file" accept=".docx" onChange={event => { void openTemplate(event.target.files?.[0]); event.target.value = ''; }}/></label>
    </section>}
    {file && <section className="grid gap-3 rounded-[5px] border p-4 sm:grid-cols-3">
      <label className="text-sm">Nome do modelo<input required className="mt-1 block w-full rounded-[5px] border bg-transparent p-2" value={templateName} onChange={e => setTemplateName(e.target.value)} /></label>
      <label className="text-sm">Versão<input required className="mt-1 block w-full rounded-[5px] border bg-transparent p-2" value={version} onChange={e => setVersion(e.target.value)} /></label>
      <label className="text-sm">Tipo de peça<select className="mt-1 block w-full rounded-[5px] border bg-transparent p-2" value={documentType} onChange={e => setDocumentType(e.target.value as DocumentType)}><option>Contestação</option><option>Recurso Inominado</option><option>Apelação</option><option>Agravo de Instrumento</option><option>Contraminuta de Agravo</option><option>Contrarrazões</option><option>Petição Intermediária</option><option>Outros</option></select></label>
    </section>}
    {file && <StudioVisualEditor key={"visual-" + file.name + file.size + file.lastModified} filename={file.name} markers={markers} paragraphs={paragraphs} onSave={persistTemplate} />}
    {status && <p role="status" className="rounded-lg border p-3 text-sm whitespace-pre-wrap">{status}</p>}
  </WorkspacePage>;
}
