import { strict as assert } from 'node:assert';
import { validateVipazComposition, type VipazComposition, type VipazTemplateRule } from '../vipazCompositionContract';

const rules: VipazTemplateRule[] = [
  { blockId: 'cabecalho', kind: 'fixed' },
  { blockId: 'fatos', kind: 'ai_draft', required: true },
  { blockId: 'teses', kind: 'repeated_theses', required: true, headingStyle: 'Heading2' },
];
const evidence = [{ documentId: 'autos.pdf', page: 3, excerpt: 'Decisão de indeferimento.' }];
const valid: VipazComposition = {
  jobId: 'job-1', templateId: 'modelo-1', templateVersion: '1', processId: 'processo-1',
  blocks: [
    { blockId: 'fatos', kind: 'ai_draft', text: 'A decisão indeferiu o pedido.', evidence },
    { blockId: 'teses', kind: 'repeated_theses', theses: [{
      thesisId: 'tese-1', approvedSourceId: 'biblioteca-1', title: 'Da necessidade de reforma',
      paragraphs: ['A decisão merece reforma pelos fundamentos constantes dos autos.'], evidence,
    }] },
  ],
};
assert.deepEqual(validateVipazComposition(valid, rules), [], 'composição válida deve ser aceita');
const errorCodes = (composition: VipazComposition) => validateVipazComposition(composition, rules).map(i => i.code);
assert(errorCodes({ ...valid, blocks: [...valid.blocks, { blockId: 'cabecalho', kind: 'field', text: 'ALTERADO' }] }).includes('IMMUTABLE_BLOCK'));
assert(errorCodes({ ...valid, blocks: [...valid.blocks, { blockId: 'desconhecido', kind: 'field', text: 'X' }] }).includes('UNKNOWN_BLOCK'));
assert(errorCodes({ ...valid, blocks: [...valid.blocks, valid.blocks[0]] }).includes('DUPLICATE_BLOCK'));
assert(errorCodes({ ...valid, blocks: [valid.blocks[0]] }).includes('REQUIRED_BLOCK_MISSING'));
assert(errorCodes({ ...valid, blocks: [{ blockId: 'fatos', kind: 'ai_draft', text: 'Texto sem fontes' }, valid.blocks[1]] }).includes('MISSING_EVIDENCE'));
assert(errorCodes({ ...valid, blocks: [{ blockId: 'fatos', kind: 'ai_draft', text: 'Texto', evidence: [{ documentId: 'autos.pdf', page: 0, excerpt: '' }] }, valid.blocks[1]] }).includes('INVALID_EVIDENCE'));
assert(errorCodes({ ...valid, blocks: [valid.blocks[0], { blockId: 'teses', kind: 'repeated_theses', theses: [] }] }).includes('EMPTY_THESES'));
console.log('VIPAZ MCP composition contract: 7 scenarios passed');
