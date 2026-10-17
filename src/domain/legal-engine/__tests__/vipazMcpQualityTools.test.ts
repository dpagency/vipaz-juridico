import { strict as assert } from 'node:assert';
import { prepareVipazReview, vipazMcpTools } from '../vipazMcpQualityTools';
import type { VipazComposition, VipazTemplateRule } from '../vipazCompositionContract';

const pages = [{ documentId: 'autos.pdf', page: 4, text: 'A decisão agravada indeferiu a tutela provisória.' }];
const approvedTheses = [{ id: 'library-tese-1', title: 'Tutela provisória', sourceVersion: '2' }];
const rules: VipazTemplateRule[] = [
  { blockId: 'introducao', kind: 'fixed' },
  { blockId: 'fatos', kind: 'ai_draft', required: true },
  { blockId: 'teses', kind: 'repeated_theses', required: true },
];
const evidence = [{ documentId: 'autos.pdf', page: 4, excerpt: 'indeferiu a tutela provisória' }];
const composition: VipazComposition = {
  jobId: 'job', templateId: 'modelo', templateVersion: '1', processId: 'processo',
  blocks: [
    { blockId: 'fatos', kind: 'ai_draft', text: 'A decisão indeferiu a tutela.', evidence },
    { blockId: 'teses', kind: 'repeated_theses', theses: [{
      thesisId: 't1', approvedSourceId: 'library-tese-1', title: 'Tutela provisória',
      paragraphs: ['Argumentação sujeita à revisão humana.'], evidence,
    }] },
  ],
};
assert.equal(prepareVipazReview(composition, rules, pages, approvedTheses).approvedForHumanReview, true);
assert.equal(vipazMcpTools.findEvidence('indeferiu a tutela provisória', pages).length, 1);
assert.equal(vipazMcpTools.findEvidence('decisão inexistente', pages).length, 0);
assert.equal(vipazMcpTools.getApprovedThesis('library-tese-1', approvedTheses)?.sourceVersion, '2');
assert.equal(vipazMcpTools.getApprovedThesis('desconhecida', approvedTheses), null);
const missingPage = prepareVipazReview(composition, rules, [], approvedTheses);
assert(missingPage.issues.some(i => i.code === 'EVIDENCE_NOT_FOUND'));
const missingThesis = prepareVipazReview(composition, rules, pages, []);
assert(missingThesis.issues.some(i => i.code === 'THESIS_NOT_APPROVED'));
assert.equal(missingThesis.approvedForHumanReview, false);
console.log('VIPAZ MCP quality tools: 8 assertions passed');
