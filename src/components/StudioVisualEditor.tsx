import React, { useEffect, useMemo, useState } from 'react';
import type { StudioMarker, StudioParagraph } from '../services/studioTemplateEngine';

type FieldType = 'text' | 'checkbox' | 'select' | 'condition' | 'ai' | 'repeat';
type Mode = 'required' | 'direct' | 'conditional' | 'combined';
type Condition = { path: string; equals: string };
type Binding = { id: string; type: FieldType; label: string; path: string; paragraphIndex: number; instructions: string; options: string[]; mode?: Mode; conditions?: Condition[]; operator?: 'AND' | 'OR'; range?: { start: number; end: number }; endParagraphIndex?: number };
type Saved = { schemaVersion: 2; template: string; bindings: Binding[] };
const modes: Record<Mode, { label: string; color: string }> = {
  required: { label: 'Inclusão Obrigatória', color: 'border-slate-400 bg-slate-100 text-slate-800' },
  direct: { label: 'Preenchimento Direto', color: 'border-sky-400 bg-sky-100 text-sky-900' },
  conditional: { label: 'Inclusão Condicionada', color: 'border-amber-400 bg-amber-100 text-amber-900' },
  combined: { label: 'Inclusão Combinada', color: 'border-violet-400 bg-violet-100 text-violet-900' },
};
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
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);
  const [pendingRange, setPendingRange] = useState<{ paragraphIndex: number; start: number; end: number } | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [groupStart, setGroupStart] = useState<number | null>(null);
  const [groupEnd, setGroupEnd] = useState<number | null>(null);
  const [showOutline, setShowOutline] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Saved;
        if (parsed.schemaVersion === 2 && parsed.template === filename && Array.isArray(parsed.bindings)) setBindings(parsed.bindings.filter(b => safePath(b.path) && validLocation(b)));
      }
    } catch { setMessage('Não foi possível recuperar o rascunho local.'); }
  }, [storageKey, filename, paragraphs]);
  const headings = useMemo(() => paragraphs.filter(p => section(p) && p.text.trim().length < 180), [paragraphs]);
  const visible = selectedSection === null ? paragraphs : paragraphs.filter(p => {
    const next = headings.find(h => h.index > selectedSection);
    return p.index >= selectedSection && (!next || p.index < next.index);
  });
  const selected = bindings.find(b => b.id === active);
  const selectedMode: Mode = selected?.mode || (selected?.type === 'condition' ? 'conditional' : 'direct');
  const selectParagraph = (index: number, shift = false) => {
    if (shift && groupStart !== null) { setGroupEnd(index); setMessage('Intervalo selecionado. Clique em Agrupar parágrafos.'); return; }
    setGroupStart(index); setGroupEnd(null); setPendingRange(null); setSelectedParagraph(index);
    const existing = bindings.find(b => !b.range && b.paragraphIndex <= index && (b.endParagraphIndex ?? b.paragraphIndex) >= index);
    setActive(existing?.id || null); setModalOpen(true);
  };
  const createGroup = () => {
    if (groupStart === null || groupEnd === null || groupStart === groupEnd) return;
    const start = Math.min(groupStart, groupEnd), end = Math.max(groupStart, groupEnd);
    if (bindings.some(b => !b.range && b.paragraphIndex <= end && (b.endParagraphIndex ?? b.paragraphIndex) >= start)) { setMessage('O intervalo contém um bloco de parágrafo já configurado. Remova-o antes de agrupar.'); return; }
    add('condition', start, undefined, 'required', undefined, end);
    setGroupStart(null); setGroupEnd(null); setModalOpen(true);
  };
  const captureRange = (p: StudioParagraph, element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return;
    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return;
    const before = range.cloneRange(); before.selectNodeContents(element); before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length; const end = start + range.toString().length;
    if (start >= end || end > p.text.length || bindings.some(b => b.paragraphIndex === p.index && b.range && start < b.range.end && end > b.range.start)) { setMessage('Selecione um trecho sem sobreposição com outros blocos internos.'); return; }
    setSelectedParagraph(p.index); setActive(null); setPendingRange({ paragraphIndex: p.index, start, end }); setModalOpen(true);
    setMessage('Trecho selecionado: escolha uma propriedade para criar o bloco interno.');
  };
  const setMode = (mode: Mode) => {
    if (selected) update({ mode, conditions: mode === 'conditional' ? (selected.conditions?.slice(0, 1).length ? selected.conditions.slice(0, 1) : [{ path: 'flags.condicao', equals: 'sim' }]) : mode === 'combined' ? (selected.conditions?.length && selected.conditions.length >= 2 ? selected.conditions : [{ path: 'flags.condicao_a', equals: 'sim' }, { path: 'flags.condicao_b', equals: 'sim' }]) : [] });
    else if (selectedParagraph !== null && mode !== 'required') add('text', selectedParagraph, undefined, mode, pendingRange || undefined);
    else if (mode === 'required') { setPendingRange(null); setMessage('Trecho obrigatório: nenhuma regra adicional necessária.'); }
  };
  const add = (type: FieldType, paragraphIndex: number, path?: string, requestedMode?: Mode, range?: { paragraphIndex: number; start: number; end: number }, endParagraphIndex?: number) => {
    const p = paragraphs.find(item => item.index === paragraphIndex);
    if (!p) return;
    const id = 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    const value = path && safePath(path) ? path : 'campos.campo_' + id.replace(/-/g, '_');
    const item: Binding = { id, type, label: types.find(t => t.type === type)?.title || 'Campo', path: value, paragraphIndex, instructions: '', options: type === 'select' ? ['Opção 1', 'Opção 2'] : [], mode: requestedMode || (type === 'condition' ? 'conditional' : 'direct'), conditions: type === 'condition' || requestedMode === 'conditional' ? [{ path: 'flags.condicao', equals: 'sim' }] : [], operator: 'AND', ...(range ? { range: { start: range.start, end: range.end } } : {}), ...(endParagraphIndex !== undefined ? { endParagraphIndex } : {}) };
    setBindings(old => [...old, item]); setActive(id); setSelectedParagraph(paragraphIndex); setPendingRange(null); setModalOpen(true);
    setMessage('Componente vinculado ao parágrafo ' + (paragraphIndex + 1) + '.');
  };
  const update = (patch: Partial<Binding>) => setBindings(old => old.map(b => b.id === active ? { ...b, ...patch } : b));
  const validLocation = (b: Binding) => paragraphs.some(p => p.index === b.paragraphIndex && (!b.range || (Number.isInteger(b.range.start) && Number.isInteger(b.range.end) && b.range.start >= 0 && b.range.end > b.range.start && b.range.end <= p.text.length)) && (b.endParagraphIndex === undefined || (Number.isInteger(b.endParagraphIndex) && b.endParagraphIndex > b.paragraphIndex && paragraphs.some(q => q.index === b.endParagraphIndex))));
  const save = () => {
    if (bindings.some(b => !safePath(b.path) || (['conditional','combined'].includes(b.mode || '') && ((b.conditions || []).length < (b.mode === 'combined' ? 2 : 1) || (b.conditions || []).some(c => !safePath(c.path) || !c.equals.trim()))))) { setMessage('Corrija os caminhos de dados antes de salvar.'); return; }
    try { window.localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 2, template: filename, bindings } satisfies Saved)); setMessage('Rascunho salvo neste navegador.'); }
    catch { setMessage('Não foi possível salvar no navegador. Exporte o JSON.'); }
  };
  const exportJson = () => download(filename.replace(/\.docx$/i, '') + '-mapa-visual.json', JSON.stringify({ schemaVersion: 2, template: filename, bindings } satisfies Saved, null, 2));
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Saved;
      if (data.schemaVersion !== 2 || data.template !== filename || !Array.isArray(data.bindings)) throw new Error('Mapa incompatível com este DOCX.');
      if (data.bindings.some(b => !safePath(b.path) || !validLocation(b) || !types.some(t => t.type === b.type))) throw new Error('Mapa contém componentes inválidos.');
      setBindings(data.bindings); setActive(null); setMessage('Mapa visual importado.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Falha ao importar mapa.'); }
  };
  const renderText = (p: StudioParagraph) => {
    const spans = bindings.filter(b => b.paragraphIndex === p.index && b.range).sort((a,b) => a.range!.start - b.range!.start);
    const nodes: React.ReactNode[] = []; let cursor = 0;
    spans.forEach(b => { const r = b.range!; if (r.start < cursor) return; nodes.push(p.text.slice(cursor, r.start)); nodes.push(<mark key={b.id} onClick={e => { e.stopPropagation(); setSelectedParagraph(p.index); setPendingRange(null); setActive(b.id); setModalOpen(true); }} className={'rounded px-0.5 cursor-pointer border ' + modes[b.mode || 'direct'].color} title={b.label}>{p.text.slice(r.start, r.end)}</mark>); cursor = r.end; });
    nodes.push(p.text.slice(cursor)); return nodes;
  };
  return <section className="rounded-xl border p-4 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-bold text-xl">Editor visual de composição</h2><p className="text-xs opacity-70">Clique em um bloco ou selecione palavras dentro dele para configurar suas propriedades.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} className="rounded border px-3 py-2 text-sm">Salvar rascunho</button>
        <button type="button" onClick={exportJson} className="rounded bg-cyan-700 px-3 py-2 text-sm text-white">Exportar mapa</button>
        <label className="rounded border px-3 py-2 text-sm cursor-pointer">Importar mapa<input className="sr-only" type="file" accept=".json" onChange={e => void importJson(e.target.files?.[0])} /></label>
      </div>
    </header>
    <div className="flex flex-wrap gap-2 text-xs">{(Object.keys(modes) as Mode[]).map(mode => <span key={mode} className={'rounded-lg border px-3 py-2 ' + modes[mode].color}>{modes[mode].label}</span>)}</div>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setShowOutline(v => !v)} className="rounded border px-3 py-2 text-sm">{showOutline ? 'Ocultar sumário' : 'Mostrar sumário'}</button>
      <span className="text-xs opacity-70">Clique em um parágrafo; Shift + clique em outro para selecionar um intervalo.</span>
      {groupStart !== null && groupEnd !== null && <button type="button" onClick={createGroup} className="rounded bg-cyan-700 px-3 py-2 text-sm text-white">Agrupar parágrafos {Math.min(groupStart, groupEnd)+1}–{Math.max(groupStart, groupEnd)+1}</button>}
    </div>
    <div className="flex gap-3">
      {showOutline && <aside className="w-64 shrink-0 rounded-lg border p-3 space-y-2 min-w-0">
        <h3 className="font-semibold text-sm">Sumário</h3>
        <button type="button" onClick={() => setSelectedSection(null)} className="block w-full text-left text-xs rounded border p-2">Documento completo</button>
        <div className="max-h-[560px] overflow-auto space-y-1">{headings.map(h => <button key={h.index} type="button" onClick={() => setSelectedSection(h.index)} className="block w-full text-left text-xs rounded border p-2 break-words">{h.text}</button>)}</div>
      </aside>}
      <main className="rounded-lg border p-3 min-w-0 flex-1">
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
          }} onClick={e => selectParagraph(p.index, e.shiftKey)} className={'cursor-pointer rounded border-2 p-3 hover:border-cyan-500 ' + (selectedParagraph === p.index ? 'border-cyan-500 ' : 'border-dashed border-slate-300 ') + (bindings.find(b => !b.range && b.paragraphIndex <= p.index && (b.endParagraphIndex ?? b.paragraphIndex) >= p.index) ? modes[bindings.find(b => !b.range && b.paragraphIndex <= p.index && (b.endParagraphIndex ?? b.paragraphIndex) >= p.index)?.mode || 'required'].color : 'bg-white text-slate-900')}>
            <span className="block text-[10px] opacity-70">Parágrafo {p.index + 1} · {p.style} · {bindings.find(b => !b.range && b.paragraphIndex <= p.index && (b.endParagraphIndex ?? b.paragraphIndex) >= p.index) ? modes[bindings.find(b => !b.range && b.paragraphIndex <= p.index && (b.endParagraphIndex ?? b.paragraphIndex) >= p.index)?.mode || 'required'].label : 'Inclusão Obrigatória'}</span>
            <p onMouseUp={e => captureRange(p, e.currentTarget)} className={'whitespace-pre-wrap break-words text-sm select-text ' + (section(p) ? 'font-bold' : '')}>{p.text ? renderText(p) : 'Espaço vazio'}</p>
            {bindings.filter(b => b.paragraphIndex === p.index).map(b => <button key={b.id} type="button" onClick={e => { e.stopPropagation(); setSelectedParagraph(p.index); setActive(b.id); setModalOpen(true); }} className={'inline-block mr-1 mt-2 rounded border px-2 py-1 text-xs ' + (active === b.id ? 'border-cyan-600 bg-cyan-100' : 'bg-slate-50')}>{b.label}</button>)}
          </div>)}
        </div>
      </main>
    </div>
    {modalOpen && selectedParagraph !== null && <div role="presentation" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false); }}><div role="dialog" aria-modal="true" aria-label="Propriedades do bloco" className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xl space-y-4"><div className="flex justify-between items-center"><h2 className="font-semibold">Configurar bloco</h2><button type="button" className="rounded border px-3 py-1" onClick={() => setModalOpen(false)}>Fechar ✕</button></div><div className="grid sm:grid-cols-2 gap-3">
      <h3 className="font-semibold sm:col-span-2">Propriedades · Parágrafo {selectedParagraph + 1}{pendingRange ? ' · Trecho selecionado' : selected?.range ? ' · Bloco interno' : ''}</h3>
      <div className="sm:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-2">{(Object.keys(modes) as Mode[]).map(mode => <button key={mode} type="button" onClick={() => setMode(mode)} className={'rounded-lg border-2 p-3 text-left text-xs font-semibold ' + modes[mode].color + (selectedMode === mode && selected ? ' ring-2 ring-cyan-500' : '')}>{modes[mode].label}</button>)}</div>
      {pendingRange && <p className="sm:col-span-2 text-sm">Trecho: <strong>{paragraphs.find(p => p.index === pendingRange.paragraphIndex)?.text.slice(pendingRange.start, pendingRange.end)}</strong></p>}
      {!selected && <p className="sm:col-span-2 text-sm opacity-70">Este trecho pertence ao documento original e é incluído obrigatoriamente. Escolha outra propriedade para configurar um vínculo.</p>}
    </div>}
    {selected && <div className="rounded-lg border border-cyan-500/50 p-4 grid sm:grid-cols-2 gap-3">
      <h3 className="font-semibold sm:col-span-2">Propriedades do componente {selected.endParagraphIndex !== undefined ? '· Grupo até o parágrafo ' + (selected.endParagraphIndex + 1) : ''}</h3>
      {selected.range && <p className="sm:col-span-2 text-xs opacity-70">Bloco interno: {paragraphs.find(p => p.index === selected.paragraphIndex)?.text.slice(selected.range.start, selected.range.end)}</p>}
      <label className="text-sm">Nome no Delivery<input className="block w-full mt-1 rounded border bg-transparent p-2" value={selected.label} onChange={e => update({ label: e.target.value })}/></label>
      <label className="text-sm">Caminho dos dados<input className="block w-full mt-1 rounded border bg-transparent p-2" value={selected.path} onChange={e => update({ path: e.target.value })}/></label>
      {(selectedMode === 'conditional' || selectedMode === 'combined') && <div className="sm:col-span-2 space-y-2"><h4 className="text-sm font-semibold">Respostas necessárias no Delivery</h4>{selectedMode === 'combined' && <label className="text-sm">Combinação <select className="ml-2 rounded border bg-transparent p-2" value={selected.operator || 'AND'} onChange={e => update({ operator: e.target.value as 'AND' | 'OR' })}><option value="AND">Todas (E)</option><option value="OR">Qualquer uma (OU)</option></select></label>}{(selected.conditions || []).map((condition, i) => <div key={i} className="grid sm:grid-cols-2 gap-2"><label className="text-xs">Campo do Delivery<input className="block w-full rounded border bg-transparent p-2" value={condition.path} onChange={e => update({ conditions: (selected.conditions || []).map((c,j) => j === i ? { ...c, path: e.target.value } : c) })}/></label><label className="text-xs">Resposta esperada<input className="block w-full rounded border bg-transparent p-2" value={condition.equals} onChange={e => update({ conditions: (selected.conditions || []).map((c,j) => j === i ? { ...c, equals: e.target.value } : c) })}/></label></div>)}{selectedMode === 'combined' && <button type="button" className="rounded border px-3 py-2 text-xs" onClick={() => update({ conditions: [...(selected.conditions || []), { path: 'flags.nova_condicao', equals: 'sim' }] })}>+ Adicionar condição</button>}</div>}
      {selected.type === 'select' && <label className="text-sm sm:col-span-2">Alternativas (uma por linha)<textarea className="block w-full mt-1 rounded border bg-transparent p-2" rows={3} value={selected.options.join('\n')} onChange={e => update({ options: e.target.value.split('\n').filter(Boolean) })}/></label>}
      <label className="text-sm sm:col-span-2">Regra / instrução para composição<textarea className="block w-full mt-1 rounded border bg-transparent p-2" rows={3} value={selected.instructions} onChange={e => update({ instructions: e.target.value })}/></label>
      <div className="sm:col-span-2"><button type="button" onClick={() => { setBindings(old => old.filter(b => b.id !== selected.id)); setActive(null); setModalOpen(false); }} className="text-red-600 text-sm">Remover vínculo</button></div>
    </div>}
    {modalOpen && selectedParagraph !== null && </div></div>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <p className="text-xs opacity-60">Os trechos internos são mapeados por posições no texto importado; a aplicação dessas regras ao DOCX original e a geração no Delivery ainda não estão implementadas. A visualização é textual e não substitui a paginação do Word. Os vínculos são armazenados como mapa de composição; a inserção de novos marcadores no DOCX, a persistência no Supabase e a geração pelo Delivery exigem etapas próprias.</p>
  </section>;
}
