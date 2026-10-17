import { strict as assert } from 'node:assert';
import JSZip from 'jszip';
import { renderVipazReviewedDocx } from '../vipazReviewedDocxRenderer';
import type { VipazComposition } from '../vipazCompositionContract';

const evidence = [{ documentId: 'autos.pdf', page: 1, excerpt: 'indeferiu a tutela' }];
const composition: VipazComposition = {
  jobId: 'job', templateId: 'modelo', templateVersion: 'v1', processId: 'processo',
  blocks: [
    { blockId: 'fatos', kind: 'ai_draft', text: 'A decisão indeferiu a tutela.', evidence },
    { blockId: 'teses', kind: 'repeated_theses', theses: [{
      thesisId: 't1', approvedSourceId: 'library1', title: 'Do direito',
      paragraphs: ['Fundamentos sujeitos à revisão humana.'], evidence,
    }] },
  ],
};
const templateBlocks = [
  { blockId: 'abertura', kind: 'fixed' as const, fixedText: 'EXCELENTÍSSIMO JUÍZO' },
  { blockId: 'fatos', kind: 'ai_draft' as const, required: true, title: 'Dos fatos', headingStyle: 'Heading1' as const },
  { blockId: 'teses', kind: 'repeated_theses' as const, required: true, headingStyle: 'Heading2' as const },
];
const extractedPages = [{ documentId: 'autos.pdf', page: 1, text: 'A decisão indeferiu a tutela postulada.' }];
const approvedTheses = [{ id: 'library1', title: 'Do direito', sourceVersion: 'v1' }];
const buffer = await renderVipazReviewedDocx({ composition, templateBlocks, extractedPages, approvedTheses });
const zip = await JSZip.loadAsync(buffer);
const xml = await zip.file('word/document.xml')?.async('string');
assert(xml?.includes('EXCELENTÍSSIMO JUÍZO'));
assert(xml?.includes('Dos fatos'));
assert(xml?.includes('Do direito'));
assert(xml?.includes('Fundamentos sujeitos à revisão humana.'));
assert(xml?.indexOf('EXCELENTÍSSIMO JUÍZO')! < xml?.indexOf('Dos fatos')!);
assert(xml?.includes('Heading1'));
assert(xml?.includes('Heading2'));
await assert.rejects(
  renderVipazReviewedDocx({ composition, templateBlocks, extractedPages: [], approvedTheses }),
  /VIPAZ_DOCX_BLOCKED/,
);
await assert.rejects(
  renderVipazReviewedDocx({ composition, templateBlocks, extractedPages, approvedTheses: [] }),
  /VIPAZ_DOCX_BLOCKED/,
);
console.log('VIPAZ DOCX renderer: generated ZIP and verified gated content');
