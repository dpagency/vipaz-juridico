/**
 * VIPAZ Jurídico — Vista: Nova Peça Processual
 * Motor Determinístico de Montagem Jurídica (Contestação Reajuste PME)
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Info,
  Loader2,
  Layers,
  Scale,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Database,
  Copy,
  Check,
  FileDown,
  Download,
  FileText,
  RefreshCw,
  ExternalLink,
  Workflow,
  HardDrive,
} from 'lucide-react';
import { Organization, DocumentType, type DocumentTemplate } from '../types';
import {
  LegalFormData,
  UfType,
  AdversePartyNature,
  DocumentPieceType,
} from '../domain/legal-engine/types';
import { ruleEngine } from '../domain/legal-engine/ruleEngine';
import { deterministicGenerationService } from '../services/deterministicGenerationService';
import {
  experimentalDocxService,
  ExperimentalDocxGenerationResult,
  OFFICIAL_HOMOLOGATED_INPUT_ID,
  OFFICIAL_HOMOLOGATED_JOB_ID,
} from '../services/experimentalDocxService';
import {
  docxGenerationService,
  CawDocxGenerationStep,
  CawDocxGenerationResult,
} from '../services/docxGenerationService';
import { MapaDaPecaModal } from '../components/MapaDaPecaModal';
import { PdfUploader, SelectedPdfFile } from '../components/PdfUploader';
import {
  DOCUMENT_PIECES_CATALOG,
  DISPUTE_TAXONOMY_ITEMS,
  HOMOLOGATED_CASE_DEFAULTS,
} from '../domain/legal-engine/formDefinitions';
import { isPieceHomologated } from '../domain/legal-engine/architectureRegistry';
import { legalAiService, LegalAiField, type LegalIntakeSuggestion } from '../services/legalAiService';
import { WorkspacePage, WorkspacePageHeader } from '../components/WorkspacePage';
import { legalProductionService } from '../services/legalProductionService';
import { applyLegalIntakeSuggestions } from '../domain/legal-engine/legalIntake';

interface NovaPecaViewProps {
  organization: Organization;
  onNavigate: (path: string) => void;
}
const INSTITUTIONAL_TEMPLATE_ID='institutional-legal-architecture-v1';

export const NovaPecaView: React.FC<NovaPecaViewProps> = ({
  organization,
  onNavigate,
}) => {
  // Estado do formulário jurídico determinístico
  const [formData, setFormData] = useState<LegalFormData>({
    process_number: '',
    court_number: '',
    court_type: 'Vara Cível',
    court_type_custom: '',
    court_regional: '',
    district: '',
    uf: 'RJ',
    client: organization.slug === 'caw' ? 'Sul América Companhia de Seguro Saúde' : '',
    opposing_party: '',
    executive_summary: '',
    claim_summary: '',
    controversy_delimitation: '',
    adverse_party_nature: ['pj', 'pf'],
    document_piece: 'Contestação',
    dispute_objects: {
      reajuste_anual: true,
      reajuste_anual_modalidade: 'pme',
      reajuste_etario: false,
      reajuste_etario_modalidade: 'pme',
      aviso_previo: false,
      premio_complementar: false,
      outro: false,
      outro_descricao: '',
    },
    injunction_status: 'denied',
    moral_damages_status: 'claimed',
    legal_aid_status: 'challenge',
    legal_aid_target: 'both',
    standing_challenge_status: 'challenge',
    claim_value_challenge_status: 'challenge',
    petition_aptitude_status: 'do_not_challenge',
    prescription_triennial_status: 'argue',
    prescription_decennial_status: 'do_not_argue',
    repetition_status: 'double',
  });

  const [selectedFile, setSelectedFile] = useState<SelectedPdfFile | null>(null);
  const [isMapaModalOpen, setIsMapaModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [persistedSnapshot, setPersistedSnapshot] = useState<{
    generation_job_id: string;
    legal_case_input_id: string;
    included_blocks_count: number;
    linked_requests_count: number;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [generatingAiField, setGeneratingAiField] = useState<LegalAiField | null>(null);
  const [isGeneratingCompleteAppeal, setIsGeneratingCompleteAppeal] = useState(false);
  const [completeAppealProgress, setCompleteAppealProgress] = useState('');
  const [aiFieldError, setAiFieldError] = useState<string | null>(null);
  const [intakeSuggestions, setIntakeSuggestions] = useState<LegalIntakeSuggestion[]>([]);
  const [isResolvingIntake, setIsResolvingIntake] = useState(false);
  const [intakeResolutionError, setIntakeResolutionError] = useState<string | null>(null);
  const [approvedTemplates, setApprovedTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateMessage, setTemplateMessage] = useState('Carregando modelos homologados…');

  useEffect(() => {
    let active = true;
    legalProductionService.listTemplates(organization.id).then(rows => {
      if (!active) return;
      const approved = rows.filter(row => row.status === 'approved');
      setApprovedTemplates(approved);
      setSelectedTemplateId(current => current && (current===INSTITUTIONAL_TEMPLATE_ID||approved.some(row => row.id === current)) ? current : (approved[0]?.id || INSTITUTIONAL_TEMPLATE_ID));
      setTemplateMessage(approved.length ? '' : 'Usando a arquitetura institucional homologada. Você pode adicionar um DOCX próprio pelo Studio.');
    }).catch(error => { if (active) setTemplateMessage(error instanceof Error ? error.message : 'Falha ao carregar modelos.'); });
    return () => { active = false; };
  }, [organization.id]);

  // Estados da Fase 4: Geração Experimental do DOCX Determinístico
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [docxResult, setDocxResult] = useState<ExperimentalDocxGenerationResult | null>(null);
  const [docxError, setDocxError] = useState<string | null>(null);

  // Estados da Fase 5: Integração Nativa VIPAZ -> Motor DOCX CAW (n8n / Carbone)
  const [isGeneratingCawDocx, setIsGeneratingCawDocx] = useState(false);
  const [cawDocxStep, setCawDocxStep] = useState<CawDocxGenerationStep>('idle');
  const [cawDocxStepMessage, setCawDocxStepMessage] = useState<string>('');
  const [cawDocxResult, setCawDocxResult] = useState<CawDocxGenerationResult | null>(null);
  const [cawDocxError, setCawDocxError] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  async function updateReview(status: 'awaiting_review' | 'changes_requested' | 'approved') {
    if (!cawDocxResult?.document_id) { setReviewMessage('O motor não retornou o identificador do documento.'); return; }
    setReviewBusy(true);
    try {
      await legalProductionService.reviewDocument({ organizationId: organization.id, documentId: cawDocxResult.document_id, jobId: cawDocxResult.job_id, status });
      setReviewMessage(status === 'awaiting_review' ? 'Documento enviado para revisão humana.' : status === 'approved' ? 'Documento aprovado e registrado na trilha de auditoria.' : 'Ajustes solicitados e registrados.');
    } catch (error) { setReviewMessage(error instanceof Error ? error.message : 'Não foi possível atualizar a revisão.'); }
    finally { setReviewBusy(false); }
  }

  const isAgravo = formData.document_piece === 'Agravo de Instrumento';
  const countersecurityAllowed = Boolean(
    formData.dispute_objects.reajuste_anual || formData.dispute_objects.reajuste_etario
  );

  const handleResolvePendingWithAi = async () => {
    if(isResolvingIntake) return;
    if(!selectedFile?.fileObj){setIntakeResolutionError('Anexe os autos em PDF antes de solicitar o saneamento assistido.');return;}
    const pendingFields=Object.keys(clientErrors).filter(field=>field!=='submit'&&field!=='document_piece');
    if(!pendingFields.length){setIntakeResolutionError('Não há pendências compatíveis para analisar.');return;}
    setIsResolvingIntake(true);setIntakeResolutionError(null);setIntakeSuggestions([]);
    try{
      const suggestions=await legalAiService.resolvePending({organization_id:organization.id,document_piece:formData.document_piece,current_form:formData},selectedFile.fileObj,organization.id,pendingFields);
      setIntakeSuggestions(suggestions);
    }catch(error){setIntakeResolutionError(error instanceof Error?error.message:'Não foi possível analisar as pendências.');}
    finally{setIsResolvingIntake(false);}
  };

  const handleApplyIntakeSuggestions = (fields:string[]) => {
    setFormData(previous=>{
      const next=applyLegalIntakeSuggestions(previous,intakeSuggestions,fields).data;
      const check=ruleEngine.evaluate(next);const nextErrors:Record<string,string>={};check.errors.forEach(error=>{nextErrors[error.field]=error.message;});setClientErrors(nextErrors);
      return next;
    });
    setIntakeSuggestions([]);setIntakeResolutionError(null);
  };

  const handleGenerateAiField = async (field: LegalAiField) => {
    if (generatingAiField) return;
    if (!selectedFile?.fileObj) {
      setAiFieldError('Anexe os autos processuais em PDF antes de gerar conteúdo com IA.');
      return;
    }
    setGeneratingAiField(field);
    setAiFieldError(null);
    try {
      const content = await legalAiService.generate(field, {
        document_piece: formData.document_piece,
        organization_id: organization.id,
        process_number: formData.process_number,
        tribunal: formData.uf,
        juizo_origem: [formData.court_number, formData.court_type, formData.district, formData.uf].filter(Boolean).join(' · '),
        agravante: formData.client,
        agravado: formData.opposing_party,
        tipo_demanda: formData.appeal_demand_type,
        objeto_demanda: formData.appeal_main_object,
        decisao_agravada: formData.appealed_decision,
        peticao_inicial: formData.appeal_initial_claim,
        documentos_relevantes: formData.appeal_relevant_documents,
        documentacao_contratual: formData.appeal_contractual_documents,
        historico_processual: formData.appeal_procedural_history,
        instrucoes_especificas: formData.appeal_specific_instructions,
        countersecurity_allowed: countersecurityAllowed,
        dispute_objects: formData.dispute_objects,
        injunction_status: formData.injunction_status,
        moral_damages_status: formData.moral_damages_status,
        repetition_status: formData.repetition_status,
      }, selectedFile.fileObj, organization.id);
      updateField(field as keyof LegalFormData, content as never);
    } catch (err) {
      setAiFieldError(err instanceof Error ? err.message : 'Não foi possível gerar o texto.');
    } finally {
      setGeneratingAiField(null);
    }
  };

  const handleGenerateAllContestacaoAiFields = async () => {
    if (generatingAiField) return;
    if (!selectedFile?.fileObj) {
      setAiFieldError('Anexe os autos processuais em PDF antes de gerar conteúdo com IA.');
      return;
    }
    for (const field of ['executive_summary','claim_summary','controversy_delimitation'] as LegalAiField[]) {
      await handleGenerateAiField(field);
    }
  };

  const handleGenerateAllAiFields = async () => {
    if (generatingAiField || isGeneratingCompleteAppeal) return;
    if (!selectedFile?.fileObj) {
      setAiFieldError('Anexe os autos processuais em PDF antes de gerar conteúdo com IA.');
      return;
    }
    setIsGeneratingCompleteAppeal(true); setAiFieldError(null);
    try {
      const context={document_piece:formData.document_piece,organization_id:organization.id,process_number:formData.process_number,tribunal:formData.uf,juizo_origem:[formData.court_number,formData.court_type,formData.district,formData.uf].filter(Boolean).join(' · '),agravante:formData.client,agravado:formData.opposing_party,tipo_demanda:formData.appeal_demand_type,objeto_demanda:formData.appeal_main_object,decisao_agravada:formData.appealed_decision,peticao_inicial:formData.appeal_initial_claim,documentos_relevantes:formData.appeal_relevant_documents,documentacao_contratual:formData.appeal_contractual_documents,historico_processual:formData.appeal_procedural_history,instrucoes_especificas:formData.appeal_specific_instructions,countersecurity_allowed:countersecurityAllowed,dispute_objects:formData.dispute_objects,injunction_status:formData.injunction_status};
      const draft=await legalAiService.generateCompleteAppeal(context,selectedFile.fileObj,organization.id,message=>setCompleteAppealProgress(message));
      setFormData(previous=>({...previous,...draft}));
      setCompleteAppealProgress('Agravo completo gerado. Revise os campos antes de salvar.');
    } catch(err){ setAiFieldError(err instanceof Error?err.message:'Não foi possível gerar o agravo completo.'); }
    finally { setIsGeneratingCompleteAppeal(false); }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerateCawDocx = async (targetJobId?: string) => {
    const jobId = targetJobId || persistedSnapshot?.generation_job_id;
    if (!jobId || isGeneratingCawDocx) return;

    setIsGeneratingCawDocx(true);
    setCawDocxError(null);
    setCawDocxResult(null);
    setCawDocxStep('assembling_payload');
    setCawDocxStepMessage('Iniciando montagem determinística para o motor CAW...');

    try {
      const result = await docxGenerationService.generateDocx(
        jobId,
        (step, msg) => {
          setCawDocxStep(step);
          setCawDocxStepMessage(msg);
        }
      );
      setCawDocxResult(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha na integração com o motor DOCX CAW (n8n).';
      console.error('Erro na geração DOCX CAW:', err);
      setCawDocxError(msg);
      setCawDocxStep('error');
    } finally {
      setIsGeneratingCawDocx(false);
    }
  };

  const handleDownloadCawDocx = async () => {
    if (!cawDocxResult) return;
    try {
      await docxGenerationService.downloadDocx({
        signed_url: cawDocxResult.signed_url,
        docx_storage_path: cawDocxResult.docx_storage_path,
        filename: cawDocxResult.filename,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao baixar DOCX.';
      alert(msg);
    }
  };

  const handleGenerateExperimentalDocx = async (inputId?: string) => {
    const targetId = inputId || persistedSnapshot?.legal_case_input_id;
    if (!targetId || isGeneratingDocx) return;

    setIsGeneratingDocx(true);
    setDocxError(null);
    setDocxResult(null);

    try {
      const result = await experimentalDocxService.generateDocx(targetId);
      setDocxResult(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha na renderização do arquivo DOCX.';
      console.error('Erro na geração experimental de DOCX:', err);
      setDocxError(msg);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const handleGeneratePhase41Docx = async (inputId?: string) => {
    const targetId = inputId || persistedSnapshot?.legal_case_input_id;
    if (isGeneratingDocx) return;

    setIsGeneratingDocx(true);
    setDocxError(null);
    setDocxResult(null);

    try {
      const result = await experimentalDocxService.generatePhase41Docx(targetId || OFFICIAL_HOMOLOGATED_INPUT_ID);
      setDocxResult(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha na renderização do arquivo DOCX da Fase 4.1.';
      console.error('Erro na geração Fase 4.1 de DOCX:', err);
      setDocxError(msg);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const handleDownloadGeneratedDocx = () => {
    if (!docxResult) return;
    experimentalDocxService.downloadDocxFile(docxResult.blob, docxResult.filename);
  };

  const handleLoadOfficialSnapshot = () => {
    setPersistedSnapshot({
      generation_job_id: OFFICIAL_HOMOLOGATED_JOB_ID,
      legal_case_input_id: OFFICIAL_HOMOLOGATED_INPUT_ID,
      included_blocks_count: 28,
      linked_requests_count: 14,
    });
    setDocxResult(null);
    setDocxError(null);
    setCawDocxResult(null);
    setCawDocxError(null);
    setCawDocxStep('idle');
  };

  // Avaliação em tempo real pelo motor de regras
  const evaluation = useMemo(() => {
    return ruleEngine.preview(formData);
  }, [formData]);

  const activeBlocksCount = evaluation.evaluations.filter((e) => e.included).length;

  const isCurrentPieceHomologated = isPieceHomologated(formData.document_piece);

  // Preenchimento do caso de homologação PME
  const handleQuickFill = () => {
    setFormData({
      ...HOMOLOGATED_CASE_DEFAULTS,
    });

    const samplePdfContent =
      '%PDF-1.41 0 obj<</Type/Catalog/Pages 2 0 R>>endobj2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobjxref0 40000000000 65535 f 0000000009 00000 n 0000000052 00000 n 0000000101 00000 n trailer<</Size 4/Root 1 0 R>>startxref178%%EOF';
    const sampleBlob = new Blob([samplePdfContent], { type: 'application/pdf' });
    const quickFile = new File([sampleBlob], 'Autos_0802491_SulAmerica.pdf', {
      type: 'application/pdf',
    });

    setSelectedFile({
      name: quickFile.name,
      size: quickFile.size,
      fileObj: quickFile,
    });

    setClientErrors({});
  };

  const updateField = <K extends keyof LegalFormData>(field: K, val: LegalFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    setClientErrors((prev) => {
      const copy = { ...prev };
      delete copy[field as string];
      return copy;
    });
  };

  const toggleAdversePartyNature = (type: AdversePartyNature) => {
    const current = formData.adverse_party_nature;
    let next: AdversePartyNature[];
    if (current.includes(type)) {
      next = current.filter((t) => t !== type);
    } else {
      next = [...current, type];
    }
    updateField('adverse_party_nature', next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const selectedTemplate = approvedTemplates.find(template => template.id === selectedTemplateId);
    if (!selectedTemplate && selectedTemplateId!==INSTITUTIONAL_TEMPLATE_ID) { setClientErrors({ submit: 'Selecione um modelo homologado antes de produzir a peça.' }); return; }

    // Validação formal
    const check = ruleEngine.evaluate(formData);
    if (!check.isValid) {
      const errMap: Record<string, string> = {};
      check.errors.forEach((err) => {
        errMap[err.field] = err.message;
      });
      setClientErrors(errMap);
      setIsMapaModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    setProgressStatus('Iniciando persistência do snapshot...');
    setPersistedSnapshot(null);

    try {
      const result = await deterministicGenerationService.saveDeterministicSnapshot(
        {
          ...formData,
          source_file: selectedFile?.fileObj,
        },
        (statusText) => {
          setProgressStatus(statusText);
        }
      );

      if(selectedTemplate) await legalProductionService.bindGeneration(result.generation_job_id, selectedTemplate);

      setPersistedSnapshot({
        generation_job_id: result.generation_job_id,
        legal_case_input_id: result.legal_case_input_id,
        included_blocks_count: result.included_blocks_count,
        linked_requests_count: result.linked_requests_count,
      });
      setIsSubmitting(false);
      setProgressStatus('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      console.error('Erro ao salvar snapshot jurídico:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao processar a persistência do snapshot.';
      setClientErrors({ submit: msg });
      setIsSubmitting(false);
      setProgressStatus('');
    }
  };

  return (
    <WorkspacePage className="vipaz-production">
      <WorkspacePageHeader
        eyebrow={organization.name}
        title="Delivery"
        description="Informe os dados do caso, defina as questões jurídicas aplicáveis e revise a estrutura antes de produzir o documento."
        actions={<>
          <button
            type="button"
            onClick={handleQuickFill}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preencher exemplo</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMapaModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Revisar estrutura ({activeBlocksCount})</span>
          </button>
        </>}
      />

      {/* Confirmação Discreta de Snapshot Persistido (Fase 3) */}
      {persistedSnapshot && (
        <div
          id="persisted-snapshot-confirmation"
          className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-slate-100 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <span>Estrutura salva com sucesso</span>
                </h3>
                <p className="text-xs text-slate-400">Os dados do caso e a estrutura jurídica foram registrados. O documento oficial já pode ser produzido.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPersistedSnapshot(null);
                setDocxResult(null);
                setDocxError(null);
              }}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition"
            >
              Fechar
            </button>
          </div>

          {/* Documento pronto para produção */}
          
          <div className="pt-4 border-t border-indigo-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <Workflow className="w-4 h-4 text-indigo-400" />
                  <span>Produzir documento</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Gere a versão oficial em DOCX a partir da estrutura revisada.</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  id="btn-generate-caw-docx"
                  onClick={() => handleGenerateCawDocx(persistedSnapshot.generation_job_id)}
                  disabled={isGeneratingCawDocx}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isGeneratingCawDocx ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{cawDocxStepMessage || 'Processando no motor CAW...'}</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-4 h-4 text-slate-950" />
                      <span>Gerar DOCX</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Pipeline de 7 Estados Progressivos */}
            {(isGeneratingCawDocx || cawDocxStep !== 'idle') && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/20 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">Produção do documento</span>
                  <span className="font-mono text-indigo-300">{cawDocxStepMessage}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 text-[10px]">
                  <div className={`p-2 rounded-lg text-center transition ${
                    cawDocxStep === 'assembling_payload'
                      ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 font-bold'
                      : ['sending_to_n8n', 'processing_carbone', 'saving_to_storage', 'confirming_document', 'completed'].includes(cawDocxStep)
                      ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/20'
                      : 'bg-slate-800/40 text-slate-500'
                  }`}>
                    1. Preparando
                  </div>

                  <div className={`p-2 rounded-lg text-center transition ${
                    cawDocxStep === 'sending_to_n8n'
                      ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 font-bold'
                      : ['processing_carbone', 'saving_to_storage', 'confirming_document', 'completed'].includes(cawDocxStep)
                      ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/20'
                      : 'bg-slate-800/40 text-slate-500'
                  }`}>
                    2. Enviando
                  </div>

                  <div className={`p-2 rounded-lg text-center transition ${
                    cawDocxStep === 'processing_carbone'
                      ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 font-bold'
                      : ['saving_to_storage', 'confirming_document', 'completed'].includes(cawDocxStep)
                      ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/20'
                      : 'bg-slate-800/40 text-slate-500'
                  }`}>
                    3. Formatando
                  </div>

                  <div className={`p-2 rounded-lg text-center transition ${
                    cawDocxStep === 'saving_to_storage'
                      ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 font-bold'
                      : ['confirming_document', 'completed'].includes(cawDocxStep)
                      ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/20'
                      : 'bg-slate-800/40 text-slate-500'
                  }`}>
                    4. Salvando
                  </div>

                  <div className={`p-2 rounded-lg text-center transition ${
                    cawDocxStep === 'confirming_document'
                      ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 font-bold'
                      : cawDocxStep === 'completed'
                      ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/20'
                      : 'bg-slate-800/40 text-slate-500'
                  }`}>
                    5. Finalizando
                  </div>

                  <div className={`p-2 rounded-lg text-center transition ${
                    cawDocxStep === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : cawDocxStep === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                      : 'bg-slate-800/40 text-slate-500'
                  }`}>
                    {cawDocxStep === 'error' ? 'Falha' : 'Concluído'}
                  </div>
                </div>
              </div>
            )}

            {/* Alerta de Erro Sem Falso Positivo */}
            {cawDocxError && (
              <div
                id="caw-docx-error"
                className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-rose-300">Não foi possível gerar o documento:</span>
                  <span className="text-rose-200/90">{cawDocxError}</span>
                </div>
              </div>
            )}

            {/* Resultado Final da Geração DOCX CAW */}
            {cawDocxResult && (
              <div
                id="caw-docx-result"
                className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/40 space-y-3 animate-in fade-in duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">
                          {cawDocxResult.filename}
                        </span>
                        {cawDocxResult.duration_ms && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({(cawDocxResult.duration_ms / 1000).toFixed(1)}s)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Documento gerado com {cawDocxResult.included_blocks_count} blocos e {cawDocxResult.linked_requests_count} pedidos vinculados.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-download-caw-docx"
                      onClick={handleDownloadCawDocx}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs transition shadow-md shadow-indigo-500/20 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Baixar DOCX</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate(`/app/${organization.slug}/geracoes/${cawDocxResult.job_id}`)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition cursor-pointer"
                    >
                      <span>Ver produção</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
                {cawDocxResult.document_id && <div className="border-t border-slate-700 pt-3">
                  <p className="mb-2 text-[11px] text-slate-400">Revisão humana obrigatória</p>
                  <div className="flex flex-wrap gap-2"><button type="button" disabled={reviewBusy} onClick={() => void updateReview('awaiting_review')} className="rounded-[5px] border border-cyan-500 px-3 py-2 text-xs text-cyan-300 disabled:opacity-50">Enviar para revisão</button><button type="button" disabled={reviewBusy} onClick={() => void updateReview('changes_requested')} className="rounded-[5px] border border-amber-500 px-3 py-2 text-xs text-amber-300 disabled:opacity-50">Solicitar ajustes</button><button type="button" disabled={reviewBusy} onClick={() => void updateReview('approved')} className="rounded-[5px] border border-emerald-500 px-3 py-2 text-xs text-emerald-300 disabled:opacity-50">Aprovar documento</button></div>
                  {reviewMessage && <p role="status" className="mt-2 text-xs text-slate-300">{reviewMessage}</p>}
                </div>}
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="vipaz-card rounded-[5px] p-5">
          <label className="text-xs font-semibold uppercase tracking-wider vipaz-text-primary">Modelo homologado
            <select required className="mt-3 block w-full rounded-[5px] border vipaz-border-subtle bg-transparent p-3 text-sm" value={selectedTemplateId} onChange={event => setSelectedTemplateId(event.target.value)}>
              <option value="">Selecione a versão aprovada</option>
              <option value={INSTITUTIONAL_TEMPLATE_ID}>Arquitetura institucional homologada · v1.0</option>
              {approvedTemplates.filter(template => template.document_type === formData.document_piece || template.document_type === 'Outros').map(template => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}
            </select>
          </label>
          {templateMessage && <p role="status" className="mt-3 text-xs text-amber-400">{templateMessage}</p>}
        </section>
        {/* SEÇÃO 01: TIPO DE PEÇA PROCESSUAL */}
        <div className="p-6 rounded-2xl vipaz-card space-y-4">
          <div className="flex items-center justify-between border-b vipaz-border-subtle pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider vipaz-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded vipaz-surface-subtle vipaz-text-brand flex items-center justify-center font-mono text-[10px]">
                01
              </span>
              <span>Tipo de Peça Processual</span>
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">
              {isCurrentPieceHomologated ? 'Homologada para Geração' : 'Em Desenvolvimento'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DOCUMENT_PIECES_CATALOG.map((piece) => {
              const isSelected = formData.document_piece === piece.id;
              return (
                <button
                  key={piece.id}
                  type="button"
                  onClick={() => updateField('document_piece', piece.id)}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/60 ring-1 ring-cyan-500/40'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold text-slate-100">{piece.label}</span>
                    <span
                      className={`shrink-0 whitespace-nowrap text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                        piece.isHomologated
                          ? 'bg-white text-emerald-700 border border-emerald-500'
                          : 'bg-white text-amber-700 border border-amber-500'
                      }`}
                    >
                      {piece.isHomologated ? 'Homologada' : 'Em Dev'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{piece.description}</p>
                </button>
              );
            })}
          </div>

          {!isCurrentPieceHomologated && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-400 dark:border-amber-700 rounded-xl text-xs text-amber-950 dark:text-amber-100 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Fluxo final de produção ainda em configuração
                </p>
                <p className="text-[11px] text-amber-950 dark:text-amber-100 mt-0.5">
                  A peça processual selecionada (<strong>{formData.document_piece}</strong>) está em fase de modelagem de regras.
                  Para prosseguir com a montagem determinística e download do DOCX, selecione <strong>Contestação</strong>.
                </p>
              </div>
            </div>
          )}
        </div>


        {/* SEÇÃO 02: ANEXO DOS AUTOS PROCESSUAIS */}
        <div className="p-6 rounded-2xl vipaz-card space-y-4">
          <div className="flex items-center justify-between border-b vipaz-border-subtle pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider vipaz-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded vipaz-surface-subtle vipaz-text-brand flex items-center justify-center font-mono text-[10px]">
                02
              </span>
              <span>Anexo dos Autos Processuais (PDF)</span>
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">{isAgravo ? 'Obrigatório para IA' : 'Opcional'}</span>
          </div>

          <PdfUploader
            disabled={isSubmitting}
            selectedFile={selectedFile}
            onFileSelect={(file) => {
              setSelectedFile(file);
              setClientErrors((prev) => {
                const copy = { ...prev };
                delete copy.file;
                return copy;
              });
            }}
            onFileRemove={() => setSelectedFile(null)}
          />
        </div>



        {clientErrors.submit && (
          <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{clientErrors.submit}</span>
          </div>
        )}

        {/* SEÇÃO 03: IDENTIFICAÇÃO DO PROCESSO & JUÍZO */}
        <div className="p-6 rounded-2xl vipaz-card space-y-5">
          <div className="flex items-center justify-between border-b vipaz-border-subtle pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider vipaz-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded vipaz-surface-subtle vipaz-text-brand flex items-center justify-center font-mono text-[10px]">
                03
              </span>
              <span>Identificação do Processo & Juízo Competente</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Dados do juízo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* NÚMERO DO PROCESSO */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-medium text-slate-300">
                NÚMERO DO PROCESSO (CNJ) <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={formData.process_number}
                onChange={(e) => updateField('process_number', e.target.value)}
                placeholder="Ex: 0802491-32.2024.8.19.0001"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
              />
              {clientErrors.process_number && (
                <p className="text-[11px] text-rose-400">{clientErrors.process_number}</p>
              )}
            </div>

            {/* UNIDADE FEDERATIVA (UF) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                ESTADO (UF) <span className="text-cyan-400">*</span>
              </label>
              <select
                disabled={isSubmitting}
                value={formData.uf}
                onChange={(e) => updateField('uf', e.target.value as UfType)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 font-medium"
              >
                <option value="RJ">RJ — Rio de Janeiro</option>
                <option value="SP">SP — São Paulo</option>
                <option value="MG">MG — Minas Gerais</option>
                <option value="BA">BA — Bahia</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            {/* TIPO DE JUÍZO */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-medium text-slate-300">
                JUÍZO COMPETENTE <span className="text-cyan-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { updateField('court_type', 'Vara Cível'); updateField('court_type_custom', ''); }}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                    formData.court_type === 'Vara Cível' && !formData.court_type_custom?.trim()
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-700 dark:text-cyan-200'
                      : 'vipaz-surface vipaz-border vipaz-text-secondary'
                  }`}
                >Vara Cível</button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { updateField('court_type', 'Juizado Especial Cível'); updateField('court_type_custom', ''); }}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                    formData.court_type === 'Juizado Especial Cível' && !formData.court_type_custom?.trim()
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-700 dark:text-cyan-200'
                      : 'vipaz-surface vipaz-border vipaz-text-secondary'
                  }`}
                >Juizado Especial</button>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={formData.court_type_custom || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateField('court_type_custom', value);
                    if (value.trim()) updateField('court_type', 'Outro');
                  }}
                  onFocus={(e) => { if (!e.currentTarget.value) e.currentTarget.placeholder = 'Ex.: Vara Empresarial'; }}
                  onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.placeholder = 'Outro'; }}
                  placeholder="Outro"
                  aria-label="Outro juízo competente"
                  className={`rounded-xl border px-3 py-2 text-xs font-medium outline-none transition ${
                    formData.court_type === 'Outro' && formData.court_type_custom?.trim()
                      ? 'bg-cyan-500/15 border-cyan-500/70 text-cyan-800 dark:text-cyan-100 ring-1 ring-cyan-500/30'
                      : 'vipaz-surface vipaz-border vipaz-text-secondary focus:border-cyan-500'
                  }`}
                />
              </div>
            </div>

            {/* NÚMERO DA VARA */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Nº DA VARA / JUIZADO <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={formData.court_number}
                onChange={(e) => updateField('court_number', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Ex: 2"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
              />
              {clientErrors.court_number && (
                <p className="text-[11px] text-rose-400">{clientErrors.court_number}</p>
              )}
            </div>

            {/* COMARCA */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                COMARCA <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={formData.district}
                onChange={(e) => updateField('district', e.target.value)}
                placeholder="Ex: Capital"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
              />
              {clientErrors.district && (
                <p className="text-[11px] text-rose-400">{clientErrors.district}</p>
              )}
            </div>
          </div>

          {/* REGIONAL (OPCIONAL) */}
          <div className="pt-1">
            <label className="block text-xs font-medium text-slate-400">
              FORO REGIONAL / SUBSEÇÃO
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              value={formData.court_regional || ''}
              onChange={(e) => updateField('court_regional', e.target.value)}
              placeholder="Ex: Barra da Tijuca, Santo Amaro, etc. (deixe em branco se for Foro Central)"
              className="w-full mt-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
            />
          </div>
        </div>

        {/* SEÇÃO 04: PARTES & NATUREZA */}
        <div className="p-6 rounded-2xl vipaz-card space-y-5">
          <div className="flex items-center justify-between border-b vipaz-border-subtle pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider vipaz-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded vipaz-surface-subtle vipaz-text-brand flex items-center justify-center font-mono text-[10px]">
                04
              </span>
              <span>Partes do Processo & Natureza Jurídica</span>
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">Regras de Ilegitimidade</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PARTE REPRESENTADA */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                PARTE REPRESENTADA (CLIENTE) <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={formData.client}
                onChange={(e) => updateField('client', e.target.value)}
                placeholder="Ex: Sul América Companhia de Seguro Saúde"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
              />
              {clientErrors.client && (
                <p className="text-[11px] text-rose-400">{clientErrors.client}</p>
              )}
            </div>

            {/* PARTE ADVERSA */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                PARTE ADVERSA (AUTOR/EMPRESA) <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                value={formData.opposing_party}
                onChange={(e) => updateField('opposing_party', e.target.value)}
                placeholder="Ex: MG Métodos Gráficos Ltda. e outros"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
              />
              {clientErrors.opposing_party && (
                <p className="text-[11px] text-rose-400">{clientErrors.opposing_party}</p>
              )}
            </div>
          </div>

          {!isAgravo && (<>          {/* NATUREZA DA PARTE ADVERSA */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-300 mb-2">
              COMPOSIÇÃO DO POLO ATIVO ADVERSO <span className="text-cyan-400">*</span>
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-700">
                <input
                  type="checkbox"
                  checked={formData.adverse_party_nature.includes('pj')}
                  onChange={() => toggleAdversePartyNature('pj')}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span>Pessoa Jurídica (Empresa / Estipulante)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-700">
                <input
                  type="checkbox"
                  checked={formData.adverse_party_nature.includes('pf')}
                  onChange={() => toggleAdversePartyNature('pf')}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span>Pessoa Física (Sócio / Beneficiário)</span>
              </label>
            </div>
            {clientErrors.adverse_party_nature && (
              <p className="text-[11px] text-rose-400 mt-1">
                {clientErrors.adverse_party_nature}
              </p>
            )}
          </div>
</>)}
        </div>

        {/* SEÇÃO 05: OBJETO DA LIDE (CLASSIFICAÇÃO ESTRUTURADA) */}
        <div className="p-6 rounded-2xl vipaz-card space-y-5">
          <div className="flex items-center justify-between border-b vipaz-border-subtle pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider vipaz-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded vipaz-surface-subtle vipaz-text-brand flex items-center justify-center font-mono text-[10px]">
                05
              </span>
              <span>Objeto da Lide (Classificação Estruturada)</span>
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">Taxonomia Regulatória ANS</span>
          </div>

          <div className="space-y-3">
            {/* 1. Reajuste Anual */}
            <div
              className={`p-4 rounded-xl border transition ${
                formData.dispute_objects.reajuste_anual
                  ? 'bg-cyan-950/20 border-cyan-500/40'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(formData.dispute_objects.reajuste_anual)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateField('dispute_objects', {
                      ...formData.dispute_objects,
                      reajuste_anual: checked,
                      reajuste_anual_modalidade: formData.dispute_objects.reajuste_anual_modalidade || 'pme',
                      reajuste_pme: checked && (formData.dispute_objects.reajuste_anual_modalidade || 'pme') === 'pme',
                      reajuste_pme_anual: checked && (formData.dispute_objects.reajuste_anual_modalidade || 'pme') === 'pme',
                    });
                  }}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-xs font-semibold text-slate-200">Reajuste Anual</span>
              </label>

              {formData.dispute_objects.reajuste_anual && (
                <div className="mt-3 ml-7 flex items-center gap-4 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium">Modalidade:</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                    <input
                      type="radio"
                      name="reajuste_anual_modalidade"
                      value="pme"
                      checked={formData.dispute_objects.reajuste_anual_modalidade !== 'individual'}
                      onChange={() => {
                        updateField('dispute_objects', {
                          ...formData.dispute_objects,
                          reajuste_anual_modalidade: 'pme',
                          reajuste_pme: true,
                          reajuste_pme_anual: true,
                        });
                      }}
                      className="text-cyan-500 focus:ring-cyan-400"
                    />
                    <span>PME</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                    <input
                      type="radio"
                      name="reajuste_anual_modalidade"
                      value="individual"
                      checked={formData.dispute_objects.reajuste_anual_modalidade === 'individual'}
                      onChange={() => {
                        updateField('dispute_objects', {
                          ...formData.dispute_objects,
                          reajuste_anual_modalidade: 'individual',
                          reajuste_pme: false,
                          reajuste_pme_anual: false,
                        });
                      }}
                      className="text-cyan-500 focus:ring-cyan-400"
                    />
                    <span>Individual</span>
                  </label>
                </div>
              )}
            </div>

            {/* 2. Reajuste Etário */}
            <div
              className={`p-4 rounded-xl border transition ${
                formData.dispute_objects.reajuste_etario
                  ? 'bg-cyan-950/20 border-cyan-500/40'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(formData.dispute_objects.reajuste_etario)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateField('dispute_objects', {
                      ...formData.dispute_objects,
                      reajuste_etario: checked,
                      reajuste_etario_modalidade: formData.dispute_objects.reajuste_etario_modalidade || 'pme',
                      reajuste_pme_etario: checked && (formData.dispute_objects.reajuste_etario_modalidade || 'pme') === 'pme',
                    });
                  }}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-xs font-semibold text-slate-200">Reajuste Etário</span>
              </label>

              {formData.dispute_objects.reajuste_etario && (
                <div className="mt-3 ml-7 flex items-center gap-4 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium">Modalidade:</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                    <input
                      type="radio"
                      name="reajuste_etario_modalidade"
                      value="pme"
                      checked={formData.dispute_objects.reajuste_etario_modalidade !== 'individual'}
                      onChange={() => {
                        updateField('dispute_objects', {
                          ...formData.dispute_objects,
                          reajuste_etario_modalidade: 'pme',
                          reajuste_pme_etario: true,
                        });
                      }}
                      className="text-cyan-500 focus:ring-cyan-400"
                    />
                    <span>PME</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                    <input
                      type="radio"
                      name="reajuste_etario_modalidade"
                      value="individual"
                      checked={formData.dispute_objects.reajuste_etario_modalidade === 'individual'}
                      onChange={() => {
                        updateField('dispute_objects', {
                          ...formData.dispute_objects,
                          reajuste_etario_modalidade: 'individual',
                          reajuste_pme_etario: false,
                        });
                      }}
                      className="text-cyan-500 focus:ring-cyan-400"
                    />
                    <span>Individual</span>
                  </label>
                </div>
              )}
            </div>

            {/* 3. Aviso Prévio */}
            <div
              className={`p-4 rounded-xl border transition ${
                formData.dispute_objects.aviso_previo
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-slate-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(formData.dispute_objects.aviso_previo)}
                  onChange={(e) => {
                    updateField('dispute_objects', {
                      ...formData.dispute_objects,
                      aviso_previo: e.target.checked,
                    });
                  }}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-xs font-semibold text-slate-200">Aviso Prévio</span>
              </label>
            </div>

            {/* 4. Prêmio Complementar */}
            <div
              className={`p-4 rounded-xl border transition ${
                formData.dispute_objects.premio_complementar
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-slate-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(formData.dispute_objects.premio_complementar)}
                  onChange={(e) => {
                    updateField('dispute_objects', {
                      ...formData.dispute_objects,
                      premio_complementar: e.target.checked,
                    });
                  }}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-xs font-semibold text-slate-200">Prêmio Complementar</span>
              </label>
            </div>

            {/* 5. Outro */}
            <div
              className={`p-4 rounded-xl border transition ${
                formData.dispute_objects.outro
                  ? 'bg-cyan-950/20 border-cyan-500/40'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(formData.dispute_objects.outro)}
                  onChange={(e) => {
                    updateField('dispute_objects', {
                      ...formData.dispute_objects,
                      outro: e.target.checked,
                    });
                  }}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-xs font-semibold text-slate-200">Outro</span>
              </label>

              {formData.dispute_objects.outro && (
                <div className="mt-3 ml-7 space-y-1.5 pt-2 border-t border-slate-800/80">
                  <label className="block text-[11px] font-medium text-cyan-300">
                    Especificação do Objeto <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.dispute_objects.outro_descricao || ''}
                    onChange={(e) =>
                      updateField('dispute_objects', {
                        ...formData.dispute_objects,
                        outro_descricao: e.target.value,
                      })
                    }
                    placeholder="Especifique detalhadamente o objeto da lide."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  {clientErrors['dispute_objects.outro_descricao'] && (
                    <p className="text-[11px] text-rose-400">
                      {clientErrors['dispute_objects.outro_descricao']}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {formData.document_piece === 'Contestação' && (<>{/* SEÇÃO 06: CONTEXTO DA CONTESTAÇÃO */}
        <div className="p-6 rounded-2xl vipaz-card space-y-5">
          <div className="flex items-center justify-between border-b vipaz-border-subtle pb-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider vipaz-text-secondary flex items-center gap-2">
                <span className="w-5 h-5 rounded vipaz-surface-subtle vipaz-text-brand flex items-center justify-center font-mono text-[10px]">06</span>
                <span>Contexto da Contestação</span>
              </h3>
              <p className="mt-1 text-[11px] vipaz-text-muted">Gere cada campo a partir dos autos, revise e edite antes da produção final.</p>
            </div>
            <button type="button" onClick={handleGenerateAllContestacaoAiFields} disabled={Boolean(generatingAiField)} className="vipaz-ai-button">
              <Sparkles className="w-3.5 h-3.5"/>Gerar todos com IA
            </button>
          </div>
          {aiFieldError && <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-100 text-xs">{aiFieldError}</div>}
          {([
            ['executive_summary','EMENTA EXECUTIVA (SÍNTESE INTRODUTÓRIA)'],
            ['claim_summary','RESUMO DA PETIÇÃO INICIAL'],
            ['controversy_delimitation','EXATA DELIMITAÇÃO DA CONTROVÉRSIA'],
          ] as [LegalAiField,string][]).map(([field,label]) => (
            <div key={field} className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="vipaz-field-label mb-0">{label}</label>
                <button type="button" onClick={()=>handleGenerateAiField(field)} disabled={Boolean(generatingAiField)} className="vipaz-ai-button">
                  {generatingAiField===field?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Sparkles className="w-3.5 h-3.5"/>}
                  {generatingAiField===field?'Gerando…':String(formData[field as keyof LegalFormData]||'').trim()?'Gerar novamente com IA':'Gerar com IA'}
                </button>
              </div>
              <textarea
                rows={field==='executive_summary'?6:10}
                disabled={isSubmitting}
                value={String(formData[field as keyof LegalFormData]||'')}
                onChange={e=>updateField(field as keyof LegalFormData,e.target.value as never)}
                className="vipaz-input resize-y leading-6 min-h-[160px]"
                placeholder="O texto gerado aparecerá aqui e permanecerá totalmente editável."
              />
              {clientErrors[field] && <p className="text-[11px] text-rose-600 dark:text-rose-300">{clientErrors[field]}</p>}
            </div>
          ))}
        </div>

        {/* SEÇÃO 07: TUTELA & DANO MORAL */}
        <div className="p-6 rounded-2xl vipaz-card space-y-5">
          <div className="flex items-center justify-between border-b vipaz-border-subtle pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider vipaz-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded vipaz-surface-subtle vipaz-text-brand flex items-center justify-center font-mono text-[10px]">
                07
              </span>
              <span>Tutela de Urgência & Dano Moral</span>
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">Seleção do caso</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border vipaz-border vipaz-surface-subtle space-y-2">
              <div className="font-semibold vipaz-text-primary">Tutela de Urgência</div>
              <p className="text-[11px] vipaz-text-muted">Situação do pedido de tutela de urgência no processo.</p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['not_requested','denied','granted'] as const).map(st=>(
                  <button key={st} type="button" onClick={()=>updateField('injunction_status',st)}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] transition ${formData.injunction_status===st?'bg-cyan-500/15 border-cyan-500/60 text-cyan-800 dark:text-cyan-100 font-semibold':'vipaz-surface vipaz-border vipaz-text-secondary'}`}>
                    {st==='not_requested'?'Não Requerida':st==='denied'?'Indeferida':'Deferida'}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border vipaz-border vipaz-surface-subtle space-y-2">
              <div className="font-semibold vipaz-text-primary">Dano Moral</div>
              <p className="text-[11px] vipaz-text-muted">Indique se há pedido de indenização por dano moral.</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={()=>updateField('moral_damages_status','not_claimed')}
                  className={`py-1.5 rounded-lg border text-[11px] transition ${formData.moral_damages_status==='not_claimed'?'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-950 font-semibold':'vipaz-surface vipaz-border vipaz-text-secondary'}`}>Não Pleiteado</button>
                <button type="button" onClick={()=>updateField('moral_damages_status','claimed')}
                  className={`py-1.5 rounded-lg border text-[11px] transition ${formData.moral_damages_status==='claimed'?'bg-cyan-500/15 border-cyan-500/60 text-cyan-800 dark:text-cyan-100 font-semibold':'vipaz-surface vipaz-border vipaz-text-secondary'}`}>Foi Pleiteado</button>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 08: PRELIMINARES & PREJUDICIAIS */}
        <div className="p-6 rounded-2xl vipaz-card space-y-5">
          <div className="flex items-center justify-between border-b vipaz-border-subtle pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider vipaz-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded vipaz-surface-subtle vipaz-text-brand flex items-center justify-center font-mono text-[10px]">
                08
              </span>
              <span>Preliminares & Prejudiciais de Mérito</span>
            </h3>
            <span className="text-[11px] text-cyan-400 font-mono">Questões aplicáveis</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {/* ILEGITIMIDADE ATIVA */}
            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-900/60 space-y-2">
              <div className="font-semibold text-slate-200">Ilegitimidade Ativa</div>
              <p className="text-[11px] text-slate-400">
                Impugnação à legitimidade ativa da parte adversa.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateField('standing_challenge_status', 'do_not_challenge')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.standing_challenge_status === 'do_not_challenge'
                      ? 'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-950 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => updateField('standing_challenge_status', 'challenge')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.standing_challenge_status === 'challenge'
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Impugnar
                </button>
              </div>
            </div>

            {/* IMPUGNAÇÃO À GRATUIDADE */}
            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-900/60 space-y-2">
              <div className="font-semibold text-slate-200">Gratuidade de Justiça</div>
              <p className="text-[11px] text-slate-400">
                Impugnação ao benefício processual da justiça gratuita.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateField('legal_aid_status', 'do_not_challenge')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.legal_aid_status !== 'challenge'
                      ? 'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-950 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => updateField('legal_aid_status', 'challenge')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.legal_aid_status === 'challenge'
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Impugnar
                </button>
              </div>
              {formData.legal_aid_status === 'challenge' && (
                <div className="pt-1">
                  <select
                    value={formData.legal_aid_target || 'both'}
                    onChange={(e) =>
                      updateField('legal_aid_target', e.target.value as 'pf' | 'pj' | 'both')
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-slate-200"
                  >
                    <option value="both">Alvo: Ambas (PF e PJ)</option>
                    <option value="pf">Alvo: Somente PF</option>
                    <option value="pj">Alvo: Somente PJ</option>
                  </select>
                </div>
              )}
            </div>

            {/* IMPUGNAÇÃO AO VALOR DA CAUSA */}
            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-900/60 space-y-2">
              <div className="font-semibold text-slate-200">Valor da Causa (Art. 293)</div>
              <p className="text-[11px] text-slate-400">
                Inadequação com base no proveito econômico real.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateField('claim_value_challenge_status', 'do_not_challenge')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.claim_value_challenge_status === 'do_not_challenge'
                      ? 'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-950 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => updateField('claim_value_challenge_status', 'challenge')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.claim_value_challenge_status === 'challenge'
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Impugnar
                </button>
              </div>
            </div>

            {/* INÉPCIA DA INICIAL */}
            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-900/60 space-y-2">
              <div className="font-semibold text-slate-200">Inépcia da Petição Inicial</div>
              <p className="text-[11px] text-slate-400">
                Ausência de lógica ou pedidos indeterminados.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateField('petition_aptitude_status', 'do_not_challenge')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.petition_aptitude_status === 'do_not_challenge'
                      ? 'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-950 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => updateField('petition_aptitude_status', 'challenge')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.petition_aptitude_status === 'challenge'
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Argui Inépcia
                </button>
              </div>
            </div>

            {/* PRESCRIÇÃO TRIENAL */}
            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-900/60 space-y-2">
              <div className="font-semibold text-slate-200">Prescrição Trienal (Tema 610)</div>
              <p className="text-[11px] text-slate-400">
                Prazo de 3 anos para restituição de parcelas (STJ).
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateField('prescription_triennial_status', 'do_not_argue')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.prescription_triennial_status === 'do_not_argue'
                      ? 'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-950 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => updateField('prescription_triennial_status', 'argue')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.prescription_triennial_status === 'argue'
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Arguir Trienal
                </button>
              </div>
            </div>

            {/* PRESCRIÇÃO DECENAL */}
            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-900/60 space-y-2">
              <div className="font-semibold text-slate-200">Prescrição Decenal (Art. 205 CC)</div>
              <p className="text-[11px] text-slate-400">
                Prazo geral de 10 anos / inadimplemento contratual.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateField('prescription_decennial_status', 'do_not_argue')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.prescription_decennial_status === 'do_not_argue'
                      ? 'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-950 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => updateField('prescription_decennial_status', 'argue')}
                  className={`flex-1 py-1.5 rounded-lg border text-[11px] transition ${
                    formData.prescription_decennial_status === 'argue'
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Arguir Decenal
                </button>
              </div>
            </div>

            {/* REPETIÇÃO DE INDÉBITO */}
            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-900/60 space-y-2">
              <div className="font-semibold text-slate-200">Repetição de Indébito</div>
              <p className="text-[11px] text-slate-400">
                Defesa contra restituição simples ou em dobro.
              </p>
              <select
                value={formData.repetition_status}
                onChange={(e) =>
                  updateField(
                    'repetition_status',
                    e.target.value as 'not_claimed' | 'simple' | 'double'
                  )
                }
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-slate-200"
              >
                <option value="not_claimed">Não foi pleiteada</option>
                <option value="simple">Foi pleiteada na forma simples</option>
                <option value="double">Foi pleiteada em dobro</option>
              </select>
            </div>
          </div>
        </div>

</>)}{isAgravo && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl vipaz-card space-y-5">
              <div className="flex items-center justify-between border-b vipaz-border-subtle pb-3">
                <div><h3 className="text-xs font-semibold uppercase tracking-wider vipaz-text-secondary">Contexto do Agravo de Instrumento</h3><p className="mt-1 text-[11px] vipaz-text-muted">A IA analisa os autos uma única vez e redige a peça completa para revisão.</p></div>
                <button type="button" onClick={handleGenerateAllAiFields} disabled={Boolean(generatingAiField)||isGeneratingCompleteAppeal} className="vipaz-ai-button">{isGeneratingCompleteAppeal?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Sparkles className="w-3.5 h-3.5"/>}{isGeneratingCompleteAppeal?'Gerando agravo…':'Gerar agravo completo'}</button>
              </div>
              {completeAppealProgress && <p role="status" className="rounded-[5px] border border-cyan-500/30 bg-cyan-950/30 p-3 text-xs text-cyan-200">{completeAppealProgress}</p>}
              {aiFieldError && <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-xs">{aiFieldError}</div>}
              <div className="grid gap-3 sm:grid-cols-2">
                {([['appeal_main_object','Objeto principal da demanda'],['appealed_decision','Decisão agravada'],['appeal_initial_claim','Pedidos da petição inicial'],['appeal_relevant_documents','Documentos relevantes'],['appeal_procedural_history','Histórico processual'],['appeal_specific_instructions','Instruções específicas']] as [keyof LegalFormData,string][]).map(([field,label])=><label key={field} className="vipaz-field-label">{label}<textarea rows={field==='appealed_decision'?5:3} className="vipaz-input mt-2 resize-y normal-case" value={String(formData[field]||'')} onChange={event=>updateField(field,event.target.value as never)} placeholder="A IA utilizará os autos e este contexto; complemente apenas se necessário."/></label>)}
              </div>
              {([
                ['executive_summary','EMENTA EXECUTIVA'],
                ['claim_summary','DO OBJETO DO RECURSO E SÍNTESE DA CONTROVÉRSIA'],
                ['appeal_effect_suspensive','DA NECESSIDADE DE CONCESSÃO DE EFEITO SUSPENSIVO'],
                ['appeal_mistaken_premise','DA PREMISSA EQUIVOCADA DA DECISÃO RECORRIDA'],
                ['appeal_fumus','DA INCONTESTÁVEL VEROSSIMILHANÇA OU PROBABILIDADE DO DIREITO (FUMUS BONI IURIS)'],
                ['appeal_periculum','DO IMINENTE RISCO DE DANO GRAVE E DE DIFÍCIL REPARAÇÃO (PERICULUM IN MORA)'],
                ...(countersecurityAllowed ? [['appeal_countersecurity','DO REQUERIMENTO SUBSIDIÁRIO DE CONTRACAUTELA CIVIL (ART. 300, § 1º, CPC)']] : []),
                ['appeal_final_requests','DOS REQUERIMENTOS FINAIS'],
              ] as [LegalAiField,string][]).map(([field,label])=><div key={field} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><label className="vipaz-field-label mb-0">{label}</label><button type="button" onClick={()=>handleGenerateAiField(field)} disabled={Boolean(generatingAiField)} className="vipaz-ai-button">{generatingAiField===field?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Sparkles className="w-3.5 h-3.5"/>}{generatingAiField===field?'Gerando…':String(formData[field as keyof LegalFormData]||'').trim()?'Gerar novamente com IA':'Gerar com IA'}</button></div>
                <textarea rows={field==='executive_summary'?6:10} value={String(formData[field as keyof LegalFormData]||'')} onChange={e=>updateField(field as keyof LegalFormData,e.target.value as never)} className="vipaz-input resize-y leading-6" placeholder="O texto gerado aparecerá aqui e permanecerá totalmente editável."/>
              </div>)}
              {!countersecurityAllowed && <p className="text-[11px] vipaz-text-muted border-t vipaz-border-subtle pt-4">O tópico de contracautela e o pedido subsidiário correspondente permanecem omitidos. Eles serão habilitados somente quando o objeto selecionado for Reajuste Anual e/ou Reajuste Etário.</p>}
            </div>
          </div>
        )}

        {/* BARRA INFERIOR DE AÇÃO & INSPEÇÃO */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMapaModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>Revisar estrutura ({activeBlocksCount})</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Estrutura pronta para revisão</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isCurrentPieceHomologated}
            className={`inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xl shrink-0 ${
              !isCurrentPieceHomologated
                ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-950/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>{progressStatus || 'SALVANDO...'}</span>
              </>
            ) : !isCurrentPieceHomologated ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>ARQUITETURA NÃO HOMOLOGADA</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>SALVAR E CONTINUAR</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal do Mapa da Peça */}
      <MapaDaPecaModal
        isOpen={isMapaModalOpen}
        onClose={() => setIsMapaModalOpen(false)}
        assembly={evaluation}
        errors={Object.entries(clientErrors).map(([field, message]) => ({ field, message }))}
        onConfirmGenerate={() => {
          setIsMapaModalOpen(false);
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }}
        isGenerating={isSubmitting}
        onResolveWithAi={handleResolvePendingWithAi}
        onApplyAiSuggestions={handleApplyIntakeSuggestions}
        aiSuggestions={intakeSuggestions}
        isResolvingWithAi={isResolvingIntake}
        aiResolutionError={intakeResolutionError}
      />
    </WorkspacePage>
  );
};
