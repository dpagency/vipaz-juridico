import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react';
import { Organization } from '../types';
import { WorkspacePage, WorkspacePageHeader } from '../components/WorkspacePage';
interface BibliotecaViewProps { organization: Organization; onNavigate: (path:string)=>void; }
export const BibliotecaView:React.FC<BibliotecaViewProps>=({organization,onNavigate})=><WorkspacePage>
  <WorkspacePageHeader eyebrow={organization.name} title="Library" description="Modelos e estruturas jurídicas disponíveis para produção no seu workspace." />
  <section className="vipaz-card p-6 sm:p-8">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
      <div className="max-w-2xl"><div className="flex items-center gap-2 text-[11px] vipaz-text-brand mb-4"><BookOpen className="w-4 h-4"/>MODELO DISPONÍVEL</div><h2 className="text-xl tracking-[-.025em] font-semibold">Contestação — Reajuste Coletivo PME</h2><p className="mt-3 text-[12px] leading-6 vipaz-text-muted">Arquitetura homologada para produção de contestação em demandas de reajuste coletivo empresarial, com seleção contextual dos blocos aplicáveis.</p></div>
      <span className="inline-flex items-center gap-1.5 text-[10px] vipaz-text-muted"><CheckCircle2 className="w-4 h-4 text-emerald-500"/>Homologado</span>
    </div>
    <div className="mt-8 pt-5 border-t vipaz-border-subtle flex items-center justify-between"><span className="text-[10px] vipaz-text-subtle">Documento final em DOCX</span><button onClick={()=>onNavigate(`/app/${organization.slug}/nova-peca`)} className="text-[12px] font-semibold vipaz-text-brand flex items-center gap-1">Usar modelo <ArrowRight className="w-3.5 h-3.5"/></button></div>
  </section>
  <section className="vipaz-card p-6 sm:p-8"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6"><div className="max-w-2xl"><div className="flex items-center gap-2 text-[11px] vipaz-text-brand mb-4"><BookOpen className="w-4 h-4"/>MODELO EM IMPLEMENTAÇÃO</div><h2 className="text-xl tracking-[-.025em] font-semibold">Agravo de Instrumento</h2><p className="mt-3 text-[12px] leading-6 vipaz-text-muted">Matriz recursal com pressupostos permanentes e tópicos individualizados por assistência de IA, sempre editáveis antes da produção final.</p></div><span className="inline-flex items-center gap-1.5 text-[10px] vipaz-text-muted">IA assistida</span></div><div className="mt-8 pt-5 border-t vipaz-border-subtle flex items-center justify-between"><span className="text-[10px] vipaz-text-subtle">Fluxo de geração em configuração</span><button onClick={()=>onNavigate(`/app/${organization.slug}/nova-peca`)} className="text-[12px] font-semibold vipaz-text-brand flex items-center gap-1">Preparar agravo <ArrowRight className="w-3.5 h-3.5"/></button></div></section>
</WorkspacePage>;
