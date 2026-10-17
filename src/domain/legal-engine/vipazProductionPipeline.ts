import type { VipazComposition, VipazTemplateRule } from './vipazCompositionContract';
import type { VipazApprovedThesis, VipazPage } from './vipazMcpQualityTools';
import { verifyVipazJob } from './vipazDeliveryQualityGateway';
import { renderVipazReviewedDocx, type VipazApprovedTemplateBlock } from './vipazReviewedDocxRenderer';

export type VipazTrustedCaseRepository = {
  getApprovedTemplate(templateId: string, version: string, processId: string): Promise<VipazApprovedTemplateBlock[] | null>;
  getExtractedPages(processId: string): Promise<VipazPage[]>;
  getApprovedTheses(processId: string): Promise<VipazApprovedThesis[]>;
  assertJobAccess(jobId: string, processId: string): Promise<void>;
};
export type VipazProductionResult =
  | { status: 'blocked'; jobId: string; issues: { code: string; message: string; blockId?: string }[] }
  | { status: 'awaiting_human_review'; jobId: string; mimeType: string; docx: Buffer; evidenceCount: number };

/**
 * Server-side integration seam. The repository must resolve organization access,
 * template approval, PDF pages and thesis provenance from trusted persisted data.
 * No user-supplied pages, rules or thesis approval metadata are accepted here.
 */
export async function produceVipazReviewDraft(
  composition: VipazComposition,
  repository: VipazTrustedCaseRepository,
): Promise<VipazProductionResult> {
  await repository.assertJobAccess(composition.jobId, composition.processId);
  const [templateBlocks, pages, approvedTheses] = await Promise.all([
    repository.getApprovedTemplate(composition.templateId, composition.templateVersion, composition.processId),
    repository.getExtractedPages(composition.processId),
    repository.getApprovedTheses(composition.processId),
  ]);
  if (!templateBlocks?.length) {
    return { status: 'blocked', jobId: composition.jobId, issues: [{ code: 'TEMPLATE_NOT_APPROVED', message: 'Modelo aprovado e versionado não localizado.' }] };
  }
  if (!pages.length) {
    return { status: 'blocked', jobId: composition.jobId, issues: [{ code: 'PDF_NOT_EXTRACTED', message: 'Nenhuma página extraída dos autos.' }] };
  }
  const quality = verifyVipazJob({
    composition, rules: templateBlocks as VipazTemplateRule[],
    extractedPages: pages, approvedTheses,
  });
  if (!quality.approvedForHumanReview) {
    return { status: 'blocked', jobId: composition.jobId, issues: quality.issues };
  }
  const docx = await renderVipazReviewedDocx({ composition, templateBlocks, extractedPages: pages, approvedTheses });
  const evidenceCount = composition.blocks.reduce((total, block) =>
    total + (block.evidence?.length ?? 0) + (block.theses?.reduce((n, thesis) => n + (thesis.evidence?.length ?? 0), 0) ?? 0), 0);
  return {
    status: 'awaiting_human_review', jobId: composition.jobId,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    docx, evidenceCount,
  };
}
