import {
  validateVipazComposition,
  type VipazComposition,
  type VipazEvidence,
  type VipazTemplateRule,
  type VipazValidationIssue,
} from './vipazCompositionContract';

/** Evidence is indexed from extracted PDF pages; never trust a model's citation alone. */
export type VipazPage = {
  documentId: string;
  page: number;
  text: string;
};
export type VipazApprovedThesis = {
  id: string;
  title: string;
  sourceVersion: string;
};
export type VipazMcpTools = {
  findEvidence(query: string, pages: VipazPage[]): VipazEvidence[];
  getApprovedThesis(id: string, theses: VipazApprovedThesis[]): VipazApprovedThesis | null;
  verifyComposition(
    composition: VipazComposition,
    rules: VipazTemplateRule[],
    pages: VipazPage[],
    approvedTheses: VipazApprovedThesis[],
  ): VipazValidationIssue[];
};
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');

export const vipazMcpTools: VipazMcpTools = {
  findEvidence(query, pages) {
    const needle = normalize(query);
    if (needle.length < 8) return [];
    return pages.filter(p => Number.isInteger(p.page) && p.page > 0 && normalize(p.text).includes(needle))
      .map(p => ({ documentId: p.documentId, page: p.page, excerpt: query }));
  },
  getApprovedThesis(id, theses) {
    return theses.find(t => t.id === id && t.sourceVersion.trim().length > 0) ?? null;
  },
  verifyComposition(composition, rules, pages, approvedTheses) {
    const issues = validateVipazComposition(composition, rules);
    const index = new Map<string, string[]>();
    for (const page of pages) {
      const key = page.documentId + ':' + page.page;
      index.set(key, [...(index.get(key) ?? []), normalize(page.text)]);
    }
    const check = (sources: VipazEvidence[] | undefined, blockId: string) => {
      for (const source of sources ?? []) {
        const pageTexts = index.get(source.documentId + ':' + source.page);
        if (!pageTexts?.length || !normalize(source.excerpt) || !pageTexts.some(text => text.includes(normalize(source.excerpt)))) {
          issues.push({
            code: 'EVIDENCE_NOT_FOUND',
            blockId,
            message: 'O excerto citado não foi localizado na página informada dos autos.',
          });
        }
      }
    };
    for (const block of composition.blocks ?? []) {
      if (block.kind === 'ai_draft') check(block.evidence, block.blockId);
      if (block.kind === 'repeated_theses') {
        for (const thesis of block.theses ?? []) {
          if (!approvedTheses.some(t => t.id === thesis.approvedSourceId && t.sourceVersion.trim())) {
            issues.push({
              code: 'THESIS_NOT_APPROVED',
              blockId: block.blockId,
              message: 'A tese não corresponde a uma fonte aprovada e versionada na Library.',
            });
          }
          check(thesis.evidence, block.blockId);
        }
      }
    }
    return issues;
  },
};

/**
 * Adapter boundary for n8n MCP server tools:
 * - evidence.search -> findEvidence
 * - library.thesis.get -> getApprovedThesis
 * - composition.verify -> verifyComposition
 * Only return approved=true when every structural and source check succeeds.
 * This is NOT a network-exposed MCP server; bind authenticated endpoints separately.
 */
export function prepareVipazReview(
  composition: VipazComposition,
  rules: VipazTemplateRule[],
  pages: VipazPage[],
  theses: VipazApprovedThesis[],
) {
  const issues = vipazMcpTools.verifyComposition(composition, rules, pages, theses);
  return { approvedForHumanReview: issues.length === 0, issues, composition };
}
