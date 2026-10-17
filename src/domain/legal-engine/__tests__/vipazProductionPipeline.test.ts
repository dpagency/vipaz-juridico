import { strict as assert } from 'node:assert';
import JSZip from 'jszip';
import { produceVipazReviewDraft, type VipazTrustedCaseRepository } from '../vipazProductionPipeline';
import type { VipazComposition } from '../vipazCompositionContract';

const composition: VipazComposition = {
  jobId: 'job1', templateId: 'template1', templateVersion: '1', processId: 'case1',
  blocks: [
    { blockId: 'facts', kind: 'ai_draft', text: 'O juízo indeferiu a tutela.', evidence: [{ documentId: 'case.pdf', page: 1, excerpt: 'indeferiu a tutela' }] },
    { blockId: 'theses', kind: 'repeated_theses', theses: [{
      thesisId: 't1', approvedSourceId: 'lib1', title: 'Da tutela',
      paragraphs: ['Fundamentação jurídica revisável.'],
      evidence: [{ documentId: 'case.pdf', page: 1, excerpt: 'indeferiu a tutela' }],
    }] },
  ],
};
const repo: VipazTrustedCaseRepository = {
  async assertJobAccess(jobId, processId) {
    if (jobId !== 'job1' || processId !== 'case1') throw new Error('FORBIDDEN');
  },
  async getApprovedTemplate() {
    return [
      { blockId: 'fixed', kind: 'fixed', fixedText: 'EXCELENTÍSSIMO JUÍZO' },
      { blockId: 'facts', kind: 'ai_draft', required: true, title: 'Dos fatos', headingStyle: 'Heading1' },
      { blockId: 'theses', kind: 'repeated_theses', required: true, headingStyle: 'Heading2' },
    ];
  },
  async getExtractedPages() { return [{ documentId: 'case.pdf', page: 1, text: 'O juízo indeferiu a tutela.' }]; },
  async getApprovedTheses() { return [{ id: 'lib1', title: 'Da tutela', sourceVersion: '1' }]; },
};
const produced = await produceVipazReviewDraft(composition, repo);
assert.equal(produced.status, 'awaiting_human_review');
if (produced.status !== 'awaiting_human_review') throw new Error('Expected document');
assert.equal(produced.evidenceCount, 2);
const zip = await JSZip.loadAsync(produced.docx);
const xml = await zip.file('word/document.xml')?.async('string');
assert(xml?.includes('EXCELENTÍSSIMO JUÍZO'));
assert(xml?.includes('Fundamentação jurídica revisável.'));
const noPages = await produceVipazReviewDraft(composition, { ...repo, async getExtractedPages() { return []; } });
assert.equal(noPages.status, 'blocked');
const noTheses = await produceVipazReviewDraft(composition, { ...repo, async getApprovedTheses() { return []; } });
assert.equal(noTheses.status, 'blocked');
await assert.rejects(produceVipazReviewDraft(composition, {
  ...repo, async assertJobAccess() { throw new Error('FORBIDDEN'); },
}), /FORBIDDEN/);
console.log('VIPAZ integrated production pipeline: 7 checks passed');
