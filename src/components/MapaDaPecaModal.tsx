/**
 * VIPAZ Jurídico — Componente: Mapa da Peça Processual
 * Pré-visualização determinística de blocos incluídos, excluídos e pedidos finais
 */

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  Scale,
  X,
  Code2,
  Info,
  Loader2,
} from 'lucide-react';
import { ResolvedDocumentAssembly, ValidationError } from '../domain/legal-engine/types';
import type { LegalIntakeSuggestion } from '../services/legalAiService';

interface MapaDaPecaModalProps {
  isOpen: boolean;
  onClose: () => void;
  assembly: ResolvedDocumentAssembly;
  errors: ValidationError[];
  onConfirmGenerate?: () => void;
  isGenerating?: boolean;
  onResolveWithAi?: () => void;
  onApplyAiSuggestions?: (fields: string[]) => void;
  aiSuggestions?: LegalIntakeSuggestion[];
  isResolvingWithAi?: boolean;
  aiResolutionError?: string | null;
}

export const MapaDaPecaModal: React.FC<MapaDaPecaModalProps> = ({
  isOpen,
  onClose,
  assembly,
  errors,
  onConfirmGenerate,
  isGenerating = false,
  onResolveWithAi,
  onApplyAiSuggestions,
  aiSuggestions = [],
  isResolvingWithAi = false,
  aiResolutionError = null,
}) => {
  const [activeTab, setActiveTab] = useState<'flow' | 'requests' | 'variables'>('flow');
  const [expandedBlockKey, setExpandedBlockKey] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setSelectedSuggestions(aiSuggestions.filter(item => item.status === 'suggested').map(item => item.field));
  }, [aiSuggestions]);

  if (!isOpen) return null;

  const includedEvaluations = assembly.evaluations.filter((e) => e.included);
  const excludedEvaluations = assembly.evaluations.filter((e) => !e.included);

  const toggleExpand = (key: string) => {
    setExpandedBlockKey(expandedBlockKey === key ? null : key);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'addressing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'executive_summary':
      case 'facts':
      case 'controversy':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'injunction':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'preliminary':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'merits':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'requests':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'closing':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="vipaz-map-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="mapa-da-peca-title" className="relative w-full max-w-5xl bg-[#0B1120] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 id="mapa-da-peca-title" className="text-lg font-semibold text-white tracking-wide">
                  Mapa da Peça — Motor Determinístico
                </h3>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {assembly.architecture.version}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {assembly.architecture.title} • Inspeção prévia de lógica formal e regras aplicadas
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar mapa da peça"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-[#080D1A] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>{includedEvaluations.length} Tópicos Ativos</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-500">
              <XCircle className="w-4 h-4" />
              <span>{excludedEvaluations.length} Excluídos</span>
            </div>
            <div className="flex items-center space-x-1.5 text-cyan-400">
              <Layers className="w-4 h-4" />
              <span>{assembly.includedRequests.length} Requerimentos Vinculados</span>
            </div>
          </div>

          {errors.length > 0 ? (
            <div className="flex items-center space-x-1.5 text-rose-400 font-medium bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.length} pendências no formulário</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Validação formal 100% aprovada</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0F172A]/40 px-6">
          <button
            onClick={() => setActiveTab('flow')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs tracking-wide transition-colors ${
              activeTab === 'flow'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Fluxo Lógico dos Tópicos ({assembly.evaluations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs tracking-wide transition-colors ${
              activeTab === 'requests'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Requerimentos Finais ({assembly.includedRequests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-xs tracking-wide transition-colors ${
              activeTab === 'variables'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Variáveis & Derivações</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errors.length > 0 && (
            <section className="rounded-[5px] border border-cyan-500/25 bg-cyan-500/5 p-4 space-y-3" aria-label="Saneamento assistido das pendências">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h4 className="text-sm font-semibold text-white">Saneamento assistido pelos autos</h4><p className="mt-1 text-xs text-slate-400">A IA propõe respostas rastreáveis. Você decide o que será aplicado.</p></div>
                {onResolveWithAi && <button type="button" onClick={onResolveWithAi} disabled={isResolvingWithAi} className="flex items-center justify-center gap-2 rounded-[5px] bg-cyan-400 px-4 py-2 text-xs font-semibold text-black disabled:opacity-50">{isResolvingWithAi?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}{isResolvingWithAi?'Analisando os autos…':'Resolver pendências com IA'}</button>}
              </div>
              {aiResolutionError && <p role="alert" className="rounded-[5px] border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{aiResolutionError}</p>}
              {!aiSuggestions.length && <div className="grid gap-2 sm:grid-cols-2">{errors.map(error=><div key={error.field} className="rounded-[5px] border border-slate-800 bg-black/20 p-3"><p className="font-mono text-[10px] text-cyan-400">{error.field}</p><p className="mt-1 text-xs text-slate-300">{error.message}</p></div>)}</div>}
              {aiSuggestions.length > 0 && <div className="space-y-2">{aiSuggestions.map(item=>{
                const available=item.status==='suggested'; const checked=selectedSuggestions.includes(item.field);
                return <label key={item.field} className={`block rounded-[5px] border p-3 ${available?'border-slate-700 bg-[#0F172A]':'border-amber-500/25 bg-amber-500/5'}`}>
                  <div className="flex items-start gap-3"><input type="checkbox" className="mt-1 accent-cyan-400" disabled={!available} checked={checked&&available} onChange={()=>setSelectedSuggestions(current=>checked?current.filter(field=>field!==item.field):[...current,item.field])}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-cyan-400">{item.field}</span><span className={`rounded px-1.5 py-0.5 text-[9px] uppercase ${item.confidence==='high'?'bg-emerald-500/15 text-emerald-300':item.confidence==='medium'?'bg-amber-500/15 text-amber-300':'bg-rose-500/15 text-rose-300'}`}>confiança {item.confidence}</span>{item.page&&<span className="text-[10px] text-slate-500">p. {item.page}</span>}</div><p className="mt-1 whitespace-pre-wrap text-xs text-white">{available?item.value:'Não localizado nos autos'}</p>{item.evidence&&<p className="mt-2 border-l-2 border-cyan-500/30 pl-2 text-[11px] text-slate-400">Evidência: {item.evidence}</p>}<p className="mt-1 text-[10px] text-slate-500">{item.explanation}</p></div></div>
                </label>})}
                {onApplyAiSuggestions&&<button type="button" disabled={!selectedSuggestions.length} onClick={()=>onApplyAiSuggestions(selectedSuggestions)} className="w-full rounded-[5px] border border-cyan-400/40 bg-cyan-400/10 px-4 py-2.5 text-xs font-semibold text-cyan-200 disabled:opacity-40">Aplicar {selectedSuggestions.length} proposta(s) selecionada(s)</button>}
              </div>}
            </section>
          )}
          {activeTab === 'flow' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                <span>Sequência rigorosa de tópicos que comporão a Contestação DOCX:</span>
                <span className="text-slate-500 font-mono">Ordem crescente de montagem</span>
              </div>

              {assembly.evaluations.map((item, idx) => {
                const isExpanded = expandedBlockKey === item.blockKey;
                const block = item.block;

                return (
                  <div
                    key={item.blockKey}
                    className={`rounded-xl border transition-all ${
                      item.included
                        ? 'bg-[#0F172A]/70 border-slate-800 hover:border-slate-700'
                        : 'bg-[#080D1A]/50 border-slate-900 opacity-60'
                    }`}
                  >
                    <div
                      onClick={() => toggleExpand(item.blockKey)}
                      className="flex items-center justify-between p-3.5 cursor-pointer select-none"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-300">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span
                              className={`text-sm font-medium ${
                                item.included ? 'text-white' : 'text-slate-500 line-through'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-medium rounded-full border uppercase ${getCategoryBadge(
                                item.category
                              )}`}
                            >
                              {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {item.reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                        {item.included ? (
                          <span className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ativo</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-xs text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-800 font-medium">
                            <XCircle className="w-3 h-3" />
                            <span>Inativo</span>
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && block && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-[#080D1A]/70 rounded-b-xl space-y-3">
                        <div className="text-xs text-slate-400 flex items-center space-x-2">
                          <Info className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            Identificador Técnico:{' '}
                            <code className="text-cyan-300 font-mono">{block.key}</code> •
                            Tipo: <span className="text-slate-200 capitalize">{block.contentType}</span>
                          </span>
                        </div>
                        <div className="p-3 bg-black/40 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                          {block.content}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-start space-x-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-400" />
                <span>
                  Cada item dos requerimentos finais é ativado exclusivamente se a respectiva tese
                  preliminar ou de mérito estiver presente na peça, garantindo coerência jurídica
                  absoluta.
                </span>
              </div>

              <div className="space-y-2">
                {assembly.includedRequests.map((req, idx) => (
                  <div
                    key={req.key}
                    className="p-3.5 rounded-xl bg-[#0F172A]/70 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-cyan-400">
                        {req.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Ordem {idx + 1}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-serif">
                      {req.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'variables' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Variáveis e dados institucionais derivados automaticamente pela UF e Juízo:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#0F172A]/70 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400">Endereçamento / Juízo:</div>
                  <div className="font-semibold text-white">
                    {assembly.resolvedVariables.JUIZO_ARTIGO}{' '}
                    {assembly.resolvedVariables.COURT_NUMBER}
                    {assembly.resolvedVariables.JUIZO_SUFFIX}{' '}
                    {assembly.resolvedVariables.REGIONAL_SE_HOUVER}
                  </div>
                </div>

                <div className="p-3 bg-[#0F172A]/70 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400">Comarca & Estado:</div>
                  <div className="font-semibold text-white">
                    COMARCA DE {assembly.resolvedVariables.DISTRICT}{' '}
                    {assembly.resolvedVariables.ESTADO_FULL}
                  </div>
                </div>

                <div className="p-3 bg-[#0F172A]/70 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400">Patrono Principal & OAB da UF:</div>
                  <div className="font-semibold text-cyan-300">
                    José Antônio Martins — {assembly.resolvedVariables.ADVOGADO_OAB_ESPECIFICA}
                  </div>
                </div>

                <div className="p-3 bg-[#0F172A]/70 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400">Local e Data por Extenso:</div>
                  <div className="font-semibold text-white">
                    {assembly.resolvedVariables.CIDADE_ESTADO_DATA}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-black/40 border border-slate-800/80 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Dicionário Completo de Resoluções Forenses:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  {Object.entries(assembly.resolvedVariables).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-2 bg-[#0F172A]/40 border border-slate-800 rounded flex flex-col"
                    >
                      <span className="text-cyan-400">{`{{${key}}}`}</span>
                      <span className="text-slate-300 truncate mt-0.5">{val || '(vazio)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#0F172A]/80">
          <div className="text-xs text-slate-400">
            {errors.length > 0 ? (
              <span className="text-rose-400">
                Corrija os campos pendentes no formulário para salvar o snapshot.
              </span>
            ) : (
              <span>Pronto para validação e persistência determinística do snapshot.</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Fechar Inspeção
            </button>
            {onConfirmGenerate && (
              <button
                disabled={errors.length > 0 || isGenerating}
                onClick={onConfirmGenerate}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-[0_0_20px_rgba(6,182,212,0.25)]"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'Salvando Snapshot...' : 'Validar e Salvar Snapshot'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
