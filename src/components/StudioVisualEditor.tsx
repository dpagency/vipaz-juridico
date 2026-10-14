import React, { useEffect, useMemo, useState } from 'react';
import type { StudioMarker, StudioParagraph } from '../services/studioTemplateEngine';

type FieldType = 'text' | 'checkbox' | 'select' | 'condition' | 'ai' | 'repeat';
type Binding = { id: string; type: FieldType; label: string; path: string; paragraphIndex: number; instructions: string; options: string[] };
type Saved = { schemaVersion: 2; template: string; bindings: Binding[] };
const types: Array<{ type: FieldType; title: string; hint: string }> = [
  { type: 'text', title: 'Texto / dado processual', hint: 'Preenchimento no Delivery' },
  { type: 'checkbox', title: 'Marcação', hint: 'Sim ou não' },
  { type: 'select', title: 'Seleção', hint: 'Alternativas configuráveis' },
  { type: 'condition', title: 'Condição', hint: 'Controla trecho da peça' },
  { type: 'ai', title: 'IA assistida', hint: 'Texto sujeito a revisão' },
  { type: 'repeat', title: 'Repetição', hint: 'Lista de itens ou parágrafos' },
];
const safePath = (path: string) => /^[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*$/.test(path) && !path.split('.').some(x => ['constructor', '__proto__', 'prototype'].includes(x));
const section = (p: StudioParagraph) => /^\s*(?:\d+(?:\.\d+)*[.)]?|[IVXLCDM]+[.)])\s+/.test(p.text) || /heading|title|titulo/i.test(p.style);
const download = (name: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export function StudioVisualEditor({ filename, paragraphs, markers }: { filename: string; paragraphs: StudioParagraph[]; markers: StudioMarker[] }) {
  const storageKey = 'vipaz-studio-visual-v2:' + filename;
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Saved;
        if (parsed.schemaVersion === 2 && parsed.template === filename && Array.isArray(parsed.bindings)) setBindings(parsed.bindings.filter(b => safePath(b.path) && paragraphs.some(p => p.index === b.paragraphIndex)));
      }
    } catch { setMessage('Não foi possível recuperar o rascunho local.'); }
  }, [storageKey, filename, paragraphs]);
  const headings = useMemo(() => paragraphs.filter(p => section(p) && p.text.trim().length < 180), [paragraphs]);
  const visible = selectedSection === null ? paragraphs : paragraphs.filter(p => {
    const next = headings.find(h => h.index > selectedSection);
    return p.index >= selectedSection && (!next || p.index < next.index);
  });
  const selected = bindings.find(b => b.id === active);
  const add = (type: FieldType, paragraphIndex: number, path?: string) => {
    const p = paragraphs.find(item => item.index === paragraphIndex);
    if (!p) return;
    const id = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const value = path && safePath(path) ? path : 'campos.campo_' + id.replace(/-/g, '_');
    const item: Binding = { id, type, label: types.find(t => t.type === type)?.title || 'Campo', path: value, paragraphIndex, instructions: '', options: type === 'select' ? ['Opção 1', 'Opção 2'] : [] };
    setBindings(old => [...old, item]); setActive(id);
    setMessage('Componente vinculado ao parágrafo ' + (paragraphIndex + 1) + '.');
  };
  const update = (patch: Partial<Binding>) => setBindings(old => old.map(b => b.id === active ? { ...b, ...patch } : b));
  const save = () => {
    if (bindings.some(b => !safePath(b.path))) { setMessage('Corrija os caminhos de dados antes de salvar.'); return; }
    try { window.localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 2, template: filename, bindings } satisfies Saved)); setMessage('Rascunho salvo neste navegador.'); }
    catch { setMessage('Não foi possível salvar no navegador. Exporte o JSON.'); }
  };
  const exportJson = () => download(filename.replace(/\.docx$/i, '') + '-mapa-visual.json', JSON.stringify({ schemaVersion: 2, template: filename, bindings } satisfies Saved, null, 2));
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Saved;
      if (data.schemaVersion !== 2 || data.template !== filename || !Array.isArray(data.bindings)) throw new Error('Mapa incompatível com este DOCX.');
      if (data.bindings.some(b => !safePath(b.path) || !paragraphs.some(p => p.index === b.paragraphIndex) || !types.some(t => t.type === b.type))) throw new Error('Mapa contém componentes inválidos.');
      setBindings(data.bindings); setActive(null); setMessage('Mapa visual importado.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Falha ao importar mapa.'); }
  };
  return <section className="rounded-xl border p-4 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-bold text-xl">Editor visual de composição</h2><p className="text-xs opacity-70">Arraste um campo para um parágrafo ou clique em um marcador existente para vinculá-lo.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} className="rounded border px-3 py-2 text-sm">Salvar rascunho</button>
        <button type="button" onClick={exportJson} className="rounded bg-cyan-700 px-3 py-2 text-sm text-white">Exportar mapa</button>
        <label className="rounded border px-3 py-2 text-sm cursor-pointer">Importar mapa<input className="sr-only" type="file" accept=".json" onChange={e => void importJson(e.target.files?.[0])} /></label>
      </div>
    </header>
    <div className="grid gap-3 lg:grid-cols-[minmax(150px,1fr)_minmax(180px,1.1fr)_minmax(0,2.5fr)]">
      <aside className="rounded-lg border p-3 space-y-2 min-w-0">
        <h3 className="font-semibold text-sm">A. Estrutura</h3>
        <button type="button" onClick={() => setSelectedSection(null)} className="block w-full text-left text-xs rounded border p-2">Documento completo</button>
        <div className="max-h-[560px] overflow-auto space-y-1">{headings.map(h => <button key={h.index} type="button" onClick={() => setSelectedSection(h.index)} className={'block w-full text-left text-xs rounded p-2 break-words ' + (selectedSection === h.index ? 'bg-cyan-500/15 border border-cyan-500' : 'border')} title={h.text}>{h.text}</button>)}</div>
      </aside>
      <aside className="rounded-lg border p-3 space-y-2 min-w-0">
        <h3 className="font-semibold text-sm">B. Componentes</h3>
        {types.map(t => <div key={t.type} draggable onDragStart={e => e.dataTransfer.setData('application/x-vipaz-field', t.type)} className="rounded-lg border p-3 cursor-grab" title="Arraste para a peça">
          <strong className="block text-xs">{t.title}</strong><span className="text-[11px] opacity-60">{t.hint}</span>
        </div>)}
        <h4 className="font-semibold text-xs pt-2">Marcadores encontrados</h4>
        <div className="max-h-48 overflow-auto space-y-1">{markers.map(m => <div key={m.expression} draggable onDragStart={e => e.dataTransfer.setData('application/x-vipaz-marker', m.expression)} className="border rounded p-2 text-[11px] break-all cursor-grab" title="Arraste o marcador para o parágrafo">{m.path}</div>)}</div>
      </aside>
      <main className="rounded-lg border p-3 min-w-0">
        <h3 className="font-semibold text-sm mb-2">C. Peça-modelo <span className="font-normal opacity-60">· {visible.length} parágrafos</span></h3>
        <div className="max-h-[700px] overflow-auto bg-slate-100 dark:bg-slate-900 p-3 sm:p-5 space-y-2">
          {visible.map(p => <div key={p.index} onDragOver={e => e.preventDefault()} onDrop={e => {
            e.preventDefault();
            const marker = e.dataTransfer.getData('application/x-vipaz-marker');
            const type = e.dataTransfer.getData('application/x-vipaz-field') as FieldType;
            if (marker) {
              const match = markers.find(m => m.expression === marker);
              if (match) add(match.kind === 'conditional' ? 'condition' : match.kind === 'repeat' ? 'repeat' : 'text', p.index, match.path);
            } else if (types.some(t => t.type === type)) add(type, p.index);
          }} className="bg-white text-slate-900 rounded border border-dashed border-slate-300 p-3 hover:border-cyan-500">
            <span className="block text-[10px] text-slate-400">Parágrafo {p.index + 1} · {p.style}</span>
            <p className={'whitespace-pre-wrap break-words text-sm ' + (section(p) ? 'font-bold' : '')}>{p.text || 'Espaço vazio'}</p>
            {bindings.filter(b => b.paragraphIndex === p.index).map(b => <button key={b.id} type="button" onClick={() => setActive(b.id)} className={'inline-block mr-1 mt-2 rounded border px-2 py-1 text-xs ' + (active === b.id ? 'border-cyan-600 bg-cyan-100' : 'bg-slate-50')}>{b.label}</button>)}
          </div>)}
        </div>
      </main>
    </div>
    {selected && <div className="rounded-lg border border-cyan-500/50 p-4 grid sm:grid-cols-2 gap-3">
      <h3 className="font-semibold sm:col-span-2">Propriedades do componente</h3>
      <label className="text-sm">Nome no Delivery<input className="block w-full mt-1 rounded border bg-transparent p-2" value={selected.label} onChange={e => update({ label: e.target.value })}/></label>
      <label className="text-sm">Caminho dos dados<input className="block w-full mt-1 rounded border bg-transparent p-2" value={selected.path} onChange={e => update({ path: e.target.value })}/></label>
      {selected.type === 'select' && <label className="text-sm sm:col-span-2">Alternativas (uma por linha)<textarea className="block w-full mt-1 rounded border bg-transparent p-2" rows={3} value={selected.options.join('\n')} onChange={e => update({ options: e.target.value.split('\n').filter(Boolean) })}/></label>}
      <label className="text-sm sm:col-span-2">Regra / instrução para composição<textarea className="block w-full mt-1 rounded border bg-transparent p-2" rows={3} value={selected.instructions} onChange={e => update({ instructions: e.target.value })}/></label>
      <div className="sm:col-span-2"><button type="button" onClick={() => { setBindings(old => old.filter(b => b.id !== selected.id)); setActive(null); }} className="text-red-600 text-sm">Remover vínculo</button></div>
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <p className="text-xs opacity-60">A visualização é textual e não substitui a paginação do Word. Os vínculos são armazenados como mapa de composição; a inserção de novos marcadores no DOCX, a persistência no Supabase e a geração pelo Delivery exigem etapas próprias.</p>
  </section>;
}
