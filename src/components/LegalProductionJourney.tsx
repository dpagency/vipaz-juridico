import React from 'react';
import { Check, Circle, Loader2, ShieldCheck } from 'lucide-react';
import type { LegalGenerationProgress } from '../services/legalAiService';

type StepStatus = 'complete' | 'active' | 'pending';

interface LegalProductionJourneyProps {
  hasSource: boolean;
  factualPendingCount: number;
  completedDrafts: number;
  totalDrafts: number;
  qualityPendingCount: number;
  persisted: boolean;
  progress: LegalGenerationProgress | null;
}

const STEP_LABELS = [
  ['Autos', 'PDF protegido e disponível para análise'],
  ['Dados do caso', 'Extração factual e validação humana'],
  ['Mapa jurídico', 'Tópicos e condicionantes definidos'],
  ['Redação integral', 'Produção individual, sem resumo artificial'],
  ['Revisão e montagem', 'Controle formal, snapshot e DOCX'],
] as const;

export const LegalProductionJourney: React.FC<LegalProductionJourneyProps> = ({
  hasSource,
  factualPendingCount,
  completedDrafts,
  totalDrafts,
  qualityPendingCount,
  persisted,
  progress,
}) => {
  const factsComplete = hasSource && factualPendingCount === 0;
  const mapComplete = factsComplete;
  const draftingComplete = totalDrafts > 0 && completedDrafts === totalDrafts;
  const reviewComplete = draftingComplete && qualityPendingCount === 0;
  const completion = totalDrafts ? Math.round((completedDrafts / totalDrafts) * 100) : 0;
  const statuses: StepStatus[] = [
    hasSource ? 'complete' : 'active',
    factsComplete ? 'complete' : hasSource ? 'active' : 'pending',
    mapComplete ? 'complete' : 'pending',
    draftingComplete ? 'complete' : progress?.stage === 'drafting' ? 'active' : 'pending',
    persisted ? 'complete' : reviewComplete || progress?.stage === 'reviewing' ? 'active' : 'pending',
  ];

  return (
    <section aria-labelledby="legal-production-title" className="rounded-[5px] border vipaz-border-subtle bg-[var(--bg-surface-subtle)] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 id="legal-production-title" className="text-sm font-semibold vipaz-text-primary">Fluxo controlado de produção</h4>
          <p className="mt-1 text-xs vipaz-text-muted">Cada etapa informa o que foi extraído, o que foi redigido e o que ainda depende da sua revisão.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-[5px] border border-cyan-600/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Supervisão humana obrigatória
        </span>
      </div>

      <ol className="mt-4 grid gap-2 lg:grid-cols-5">
        {STEP_LABELS.map(([label, description], index) => {
          const status = statuses[index];
          return (
            <li key={label} aria-current={status === 'active' ? 'step' : undefined} className={`rounded-[5px] border p-3 ${status === 'complete' ? 'border-emerald-600/30 bg-emerald-500/8' : status === 'active' ? 'border-cyan-600/40 bg-cyan-500/10' : 'vipaz-border-subtle bg-[var(--bg-surface)]'}`}>
              <div className="flex items-center gap-2">
                {status === 'complete' ? <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> : status === 'active' && progress ? <Loader2 className="h-4 w-4 animate-spin text-cyan-700 dark:text-cyan-300" /> : <Circle className="h-4 w-4 vipaz-text-muted" />}
                <span className="text-xs font-semibold vipaz-text-primary">{index + 1}. {label}</span>
              </div>
              <p className="mt-2 text-[10px] leading-4 vipaz-text-muted">{description}</p>
            </li>
          );
        })}
      </ol>

      {progress ? (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="font-medium vipaz-text-secondary">{progress.message}</span>
            <span className="font-mono vipaz-text-muted">{progress.stage === 'drafting' ? `${completion}%` : progress.stage === 'complete' ? '100%' : 'em andamento'}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden="true">
            <div className="h-full bg-cyan-500 transition-[width] duration-500" style={{ width: `${progress.stage === 'complete' ? 100 : completion}%` }} />
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] vipaz-text-muted">
        <span>{factualPendingCount ? `${factualPendingCount} dado(s) factual(is) pendente(s)` : 'Dados factuais completos'}</span>
        <span>{completedDrafts}/{totalDrafts} tópicos redigidos</span>
        <span>{qualityPendingCount ? `${qualityPendingCount} requisito(s) de qualidade pendente(s)` : 'Regras formais atendidas'}</span>
      </div>
    </section>
  );
};

