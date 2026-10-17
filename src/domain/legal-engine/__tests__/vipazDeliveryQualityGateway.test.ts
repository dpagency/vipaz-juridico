import { strict as assert } from 'node:assert';
import { verifyVipazJob } from '../vipazDeliveryQualityGateway';
import type { VipazComposition, VipazTemplateRule } from '../vipazCompositionContract';

const rules: VipazTemplateRule[] = [
  { blockId: 'cabecalho', kind: 'fixed' },
  { blockId: 'sintese', kind: 'ai_draft', required: true },
];
const composition: VipazComposition = {
  jobId: 'j1', processId: 'p1', templateId: 't1', templateVersion: '1',
  blocks: [{
    blockId: 'sintese', kind: 'ai_draft',
    text: 'A decisão indeferiu a tutela.',
    evidence: [{ documentId: 'autos.pdf', page: 2, excerpt: 'indeferiu a tutela' }],
  }],
};
const valid = verifyVipazJob({
  composition, rules,
  extractedPages: [{ documentId: 'autos.pdf', page: 2, text: 'A decisão indeferiu a tutela requerida.' }],
  approvedTheses: [],
}, () => '2026-10-17T00:00:00Z');
assert.equal(valid.status, 'awaiting_human_review');
assert.equal(valid.approvedForHumanReview, true);
assert.equal(valid.checkedAt, '2026-10-17T00:00:00Z');
const invalid = verifyVipazJob({
  composition, rules, extractedPages: [], approvedTheses: [],
});
assert.equal(invalid.status, 'blocked');
assert.equal(invalid.approvedForHumanReview, false);
assert(invalid.issues.some(issue => issue.code === 'EVIDENCE_NOT_FOUND'));
console.log('VIPAZ quality gateway: 6 assertions passed');
