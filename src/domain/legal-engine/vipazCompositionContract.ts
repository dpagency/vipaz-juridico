/**
 * VIPAZ Delivery: contrato de composição jurídica verificável.
 * O MCP fornece evidências e teses; o motor documental aplica os estilos DOCX.
 * Nenhuma resposta de IA pode modificar conteúdo fixo do modelo.
 */
export type VipazBlockKind = 'fixed' | 'field' | 'conditional' | 'ai_draft' | 'repeated_theses';
export type VipazEvidence = {
  documentId: string;
  page: number;
  excerpt: string;
};
export type VipazThesis = {
  thesisId: string;
  title: string;
  paragraphs: string[];
  evidence: VipazEvidence[];
  approvedSourceId: string;
};
export type VipazComposedBlock = {
  blockId: string;
  kind: Exclude<VipazBlockKind, 'fixed'>;
  text?: string;
  included?: boolean;
  theses?: VipazThesis[];
  evidence?: VipazEvidence[];
};
export type VipazComposition = {
  jobId: string;
  templateId: string;
  templateVersion: string;
  processId: string;
  blocks: VipazComposedBlock[];
};
export type VipazTemplateRule = {
  blockId: string;
  kind: VipazBlockKind;
  required?: boolean;
  headingStyle?: 'Title' | 'Heading1' | 'Heading2' | 'Normal';
};
export type VipazValidationIssue = {
  code: string;
  blockId?: string;
  message: string;
};
const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function evidenceIssues(evidence: VipazEvidence[] | undefined, blockId: string): VipazValidationIssue[] {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return [{ code: 'MISSING_EVIDENCE', blockId, message: 'Bloco sem referência verificável aos autos.' }];
  }
  return evidence.flatMap((source) =>
    isText(source.documentId) && Number.isInteger(source.page) && source.page > 0 && isText(source.excerpt)
      ? []
      : [{ code: 'INVALID_EVIDENCE', blockId, message: 'Referência deve conter documento, página e excerto.' }],
  );
}

/** Fail-closed: somente blocos conhecidos e autorizados entram no documento. */
export function validateVipazComposition(
  composition: VipazComposition,
  rules: VipazTemplateRule[],
): VipazValidationIssue[] {
  const issues: VipazValidationIssue[] = [];
  if (![composition.jobId, composition.templateId, composition.templateVersion, composition.processId].every(isText)) {
    issues.push({ code: 'INVALID_CONTEXT', message: 'Job, processo e versão do modelo são obrigatórios.' });
  }
  const allowed = new Map(rules.map((rule) => [rule.blockId, rule]));
  const seen = new Set<string>();
  for (const block of composition.blocks ?? []) {
    const rule = allowed.get(block.blockId);
    if (!rule) {
      issues.push({ code: 'UNKNOWN_BLOCK', blockId: block.blockId, message: 'Bloco não definido no Studio.' });
      continue;
    }
    if (seen.has(block.blockId)) {
      issues.push({ code: 'DUPLICATE_BLOCK', blockId: block.blockId, message: 'Bloco duplicado.' });
    }
    seen.add(block.blockId);
    if (rule.kind === 'fixed') {
      issues.push({ code: 'IMMUTABLE_BLOCK', blockId: block.blockId, message: 'Texto fixo não pode ser alterado pela IA.' });
      continue;
    }
    if (rule.kind !== block.kind) {
      issues.push({ code: 'KIND_MISMATCH', blockId: block.blockId, message: 'Tipo de bloco diverge do modelo aprovado.' });
      continue;
    }
    if (block.kind === 'ai_draft') {
      if (!isText(block.text)) issues.push({ code: 'EMPTY_DRAFT', blockId: block.blockId, message: 'Redação vazia.' });
      issues.push(...evidenceIssues(block.evidence, block.blockId));
    }
    if (block.kind === 'repeated_theses') {
      if (!Array.isArray(block.theses) || block.theses.length === 0) {
        issues.push({ code: 'EMPTY_THESES', blockId: block.blockId, message: 'Nenhuma tese foi fornecida.' });
      } else {
        for (const thesis of block.theses) {
          if (!isText(thesis.thesisId) || !isText(thesis.approvedSourceId) || !isText(thesis.title) ||
              !Array.isArray(thesis.paragraphs) || thesis.paragraphs.length === 0 ||
              thesis.paragraphs.some((p) => !isText(p))) {
            issues.push({ code: 'INVALID_THESIS', blockId: block.blockId, message: 'Tese sem identificação, fonte aprovada, título ou parágrafos.' });
          }
          issues.push(...evidenceIssues(thesis.evidence, block.blockId));
        }
      }
    }
  }
  for (const rule of rules) {
    if (rule.required && rule.kind !== 'fixed' && !seen.has(rule.blockId)) {
      issues.push({ code: 'REQUIRED_BLOCK_MISSING', blockId: rule.blockId, message: 'Bloco obrigatório ausente.' });
    }
  }
  return issues;
}
