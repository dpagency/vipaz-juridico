import React, { useEffect, useState } from 'react';
import { ArrowRight, FilePlus2, Files, CheckCircle2, Clock3, Sparkles, Scale } from 'lucide-react';
import { Organization, GenerationJob, GeneratedDocument } from '../types';
import { generationService } from '../services/generationService';
import { StatusBadge } from '../components/StatusBadge';
import { DocumentViewerModal } from '../components/DocumentViewerModal';

interface DashboardViewProps { organization: Organization; onNavigate: (path: string) => void; }

export const DashboardView: React.FC<DashboardViewProps> = ({ organization, onNavigate }) => {
  const [jobs,setJobs]=useState<GenerationJob[]>([]);
  const [selectedDoc,setSelectedDoc]=useState<GeneratedDocument|null>(null);
  useEffect(()=>{generationService.getJobsByOrganization(organization.id).then(setJobs);},[organization.id]);
  const completed=jobs.filter(j=>j.status==='completed').length;
  const processing=jobs.filter(j=>j.status==='processing').length;
  const openDoc=async(id:string)=>{const doc=await generationService.getDocumentByJobId(id);if(doc)setSelectedDoc(doc);};

  return <div className="space-y-6 animate-in fade-in duration-300">
    <section className="vipaz-bento lg:grid-cols-12">
      <article className="vipaz-bento-card min-h-[310px] bg-white p-7 sm:p-9 lg:col-span-8">
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#20D7E8] ring-1 ring-black/20"/><span className="vipaz-kicker text-[#657078]">{organization.name}</span></div>
          <div><h1 className="vipaz-display max-w-2xl text-5xl leading-[.94] sm:text-7xl"><span className="block">Seu trabalho,</span><span className="mt-2 block w-fit rounded-[5px] bg-[#20D7E8] px-2 pb-1">em perspectiva.</span></h1><p className="mt-5 max-w-lg text-xs leading-6 text-[#657078]">Acompanhe o que está em movimento e transforme contexto em uma nova produção estruturada.</p></div>
        </div>
      </article>
      <article className="vipaz-bento-card min-h-[310px] bg-[#11161A] p-7 text-white sm:p-9 lg:col-span-4">
        <div className="flex h-full flex-col justify-between"><div className="flex items-start justify-between"><span className="vipaz-kicker text-white/45">Ação principal</span><Sparkles className="h-5 w-5 text-[#20D7E8]"/></div><div><h2 className="vipaz-display text-4xl leading-none">Comece uma<br/>nova peça.</h2><button onClick={()=>onNavigate(`/app/${organization.slug}/nova-peca`)} className="mt-7 inline-flex items-center gap-3 rounded-xl bg-[#20D7E8] py-2 pl-5 pr-2 text-xs font-bold text-[#11161A]">Criar agora <span className="grid h-8 w-8 place-items-center rounded-lg bg-black text-white"><FilePlus2 className="h-4 w-4"/></span></button></div></div>
      </article>
    </section>

    <section className="vipaz-bento sm:grid-cols-3">
      {[[jobs.length,'Produções','Total no workspace',Files],[processing,'Em andamento','Exigem acompanhamento',Clock3],[completed,'Concluídas','Prontas para uso',CheckCircle2]].map(([value,label,desc,Icon],index)=>{const I=Icon as React.ElementType;return <article key={label as string} className="vipaz-bento-card min-h-[170px] bg-white p-6"><div className="flex h-full flex-col justify-between"><div className="flex items-center justify-between"><span className="vipaz-kicker text-[#657078]">{label as string}</span><I className={`h-4 w-4 ${index===1?'text-[#9A6A1F]':index===2?'text-[#4B8064]':'text-[#174E68]'}`}/></div><div><div className="font-mono text-5xl font-medium leading-none">{value as number}</div><p className="mt-2 text-[10px] font-semibold text-[#8B959B]">{desc as string}</p></div></div></article>;})}
    </section>

    <section className="vipaz-bento-card bg-[var(--bg-surface)] p-5 sm:p-7">
      <div className="mb-6 flex items-end justify-between gap-4"><div><span className="vipaz-kicker vipaz-text-brand">Atividade recente</span><h2 className="mt-2 text-lg font-extrabold tracking-[-.03em]">Produções do workspace</h2></div><button onClick={()=>onNavigate(`/app/${organization.slug}/documentos`)} className="inline-flex items-center gap-2 text-[11px] font-bold vipaz-text-brand">Ver tudo <ArrowRight className="h-3.5 w-3.5"/></button></div>
      {jobs.length===0 ? <div className="vipaz-grid-texture rounded-[20px] border vipaz-border-subtle py-16 text-center"><Scale className="mx-auto h-6 w-6 vipaz-text-subtle"/><p className="mt-4 text-xs vipaz-text-muted">Nenhuma produção registrada.</p><button onClick={()=>onNavigate(`/app/${organization.slug}/nova-peca`)} className="mt-4 text-xs font-bold vipaz-text-brand">Criar primeira peça</button></div> :
      <div className="overflow-x-auto rounded-[18px] border vipaz-border-subtle"><table className="w-full text-left text-[11px]"><thead className="bg-[var(--bg-surface-subtle)] vipaz-text-subtle"><tr><th className="px-5 py-3 font-semibold">Processo</th><th className="px-5 py-3 font-semibold">Peça</th><th className="px-5 py-3 font-semibold">Parte</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3"/></tr></thead><tbody>{jobs.slice(0,6).map(job=><tr key={job.id} className="border-t vipaz-border-subtle hover:bg-[var(--bg-surface-subtle)]"><td className="px-5 py-4"><div className="font-bold">{job.process_data?.process_number||job.process?.process_number||'—'}</div><div className="mt-1 text-[9px] vipaz-text-subtle">{job.process_data?.court||job.process?.court||''}</div></td><td className="px-5 py-4 font-semibold">{job.document_type}</td><td className="px-5 py-4 vipaz-text-secondary">{job.process_data?.represented_party||job.process?.represented_party||'—'}</td><td className="px-5 py-4"><StatusBadge status={job.status}/></td><td className="px-5 py-4 text-right"><button onClick={()=>onNavigate(`/app/${organization.slug}/geracoes/${job.id}`)} className="font-bold vipaz-text-brand">Abrir</button>{job.status==='completed'&&<button onClick={()=>openDoc(job.id)} className="ml-4 vipaz-text-muted">Visualizar</button>}</td></tr>)}</tbody></table></div>}
    </section>
    {selectedDoc&&<DocumentViewerModal document={selectedDoc} onClose={()=>setSelectedDoc(null)}/>}
  </div>;
};
