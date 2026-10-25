import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileText,
  CheckCircle2,
  Download,
  Clock,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Loader2,
  PlusCircle,
} from 'lucide-react';
import { GenerationJob, GeneratedDocument, Organization } from '../types';
import { generationService } from '../services/generationService';
import { GenerationTimeline } from '../components/GenerationTimeline';
import { WorkspacePage } from '../components/WorkspacePage';

interface GeracaoViewProps {
  jobId: string;
  organization: Organization;
  onNavigate: (path: string) => void;
}

export const GeracaoView: React.FC<GeracaoViewProps> = ({
  jobId,
  organization,
  onNavigate,
}) => {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [document, setDocument] = useState<GeneratedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLocatingDocument, setIsLocatingDocument] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // Consulta generated_documents com retries breves caso o job conclua antes do registro do arquivo
  const fetchDocumentWithRetry = useCallback(
    async (currentJobId: string, maxAttempts = 6) => {
      setIsLocatingDocument(true);
      let attempts = 0;
      while (attempts < maxAttempts && isMountedRef.current) {
        attempts++;
        try {
          const doc = await generationService.getDocumentByJobId(currentJobId);
          if (doc && isMountedRef.current) {
            setDocument(doc);
            setIsLocatingDocument(false);
            return;
          }
        } catch (err) {
          console.warn(`Tentativa ${attempts} de consultar documento:`, err);
        }

        if (attempts < maxAttempts && isMountedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (isMountedRef.current) {
        setIsLocatingDocument(false);
      }
    },
    []
  );

  // Busca periódica do Job e das 10 Etapas reais
  const fetchJobData = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      try {
        const currentJob = await generationService.getJobById(jobId);
        if (!isMountedRef.current) return;

        if (!currentJob) {
          setJob(null);
          stopPolling();
          return;
        }

        setJob(currentJob);

        if (currentJob.status === 'completed') {
          stopPolling();
          if (!document) {
            await fetchDocumentWithRetry(currentJob.id);
          }
        } else if (currentJob.status === 'failed') {
          stopPolling();
        }
      } catch (err) {
        console.error('Erro na consulta do job no Supabase:', err);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          if (isManual) setIsRefreshing(false);
        }
      }
    },
    [jobId, document, stopPolling, fetchDocumentWithRetry]
  );

  // Inicialização e gerenciamento de polling
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      setIsLoading(true);
      try {
        const initialJob = await generationService.getJobById(jobId);
        if (!isMountedRef.current) return;

        if (!initialJob) {
          setJob(null);
          setIsLoading(false);
          return;
        }

        setJob(initialJob);
        setIsLoading(false);

        if (initialJob.status === 'completed') {
          await fetchDocumentWithRetry(initialJob.id);
        } else if (
          initialJob.status === 'pending' ||
          initialJob.status === 'processing'
        ) {
          stopPolling();
          pollingTimerRef.current = setInterval(() => {
            fetchJobData(false);
          }, 3000);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error('Erro no carregamento inicial do job:', err);
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [jobId, fetchJobData, fetchDocumentWithRetry, stopPolling]);

  // Download autenticado do DOCX do bucket privado
  const handleDownloadDocx = async () => {
    if (!document || isDownloadingDocx) return;
    setIsDownloadingDocx(true);
    setDownloadError(null);

    try {
      const cleanDocType = (
        document.document_type ||
        job?.document_type ||
        'Peca'
      )
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanProc = (
        job?.process_data?.process_number ||
        document.process_number ||
        ''
      ).replace(/[^0-9]/g, '') || '0802491';
      const suggestedName = `VIPAZ_Contestacao_${cleanProc}.docx`;

      await generationService.downloadDocx(
        document.docx_storage_path,
        suggestedName
      );
    } catch (err: unknown) {
      console.error('Erro ao baixar DOCX:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha ao baixar o arquivo DOCX do repositório seguro.';
      setDownloadError(msg);
    } finally {
      if (isMountedRef.current) {
        setIsDownloadingDocx(false);
      }
    }
  };

  const handleManualRefresh = () => {
    fetchJobData(true);
  };

  if (!job && !isLoading) {
    return (
      <div className="p-8 text-center space-y-4 bg-[#0B1325] rounded-xl border border-slate-800">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-semibold text-slate-100">
          Solicitação não encontrada
        </h2>
        <p className="text-xs text-slate-400">
          Não foi possível localizar o job{' '}
          <code className="font-mono-tech">{jobId}</code> nesta organização.
        </p>
        <button
          onClick={() => onNavigate(`/app/${organization.slug}`)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition cursor-pointer"
        >
          Voltar à Visão Geral
        </button>
      </div>
    );
  }

  const isCompleted = job?.status === 'completed';
  const isFailed = job?.status === 'failed';
  const isPending = job?.status === 'pending';
  const isProcessing = job?.status === 'processing';
  const subjectsList =
    job?.process_data?.subjects?.join(', ') || 'Não especificadas';

  const totalSteps =
    job?.steps && job.steps.length > 0 ? job.steps.length : 10;
  const completedSteps =
    job?.steps?.filter((s) => s.status === 'completed').length || 0;
  const progressPercent = isCompleted
    ? 100
    : Math.round((completedSteps / totalSteps) * 100);

  return (
    <WorkspacePage>
      {/* Top Breadcrumb & Refresh */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(`/app/${organization.slug}`)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Visão Geral</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-slate-200">Acompanhamento da Produção</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono-tech text-slate-300 bg-slate-900 border border-slate-700 rounded hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            title="Atualizar status do Supabase"
          >
            <RefreshCw
              className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`}
            />
            <span>Atualizar</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono-tech text-slate-400">
            <span>JOB:</span>
            <span className="text-cyan-400 truncate max-w-[180px]">{jobId}</span>
          </div>
        </div>
      </div>

      {/* Main Header / Status Panel */}
      <div className="p-6 rounded-2xl bg-[#090F1E] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono-tech uppercase tracking-wider text-cyan-400">
                {organization.name}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-emerald-400 font-mono-tech flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Padrão Homologado
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              {isCompleted
                ? 'Peça Concluída'
                : isFailed
                ? 'Falha no Processamento'
                : isPending
                ? 'Solicitação Registrada'
                : 'Processamento Forense'}
            </h1>
            <p className="text-xs text-slate-400">
              {isCompleted
                ? 'Peça processual homologada e disponibilizada para download do arquivo DOCX.'
                : isFailed
                ? 'Ocorreu uma inconformidade durante o processamento da peça forense.'
                : isPending
                ? 'Processo judicial e metadados persistidos no Supabase. Aguardando processamento pelo motor jurídico.'
                : 'Execução do pipeline metodológico sob a arquitetura jurídica VIPAZ.'}
            </p>
          </div>

          <div>
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>PEÇA CONCLUÍDA</span>
              </span>
            ) : isFailed ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>FALHA NO PROCESSAMENTO</span>
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-medium">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Aguardando Processamento</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-medium">
                <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Etapa {job?.current_step || 1} de 10 em curso</span>
              </span>
            )}
          </div>
        </div>

        {/* Progresso visual derivado exclusivamente de dados reais */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-[11px] font-mono-tech">
            <span className="text-slate-400">Progresso do Pipeline</span>
            <span
              className={
                isCompleted
                  ? 'text-emerald-400'
                  : isFailed
                  ? 'text-rose-400'
                  : 'text-cyan-400'
              }
            >
              {progressPercent}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isFailed
                  ? 'bg-rose-500'
                  : 'bg-cyan-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Process Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="p-3 rounded-lg bg-[#0B1325] border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-mono-tech text-slate-400">
              Número do Processo
            </span>
            <div className="font-mono-tech font-semibold text-slate-200 truncate">
              {job?.process_data?.process_number || 'N/A'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B1325] border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-mono-tech text-slate-400">
              Tipo de Peça
            </span>
            <div className="font-semibold text-slate-200">
              {job?.document_type}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B1325] border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-mono-tech text-slate-400">
              Parte Representada
            </span>
            <div className="font-semibold text-slate-200 truncate">
              {job?.process_data?.represented_party || 'N/A'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B1325] border border-slate-800 space-y-0.5">
            <span className="text-[10px] uppercase font-mono-tech text-slate-400">
              Matéria(s)
            </span>
            <div
              className="font-semibold text-slate-200 truncate"
              title={subjectsList}
            >
              {subjectsList}
            </div>
          </div>
        </div>

        {/* Source Document File Banner */}
        {job?.source_document && (
          <div className="p-3 rounded-lg bg-[#0B1325] border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <FileCheck2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-300 truncate font-medium">
                {job.source_document.file_name}
              </span>
              <span className="text-[11px] font-mono-tech text-slate-500">
                ({(job.source_document.file_size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <span className="text-[10px] font-mono-tech text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded shrink-0">
              PDF Anexado no Storage
            </span>
          </div>
        )}
      </div>

      {/* CARD DE ERRO QUANDO O JOB FALHA */}
      {isFailed && (
        <div className="p-6 rounded-2xl bg-[#140C1A] border border-rose-500/40 shadow-xl space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-rose-200">
                Inconformidade no Processamento
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {job?.error_message ||
                  'O pipeline de geração reportou uma falha durante o processamento. Nenhum documento final foi homologado.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-rose-500/20">
            <button
              onClick={() => onNavigate(`/app/${organization.slug}/nova-peca`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Criar Nova Peça</span>
            </button>

            <button
              onClick={() => fetchJobData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`}
              />
              <span>Reverificar Status</span>
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENTO FINAL (EXCLUSIVAMENTE DOCX QUANDO CONCLUÍDO) */}
      {!isFailed &&
        (isCompleted && document ? (
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0B172F] to-[#080E1C] border border-cyan-500/40 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5">
              <div className="space-y-1">
                <span className="text-[11px] font-mono-tech text-emerald-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PEÇA PROCESSUAL
                  HOMOLOGADA
                </span>
                <h2 className="text-xl font-bold text-white">
                  {document.document_type || job.document_type}
                  {document.version ? ` (${document.version})` : ''}
                </h2>
                <p className="text-xs text-slate-300">
                  Documento forense estruturado e finalizado. Arquivo pronto para
                  conferência e protocolo judicial.
                </p>
              </div>

              <div className="text-right text-xs text-slate-400 font-mono-tech">
                <div>
                  Concluído em{' '}
                  {new Date(
                    job.completed_at || document.created_at
                  ).toLocaleTimeString('pt-BR')}
                </div>
              </div>
            </div>

            {downloadError && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{downloadError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownloadDocx}
                disabled={isDownloadingDocx}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-cyan-950/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloadingDocx ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>BAIXANDO ARQUIVO DOCX...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>BAIXAR DOCX</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : isCompleted && isLocatingDocument ? (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#090F1E] border border-cyan-500/30 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Homologando Arquivo DOCX
                </h3>
                <p className="text-xs text-slate-400">
                  Processamento concluído com sucesso. Localizando o registro do
                  documento gerado...
                </p>
              </div>
            </div>
          </div>
        ) : isCompleted && !document ? (
          <div className="p-6 rounded-2xl bg-[#090F1E] border border-amber-500/30 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-slate-100">
                  Documento em Finalização de Gravação
                </h3>
                <p className="text-xs text-slate-400">
                  O job foi concluído, mas o arquivo DOCX ainda não foi
                  detectado no banco de dados.
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchDocumentWithRetry(job.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Consultar Documento Novamente</span>
            </button>
          </div>
        ) : (
          /* ESTADO PENDENTE OU EM PROCESSAMENTO — BOTÃO DESABILITADO DE FORMA TRANSPARENTE */
          <div className="p-6 rounded-2xl bg-[#090F1E] border border-slate-800/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Documento Final da Peça</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  O arquivo definitivo (DOCX) será disponibilizado para download
                  após a conclusão do processamento.
                </p>
              </div>
              <span className="text-[10px] font-mono-tech text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700 whitespace-nowrap self-start sm:self-center">
                Aguardando Geração
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60">
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900/60 text-slate-500 border border-slate-800 text-xs font-semibold cursor-not-allowed opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>BAIXAR DOCX</span>
              </button>
            </div>
          </div>
        ))}

      {/* TIMELINE DAS 10 ETAPAS REAIS (LIDAS DO SUPABASE) */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0B1325] border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Pipeline Metodológico VIPAZ
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Estruturação formal das 10 etapas forenses registradas em{' '}
              <code className="font-mono-tech text-cyan-400">
                generation_steps
              </code>
              .
            </p>
          </div>

          <span className="text-xs font-mono-tech text-cyan-400 bg-cyan-950/50 px-2.5 py-1 rounded border border-cyan-500/20">
            {isCompleted
              ? '10 / 10 Concluídas'
              : isFailed
              ? `${completedSteps} / ${totalSteps} Concluídas (Interrompido)`
              : `${completedSteps} / ${totalSteps} Concluídas`}
          </span>
        </div>

        {job?.steps && job.steps.length > 0 ? (
          <GenerationTimeline
            steps={job.steps}
            currentStepIndex={job.current_step}
          />
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 font-mono-tech">
            Carregando etapas do pipeline...
          </div>
        )}
      </div>
    </WorkspacePage>
  );
};
