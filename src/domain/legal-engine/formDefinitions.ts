/**
 * VIPAZ Jurídico — Motor Determinístico de Montagem Jurídica
 * Definições Declarativas do Formulário e Taxonomia da Lide
 */

import { DocumentPieceMetadata, DocumentPieceType, LegalFormData } from './types.js';

/**
 * Catálogo de Peças Processuais
 * Apenas 'Contestação' encontra-se homologada para o fluxo completo em produção (MVP).
 */
export const DOCUMENT_PIECES_CATALOG: DocumentPieceMetadata[] = [
  {
    id: 'Contestação',
    label: 'Contestação',
    description: 'Defesa de mérito e preliminares processuais com geração em DOCX homologada.',
    isHomologated: true,
    stage: 'production',
  },
  {
    id: 'Agravo de Instrumento',
    label: 'Agravo de Instrumento',
    description: 'Recurso contra decisão interlocutória, com fundamentação individualizada e assistência de IA para os tópicos variáveis.',
    isHomologated: true,
    stage: 'production',
  },
  {
    id: 'Recurso Inominado',
    label: 'Recurso Inominado',
    description: 'Recurso contra sentenças proferidas em sede de Juizados Especiais Cíveis.',
    isHomologated: false,
    stage: 'in_development',
  },
  {
    id: 'Apelação',
    label: 'Apelação',
    description: 'Recurso ordinário contra sentença de mérito ou terminativa.',
    isHomologated: false,
    stage: 'in_development',
  },
  {
    id: 'Recurso Especial',
    label: 'Recurso Especial',
    description: 'Recurso perante o Superior Tribunal de Justiça para uniformização de lei federal.',
    isHomologated: false,
    stage: 'in_development',
  },
  {
    id: 'Contraminuta de Agravo de Instrumento',
    label: 'Contraminuta de Agravo de Instrumento',
    description: 'Resposta ao agravo de instrumento interposto pela parte adversa.',
    isHomologated: false,
    stage: 'in_development',
  },
  {
    id: 'Contrarrazões de Recurso Inominado',
    label: 'Contrarrazões de Recurso Inominado',
    description: 'Resposta ao recurso inominado interposto no âmbito do JEC.',
    isHomologated: false,
    stage: 'in_development',
  },
  {
    id: 'Contrarrazões de Apelação',
    label: 'Contrarrazões de Apelação',
    description: 'Resposta à apelação cível interposta pela parte adversa.',
    isHomologated: false,
    stage: 'in_development',
  },
];

/**
 * Taxonomia Homologada do Objeto da Lide (Classificação do Caso)
 *
 * [ ] Reajuste Anual -> ( ) PME / ( ) Individual
 * [ ] Reajuste Etário -> ( ) PME / ( ) Individual
 * [ ] Aviso Prévio
 * [ ] Prêmio Complementar
 * [ ] Outro -> se selecionado, campo textual obrigatório
 */
export interface DisputeTaxonomyItem {
  id: 'reajuste_anual' | 'reajuste_etario' | 'aviso_previo' | 'premio_complementar' | 'outro';
  label: string;
  hasSubtypes?: boolean;
  subtypes?: { id: 'pme' | 'individual'; label: string }[];
  requiresDescription?: boolean;
}

export const DISPUTE_TAXONOMY_ITEMS: DisputeTaxonomyItem[] = [
  {
    id: 'reajuste_anual',
    label: 'Reajuste Anual',
    hasSubtypes: true,
    subtypes: [
      { id: 'pme', label: 'PME' },
      { id: 'individual', label: 'Individual' },
    ],
  },
  {
    id: 'reajuste_etario',
    label: 'Reajuste Etário',
    hasSubtypes: true,
    subtypes: [
      { id: 'pme', label: 'PME' },
      { id: 'individual', label: 'Individual' },
    ],
  },
  {
    id: 'aviso_previo',
    label: 'Aviso Prévio',
  },
  {
    id: 'premio_complementar',
    label: 'Prêmio Complementar',
  },
  {
    id: 'outro',
    label: 'Outro',
    requiresDescription: true,
  },
];

/**
 * Dados Padrão Homologados para Preenchimento do Caso Modelo
 */
export const HOMOLOGATED_CASE_DEFAULTS: LegalFormData = {
  process_number: '0802491-32.2024.8.19.0001',
  court_number: '3',
  court_type: 'Vara Cível',
  court_regional: '',
  district: 'Capital',
  uf: 'RJ',
  client: 'Sul América Companhia de Seguro Saúde',
  opposing_party: 'MG Métodos Gráficos Ltda. e outros',
  executive_summary:
    'Ação ordinária questionando a legalidade dos índices de reajuste anual por VCMH e sinistralidade aplicados à apólice coletiva empresarial (PME).',
  claim_summary:
    'A parte autora pretende anular os reajustes técnicos dos últimos ciclos anuais, pleiteando equiparação aos índices individuais da ANS, repetição do indébito em dobro e indenização por danos morais.',
  controversy_delimitation:
    'Validade material do contrato coletivo empresarial PME estipulado por pessoa jurídica operante, com aplicação legítima do agrupamento de risco e observância da tese repetitiva do Tema 610/STJ.',
  adverse_party_nature: ['pj', 'pf'],
  document_piece: 'Contestação',
  dispute_objects: {
    reajuste_anual: true,
    reajuste_anual_modalidade: 'pme',
    reajuste_anual_pme: true,
    reajuste_etario: false,
    reajuste_etario_modalidade: 'pme',
    aviso_previo: false,
    premio_complementar: false,
    outro: false,
    outro_descricao: '',
    // Legados
    reajuste_pme: true,
    reajuste_pme_anual: true,
    reajuste_pme_etario: false,
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
};
