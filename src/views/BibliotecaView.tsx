import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock3 } from 'lucide-react';
import type { DocumentTemplate, Organization } from '../types';
import { WorkspacePage, WorkspacePageHeader } from '../components/WorkspacePage';
import { legalProductionService } from '../services/legalProductionService';
import { authService } from '../services/authService';

interface BibliotecaViewProps { organization: Organization; onNavigate: (path:string)=>void }
const labels: Record<DocumentTemplate['status'], string> = { draft: 'Rascunho', in_review: 'Em homologação', approved: 'Homologado', deprecated: 'Substituído', archived: 'Arquivado' };

export const BibliotecaView: React.FC<BibliotecaViewProps> = ({ organization, onNavigate }) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [message, setMessage] = useState('Carregando modelos…');
  const [busyId, setBusyId] = useState<string | null>(null);
  const canApprove = ['admin', 'senior_lawyer'].includes(authService.getCurrentUser()?.role || '');

  async function load() {
    try { const rows = await legalProductionService.listTemplates(organization.id); setTemplates(rows); setMessage(rows.length ? '' : 'Nenhum modelo versionado. Importe o primeiro DOCX no Studio.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar a Library.'); }
  }
  useEffect(() => { void load(); }, [organization.id]);

  async function approve(template: DocumentTemplate) {
    setBusyId(template.id);
    try { await legalProductionService.setTemplateStatus(template, 'approved'); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao homologar modelo.'); }
    finally { setBusyId(null); }
  }

  return <WorkspacePage>
    <WorkspacePageHeader eyebrow={organization.name} title="Library" description="Modelos DOCX versionados, homologados e disponíveis para produção no seu workspace." />
    {message && <p role="status" className="vipaz-card p-5 text-sm vipaz-text-muted">{message}</p>}
    {templates.map(template => <section key={template.id} className="vipaz-card p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="max-w-2xl"><div className="flex items-center gap-2 text-[11px] vipaz-text-brand mb-4"><BookOpen className="w-4 h-4"/>{template.document_type.toUpperCase()}</div><h2 className="text-xl tracking-[-.025em] font-semibold">{template.name}</h2><p className="mt-3 text-[12px] leading-6 vipaz-text-muted">Versão {template.version} · {template.original_filename || 'Documento DOCX'} · mapa de composição v{template.schema_version || 2}</p></div>
        <span className="inline-flex items-center gap-1.5 text-[10px] vipaz-text-muted">{template.status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-500"/> : <Clock3 className="w-4 h-4 text-amber-500"/>}{labels[template.status]}</span>
      </div>
      <div className="mt-8 pt-5 border-t vipaz-border-subtle flex flex-wrap items-center justify-between gap-3"><span className="text-[10px] vipaz-text-subtle">Atualizado em {new Date(template.updated_at).toLocaleString('pt-BR')}</span><div className="flex gap-3">{canApprove && template.status === 'in_review' && <button disabled={busyId === template.id} onClick={() => void approve(template)} className="rounded-[5px] border border-emerald-600 px-3 py-2 text-[12px] font-semibold text-emerald-700 disabled:opacity-50">Homologar versão</button>}{template.status === 'approved' && <button onClick={()=>onNavigate(`/app/${organization.slug}/nova-peca`)} className="rounded-[5px] px-3 py-2 text-[12px] font-semibold vipaz-text-brand flex items-center gap-1">Usar modelo <ArrowRight className="w-3.5 h-3.5"/></button>}</div></div>
    </section>)}
  </WorkspacePage>;
};
