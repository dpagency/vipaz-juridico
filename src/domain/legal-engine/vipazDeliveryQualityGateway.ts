import { prepareVipazReview, type VipazPage, type VipazApprovedThesis } from './vipazMcpQualityTools';
import type { VipazComposition, VipazTemplateRule } from './vipazCompositionContract';

/**
 * Server-side boundary between Delivery and n8n/MCP.
 * Do not expose this adapter directly from the browser.
 * Authenticated application services must resolve job ownership and storage.
 */
export type VipazQualityRequest = {
  composition: VipazComposition;
  rules: VipazTemplateRule[];
  extractedPages: VipazPage[];
  approvedTheses: VipazApprovedThesis[];
};
export type VipazQualityResponse = {
  jobId: string;
  status: 'awaiting_human_review' | 'blocked';
  approvedForHumanReview: boolean;
  issues: ReturnType<typeof prepareVipazReview>['issues'];
  checkedAt: string;
};
export function verifyVipazJob(
  request: VipazQualityRequest,
  now: () => string = () => new Date().toISOString(),
): VipazQualityResponse {
  const result = prepareVipazReview(
    request.composition,
    request.rules,
    request.extractedPages,
    request.approvedTheses,
  );
  return {
    jobId: request.composition.jobId,
    status: result.approvedForHumanReview ? 'awaiting_human_review' : 'blocked',
    approvedForHumanReview: result.approvedForHumanReview,
    issues: result.issues,
    checkedAt: now(),
  };
}
/**
 * n8n contract:
 * POST (authenticated internal endpoint) with VipazQualityRequest JSON.
 * Response: VipazQualityResponse.
 * Only 'awaiting_human_review' can advance to the attorney review queue.
 * A human approval is still required before document issuance.
 *
 * MCP tool mapping:
 * evidence.search -> indexed extractedPages with documentId, page, excerpt
 * thesis.get -> approvedTheses from Library with version
 * composition.verify -> verifyVipazJob
 *
 * IMPORTANT: caller must fetch pages and thesis metadata from trusted server-side
 * storage rather than accepting client-supplied evidence as authoritative.
 */
