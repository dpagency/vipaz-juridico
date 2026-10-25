import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FolderArchive,
  Scale,
  ShieldCheck,
  FileText,
  History,
  ArrowLeft,
  Share2,
  Bookmark,
  Gavel,
  Clock,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { CaseTab, LegalCaseWorkspace, EvidenceSourceLink } from '../../types/caseTypes';
import { caseWorkspaceService } from '../../services/caseWorkspaceService';
import { CaseOverviewTab } from './CaseOverviewTab';
import { CaseProcessTab } from './CaseProcessTab';
import { CaseDocumentsTab } from './CaseDocumentsTab';
import { CaseLegalAnalysisTab } from './CaseLegalAnalysisTab';
import { CaseStrategyTab } from './CaseStrategyTab';
import { CasePiecesTab } from './CasePiecesTab';
import { CaseHistoryTab } from './CaseHistoryTab';
import { SourceEvidenceModal } from '../../components/SourceEvidenceModal';
import { WorkspacePage } from '../../components/WorkspacePage';

interface CaseWorkspaceViewProps {
  caseId?: string;
  initialTab?: CaseTab;
  onNavigate: (path: string) => void;
}

export const CaseWorkspaceView: React.FC<CaseWorkspaceViewProps> = ({
  caseId,
  initialTab = 'visao-geral',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<CaseTab>(initialTab);
  const [caseData, setCaseData] = useState<LegalCaseWorkspace>(() =>
    caseWorkspaceService.getCaseById(caseId)
  );

  // Estado para Split-View de Evidência e Rastreabilidade
  const [evidenceModalData, setEvidenceModalData] = useState<{
    isOpen: boolean;
    evidence: EvidenceSourceLink;
    title: string;
    info: {
      title: string;
      description: string;
      impact?: string;
      counterMeasure?: string;
    };
  } | null>(null);

  const tabs: Array<{ id: CaseTab; label: string; icon: React.ReactNode }> = [
    { id: 'visao-geral', label: 'Visão Geral', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'processo', label: 'Processo', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
    { id: 'documentos', label: 'Documentos', icon: <FolderArchive className="w-3.5 h-3.5" /> },
    { id: 'analise-juridica', label: 'Análise Jurídica', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'estrategia', label: 'Estratégia', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'pecas', label: 'Peças', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'historico', label: 'Histórico', icon: <History className="w-3.5 h-3.5" /> },
  ];

  const handleOpenEvidence = (
    evidence: EvidenceSourceLink,
    title: string,
    info: {
      title: string;
      description: string;
      impact?: string;
      counterMeasure?: string;
    }
  ) => {
    setEvidenceModalData({
      isOpen: true,
      evidence,
      title,
      info,
    });
  };

  return (
    <WorkspacePage className="!space-y-6">
      {/* Breadcrumb e Cabeçalho do Caso */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <button
                onClick={() => onNavigate(`/app/caw/casos`)}
                className="hover:text-cyan-600 dark:hover:text-cyan-400 transition"
              >
                Casos Jurídicos
              </button>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="font-mono-tech font-medium text-slate-800 dark:text-slate-200">
                {caseData.process_number}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {caseData.client}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-medium">
                Contestação Ativa
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {caseData.court} • Demandante: {caseData.opposing_party}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setActiveTab('pecas')}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Emitir Peça (DOCX)</span>
            </button>
          </div>
        </div>

        {/* Barra de Abas do Caso (7 Módulos) */}
        <div className="flex items-center gap-1 overflow-x-auto mt-6 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      <div>
        {activeTab === 'visao-geral' && (
          <CaseOverviewTab
            caseData={caseData}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'processo' && (
          <CaseProcessTab
            caseData={caseData}
            onOpenEvidence={handleOpenEvidence}
          />
        )}

        {activeTab === 'documentos' && (
          <CaseDocumentsTab caseData={caseData} />
        )}

        {activeTab === 'analise-juridica' && (
          <CaseLegalAnalysisTab
            caseData={caseData}
            onOpenEvidence={handleOpenEvidence}
          />
        )}

        {activeTab === 'estrategia' && (
          <CaseStrategyTab
            caseData={caseData}
            onUpdateStrategy={() => setCaseData({ ...caseWorkspaceService.getCaseById(caseId) })}
          />
        )}

        {activeTab === 'pecas' && (
          <CasePiecesTab
            caseData={caseData}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'historico' && (
          <CaseHistoryTab caseData={caseData} />
        )}
      </div>

      {/* Modal de Rastreabilidade Split-View */}
      {evidenceModalData?.isOpen && (
        <SourceEvidenceModal
          title={evidenceModalData.title}
          structuredInfo={evidenceModalData.info}
          evidenceSource={evidenceModalData.evidence}
          onClose={() => setEvidenceModalData(null)}
        />
      )}
    </WorkspacePage>
  );
};
