/**
 * VIPAZ Jurídico — Motor Determinístico de Montagem Jurídica
 * Registro e Gerenciador de Arquiteturas Processuais
 */

import { DocumentPieceType, LegalArchitecture } from './types.js';
import { CONTESTACAO_PME_ARCHITECTURE } from './data/contestacao/architecture.js';
import { AGRAVO_INSTRUMENTO_ARCHITECTURE } from './data/agravo/architecture.js';

/**
 * Mapeamento central de arquiteturas homologadas
 */
const ARCHITECTURES_MAP: Partial<Record<DocumentPieceType, LegalArchitecture>> = {
  Contestação: CONTESTACAO_PME_ARCHITECTURE,
  'Agravo de Instrumento': AGRAVO_INSTRUMENTO_ARCHITECTURE,
};

/**
 * Retorna a arquitetura correspondente à peça processual solicitada, ou null se não homologada
 */
export function getArchitectureForPiece(piece: DocumentPieceType): LegalArchitecture | null {
  return ARCHITECTURES_MAP[piece] || null;
}

/**
 * Verifica se a peça processual possui arquitetura homologada em produção
 */
export function isPieceHomologated(piece: DocumentPieceType): boolean {
  return Boolean(ARCHITECTURES_MAP[piece]);
}

/**
 * Retorna todas as arquiteturas homologadas no sistema
 */
export function getHomologatedArchitectures(): LegalArchitecture[] {
  return Object.values(ARCHITECTURES_MAP).filter(Boolean) as LegalArchitecture[];
}
