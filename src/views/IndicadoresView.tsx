import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Organization } from '../types';
import { WorkspacePage, WorkspacePageHeader } from '../components/WorkspacePage';
interface IndicadoresViewProps { organization: Organization; onNavigate:(path:string)=>void; }
export const IndicadoresView:React.FC<IndicadoresViewProps>=({organization})=><WorkspacePage>
  <WorkspacePageHeader eyebrow={organization.name} title="Indicadores" description="Visão consolidada da produção jurídica do workspace." />
  <section className="vipaz-card min-h-[320px] flex items-center justify-center p-10 text-center"><div className="max-w-sm"><span className="mx-auto mb-5 grid h-11 w-11 place-items-center rounded-full bg-[var(--bg-surface-subtle)] vipaz-text-brand"><BarChart3 className="w-5 h-5"/></span><h2 className="text-[15px] font-semibold">Dados em consolidação</h2><p className="mt-2 text-[11px] leading-5 vipaz-text-muted">Os indicadores serão apresentados aqui a partir dos dados efetivamente registrados no workspace, sem métricas demonstrativas.</p></div></section>
</WorkspacePage>;
