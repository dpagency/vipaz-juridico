import React, { useMemo, useState } from 'react';
import type { StudioMarker, StudioParagraph } from '../services/studioTemplateEngine';

type Behavior = 'automatico' | 'manual' | 'condicional' | 'ia_assistida' | 'padronizado';
type Rule = { behavior: Behavior; label: string; instructions: string; enabled: boolean };
const labels: Record<Behavior, string> = {
  automatico: 'Dados do Delivery', manual: 'Preenchimento manual',
  condicional: 'Condição / tese opcional', ia_assistida: 'Redação assistida por IA',
  padronizado: 'Texto aprovado do modelo',
};
function initialRule(marker: StudioMarker): Rule {
  const path = marker.path;
  const behavior: Behavior = marker.kind === 'conditional' || path.startsWith('flags.') ? 'condicional'
    : path.startsWith('custom_texts.') ? 'ia_assistida'
    : path.startsWith('processo.') || path.startsWith('partes.') || path === 'enderecamento' ? 'automatico'
    : marker.kind === 'repeat' ? 'manual' : 'manual';
  return { behavior, label: path.split('.').pop()?.replace(/_/g, ' ') || path, instructions: '', enabled: true };
}
export function StudioModelConfigurator({ markers, paragraphs, filename }: {
  markers: StudioMarker[]; paragraphs: StudioParagraph[]; filename: string;
}) {
  const [rules, setRules] = useState<Record<string, Rule>>({});
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const unique = useMemo(() => [...new Map(markers.map(m => [m.expression, m])).values()], [markers]);
  const configured = (m: StudioMarker) => rules[m.expression] || initialRule(m);
  const update = (expression: string, patch: Partial<Rule>) => {
    const marker = unique.find(m => m.expression === expression);
    if (!marker) return;
    setRules(old => ({ ...old, [expression]: { ...(old[expression] || initialRule(marker)), ...patch } }));
  };
  const exportConfig = () => {
    const payload = {
      schemaVersion: 1, template: filename, purpose: 'contestacao_pme_reajustes',
      workflow: { modelOwner: 'Studio', caseDataOwner: 'Delivery', modelContentApprovedByUser: true },
      fields: unique.map(m => ({ expression: m.expression, path: m.path, occurrences: m.count,
        markerKind: m.kind, ...configured(m) })),
      sections: paragraphs.filter(p => /^\\s*\\d+(?:\\.\\d+)*\\.\\s+/.test(p.text)).map(p => ({ index: p.index, heading: p.text.trim() })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url;
    anchor.download = filename.replace(/\\.docx$/i, '') + '-studio-config.json';
    anchor.click(); URL.revokeObjectURL(url);
    setNotice('Configuração exportada. Os dados do processo serão informados no Delivery.');
  };
  const selectedMarker = unique.find(m => m.expression === selected);
  return <section className="rounded-xl border p-5 space-y-4">
    <header><h2 className="text-lg font-semibold">Configurar peça-modelo PME</h2>
      <p className="text-sm opacity-70">O Studio configura o modelo aprovado; o Delivery receberá os documentos e os dados de cada processo.</p></header>
    <div className="flex flex-wrap gap-3 text-xs">
      <span className="rounded border px-3 py-2">{unique.length} expressões</span>
      <span className="rounded border px-3 py-2">{unique.filter(m => m.kind === 'conditional').length} condições</span>
      <span className="rounded border px-3 py-2">{unique.filter(m => m.kind === 'repeat').length} repetições</span>
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <input aria-label="Buscar campo do modelo" className="w-full rounded border bg-transparent p-2 text-sm" placeholder="Buscar campo ou marcador" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="max-h-80 overflow-auto space-y-1">{unique.filter(m => (m.expression + configured(m).label).toLowerCase().includes(query.toLowerCase())).map(m =>
          <button type="button" key={m.expression} onClick={() => setSelected(m.expression)} className={'w-full text-left rounded border p-2 text-xs ' + (selected === m.expression ? 'border-cyan-500' : '')}>
            <strong className="block">{configured(m).label}</strong>
            <code className="break-all">{m.expression}</code>
            <span className="block opacity-60">{labels[configured(m).behavior]} · {m.count} ocorrência(s)</span>
          </button>)}</div>
      </div>
      <div className="rounded border p-4 space-y-3">
        {selectedMarker ? <>
          <label className="block text-sm">Nome amigável<input className="mt-1 w-full rounded border bg-transparent p-2" value={configured(selectedMarker).label} onChange={e => update(selectedMarker.expression, { label: e.target.value })} /></label>
          <label className="block text-sm">Origem e comportamento<select className="mt-1 w-full rounded border bg-transparent p-2 text-slate-900" value={configured(selectedMarker).behavior} onChange={e => update(selectedMarker.expression, { behavior: e.target.value as Behavior })}>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={configured(selectedMarker).enabled} onChange={e => update(selectedMarker.expression, { enabled: e.target.checked })} /> Habilitar no modelo</label>
          <label className="block text-sm">Orientações para o Delivery ou para a IA<textarea className="mt-1 w-full rounded border bg-transparent p-2" rows={5} value={configured(selectedMarker).instructions} onChange={e => update(selectedMarker.expression, { instructions: e.target.value })} /></label>
          <p className="text-xs opacity-60">Caminho: {selectedMarker.path} · Tipo original: {selectedMarker.kind}</p>
        </> : <p className="text-sm opacity-70">Selecione um marcador para definir seu comportamento na produção da peça.</p>}
      </div>
    </div>
    <button type="button" className="rounded-lg bg-cyan-700 px-4 py-2 text-white font-semibold" onClick={exportConfig}>Exportar configuração do modelo (JSON)</button>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <p className="text-xs opacity-60">Esta etapa registra a configuração, mas não executa ainda as condições Carbone, as chamadas de IA ou a persistência no Supabase. O DOCX final dependerá da integração com o Delivery.</p>
  </section>;
}
