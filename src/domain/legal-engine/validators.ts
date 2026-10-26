/**
 * VIPAZ Jurídico — Motor Determinístico de Montagem Jurídica
 * Validações de Integridade do Formulário e da Peça
 */

import { LegalFormData, ValidationError, ResolvedDocumentAssembly } from './types.js';
import { isPieceHomologated } from './architectureRegistry.js';
import { validateAgravoDraft } from './agravoQuality.js';

/**
 * Validação estrita do formulário da Nova Peça
 */
export function validateLegalForm(data: Partial<LegalFormData>): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Dados Básicos
  if (!data.process_number || !data.process_number.trim()) {
    errors.push({
      field: 'process_number',
      message: 'O número do processo é obrigatório.',
    });
  }

  if (!data.court_number || !data.court_number.trim()) {
    errors.push({
      field: 'court_number',
      message: 'O número da vara/juizado é obrigatório.',
    });
  } else if (!/^\d+$/.test(data.court_number.trim())) {
    errors.push({
      field: 'court_number',
      message: 'O número da vara/juizado aceita exclusivamente caracteres numéricos.',
    });
  }

  if (!data.court_type) {
    errors.push({
      field: 'court_type',
      message: 'Selecione o juízo competente.',
    });
  } else if (data.court_type === 'Outro' && !data.court_type_custom?.trim()) {
    errors.push({
      field: 'court_type_custom',
      message: 'Informe manualmente o juízo competente.',
    });
  }

  if (!data.district || !data.district.trim()) {
    errors.push({
      field: 'district',
      message: 'A comarca é obrigatória.',
    });
  }

  if (!data.uf) {
    errors.push({
      field: 'uf',
      message: 'A Unidade Federativa (UF) é obrigatória (RJ, SP, MG ou BA).',
    });
  }

  if (!data.client || !data.client.trim()) {
    errors.push({
      field: 'client',
      message: 'A indicação do cliente (parte representada) é obrigatória.',
    });
  }

  if (!data.opposing_party || !data.opposing_party.trim()) {
    errors.push({
      field: 'opposing_party',
      message: 'A indicação da parte adversa é obrigatória.',
    });
  }

  if (!data.executive_summary || !data.executive_summary.trim()) {
    errors.push({
      field: 'executive_summary',
      message: 'A Ementa Executiva é obrigatória para a estruturação da peça.',
    });
  }

  if (!data.claim_summary || !data.claim_summary.trim()) {
    errors.push({
      field: 'claim_summary',
      message: 'O Resumo da Inicial é obrigatório.',
    });
  }

  if (!data.controversy_delimitation || !data.controversy_delimitation.trim()) {
    errors.push({
      field: 'controversy_delimitation',
      message: 'A Exata Delimitação da Controvérsia é obrigatória.',
    });
  }

  // 2. Seleções Jurídicas
  if (!data.adverse_party_nature || data.adverse_party_nature.length === 0) {
    errors.push({
      field: 'adverse_party_nature',
      message: 'Selecione a natureza da parte adversa (Pessoa Física e/ou Jurídica).',
    });
  }

  if (!data.document_piece) {
    errors.push({
      field: 'document_piece',
      message: 'Selecione a peça processual a ser confeccionada.',
    });
  } else if (!isPieceHomologated(data.document_piece)) {
    errors.push({
      field: 'document_piece',
      message: `A peça "${data.document_piece}" encontra-se em homologação. Utilize "Contestação" no MVP atual.`,
    });
  }

  // 3. Validações do Objeto da Lide
  if (data.dispute_objects) {
    const hasAnyObject = Boolean(
      data.dispute_objects.reajuste_anual ||
      data.dispute_objects.reajuste_etario ||
      data.dispute_objects.aviso_previo ||
      data.dispute_objects.premio_complementar ||
      data.dispute_objects.outro ||
      data.dispute_objects.reajuste_pme
    );
    if (!hasAnyObject) {
      errors.push({
        field: 'dispute_objects',
        message: 'Selecione ao menos um objeto da lide na taxonomia processual.',
      });
    }

    if (data.dispute_objects.outro && !data.dispute_objects.outro_descricao?.trim()) {
      errors.push({
        field: 'dispute_objects.outro_descricao',
        message: 'Descreva o outro objeto da lide selecionado.',
      });
    }
  }

  // 4. Validações Condicionais
  // Tutela de urgência e dano moral utilizam blocos homologados diretamente sem exigir texto manual do usuário

  errors.push(...validateAgravoDraft(data));
  return errors;
}

/**
 * Converte a validação do formulário em um mapa Record<string, string> indexado pelo nome do campo
 */
export function validateLegalFormData(data: Partial<LegalFormData>): Record<string, string> {
  const errorList = validateLegalForm(data);
  const errorMap: Record<string, string> = {};
  for (const err of errorList) {
    if (!errorMap[err.field]) {
      errorMap[err.field] = err.message;
    }
  }
  return errorMap;
}

/**
 * Valida a integridade da montagem final do documento
 */
export function validateAssemblyIntegrity(assembly: ResolvedDocumentAssembly): ValidationError[] {
  const errors: ValidationError[] = [];

  // Verifica se há variáveis não substituídas nos blocos incluídos
  for (const block of assembly.includedBlocks) {
    const unreplaced = block.content.match(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g);
    if (unreplaced && unreplaced.length > 0) {
      const vars = Array.from(new Set(unreplaced)).join(', ');
      errors.push({
        field: block.key,
        message: `O bloco "${block.title}" contém variáveis não resolvidas: ${vars}`,
      });
    }
  }

  return errors;
}
