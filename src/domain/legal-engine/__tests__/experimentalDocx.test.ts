/**
 * VIPAZ Jurídico — Motor Determinístico de Montagem Jurídica
 * Suíte de Testes da Fase 4: Primeira Geração Experimental do DOCX Determinístico
 * 
 * Cobertura Obrigatória de Testes (15 Testes):
 * 1. snapshot válido gera DOCX
 * 2. saída possui MIME type correto de DOCX
 * 3. nome do arquivo é determinístico
 * 4. custom_texts são preservados literalmente
 * 5. bloco incluído aparece
 * 6. bloco excluído não aparece
 * 7. linked_requests são respeitados
 * 8. blocos não são duplicados
 * 9. pedidos não são duplicados
 * 10. bloco sem conteúdo recebe marcador de não homologado
 * 11. nenhuma chamada OpenAI
 * 12. nenhuma chamada n8n
 * 13. nenhum PDF é gerado
 * 14. snapshot original não é alterado
 * 15. falha do renderer não apresenta falso sucesso
 */

import {
  experimentalDocxService,
  getOfficialHomologatedSnapshot,
  assembleDocumentFromSnapshot,
  buildDeterministicDocxFilename,
  OFFICIAL_HOMOLOGATED_INPUT_ID,
} from '../../../services/experimentalDocxService';
import { PersistedLegalCaseInput } from '../caseDataMapper';
import { DocumentRenderer } from '../../../services/documentRenderer';
import fs from 'node:fs';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NA ASSERÇÃO: ${message}`);
  }
}

let passedTests = 0;
async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [TESTE ${passedTests}] ${name}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ FALHA EM: ${name} -> ${msg}`);
    process.exit(1);
  }
}

async function runSuite() {
  console.log('\n--- VIPAZ JURÍDICO: SUÍTE DE TESTES DE GERAÇÃO EXPERIMENTAL DOCX (FASE 4) ---');

  const baseSnapshot = getOfficialHomologatedSnapshot();

  // Gate de homologação: o catálogo PME não pode ser confundido com modelo consumerista genérico.
  await runTest('0. Arquitetura PME mantém escopo específico e qualificação fixa sinalizada', () => {
    const arch = getOfficialHomologatedSnapshot();
    assert(arch.architecture_id === 'arch_contestacao_pme_v1', 'Snapshot deve usar arquitetura PME específica');
    const assembly = assembleDocumentFromSnapshot(arch);
    const qualification = assembly.assembly.includedBlocks.find((block) => block.key === 'addressing_and_qualification');
    assert(Boolean(qualification), 'Qualificação deve existir');
    assert(qualification!.content.includes('SUL AMÉRICA COMPANHIA DE SEGURO SAÚDE'), 'Qualificação fixa deve ser detectável no teste');
    assert(!assembly.assembly.includedBlocks.some((block) => block.key === 'generic_consumer_defense'), 'Não presumir arquitetura consumerista genérica');
  });



  // Teste 1: Snapshot válido gera DOCX
  await runTest('1. Snapshot válido gera DOCX', async () => {
    const result = await experimentalDocxService.generateDocx(baseSnapshot);
    assert(result.success === true, 'Geração deve reportar sucesso');
    assert(result.blob instanceof Blob, 'Resultado deve conter um Blob');
    assert(result.fileSizeBytes > 1000, 'Tamanho do DOCX deve ser superior a 1KB');
    assert(result.includedBlocksCount === 27, 'Snapshot deve registrar 27 blocos incluídos');
    assert(result.linkedRequestsCount === 14, 'Snapshot deve registrar 14 pedidos vinculados');
  });

  // Teste 2: Saída possui MIME type correto de DOCX
  await runTest('2. Saída possui MIME type correto de DOCX', async () => {
    const result = await experimentalDocxService.generateDocx(baseSnapshot);
    const expectedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    assert(result.mimeType === expectedMime, `MIME type deve ser ${expectedMime}, obtido: ${result.mimeType}`);
    assert(result.blob.type === expectedMime, 'Blob.type deve coincidir com o MIME oficial do WordprocessingML');
  });

  // Teste 3: Nome do arquivo é determinístico
  await runTest('3. Nome do arquivo é determinístico', () => {
    const filename1 = buildDeterministicDocxFilename('0802491-32.2024.8.19.0001');
    const filename2 = buildDeterministicDocxFilename('0802491-32.2024.8.19.0001');
    assert(filename1 === 'VIPAZ_Contestacao_0802491-32.2024.8.19.0001.docx', 'Nome no padrão esperado');
    assert(filename1 === filename2, 'Nome deve ser 100% determinístico e idempotente');

    // Sanitização de caracteres proibidos em filenames (/ \ : * ? " < > |)
    const dangerousName = buildDeterministicDocxFilename('0802491/32:2024*8?19"0001');
    assert(!/[\\/:*?"<>|]/.test(dangerousName), 'Caracteres proibidos devem ser sanitizados');
    assert(dangerousName === 'VIPAZ_Contestacao_0802491_32_2024_8_19_0001.docx', 'Sanitização por sublinhado');
  });

  // Teste 4: custom_texts são preservados literalmente
  await runTest('4. custom_texts são preservados literalmente', () => {
    const customSnapshot: PersistedLegalCaseInput = JSON.parse(JSON.stringify(baseSnapshot));
    const literalExec = 'Ementa Executiva @#$% com pontuação "especial" & quebra\nde\nlinha intacta.';
    const literalClaim = 'Resumo da Inicial literal 12345 com formatação original.';
    const literalControversy = 'Delimitação Exata estrita: ausência de qualquer alteração de IA.';

    customSnapshot.custom_texts.executive_summary = literalExec;
    customSnapshot.custom_texts.claim_summary = literalClaim;
    customSnapshot.custom_texts.controversy_delimitation = literalControversy;

    const assemblyRes = assembleDocumentFromSnapshot(customSnapshot);
    const execBlock = assemblyRes.assembly.includedBlocks.find((b) => b.key === 'executive_summary_block');
    const claimBlock = assemblyRes.assembly.includedBlocks.find((b) => b.key === 'claim_summary_block');
    const controversyBlock = assemblyRes.assembly.includedBlocks.find((b) => b.key === 'controversy_delimitation_block');

    assert(execBlock?.content === literalExec, 'executive_summary deve ser idêntico e literal');
    assert(claimBlock?.content.includes(literalClaim) === true, 'claim_summary deve estar contido literalmente');
    assert(controversyBlock?.content.includes(literalControversy) === true, 'controversy_delimitation deve estar contido literalmente');
  });

  // Teste 5: Bloco incluído aparece
  await runTest('5. Bloco incluído aparece', () => {
    const assemblyRes = assembleDocumentFromSnapshot(baseSnapshot);
    const includedKeys = assemblyRes.assembly.includedBlocks.map((b) => b.key);

    assert(includedKeys.includes('addressing_and_qualification'), 'Endereçamento deve estar presente');
    assert(includedKeys.includes('merits_pme_robustness_block'), 'Bloco permanente PME deve estar presente');
    assert(includedKeys.includes('merits_contract_validity_block'), 'Validade do contrato PME deve estar presente');
    assert(includedKeys.includes('merits_pru_legality_block'), 'Legalidade do PRU deve estar presente');
    assert(includedKeys.includes('final_requests_block'), 'Requerimentos finais devem estar presentes');
    assert(assemblyRes.includedBlocksCount === 27, 'Exatamente 27 blocos incluídos');
  });

  // Teste 6: Bloco excluído não aparece
  await runTest('6. Bloco excluído não aparece', () => {
    const assemblyRes = assembleDocumentFromSnapshot(baseSnapshot);
    const includedKeys = assemblyRes.assembly.includedBlocks.map((b) => b.key);

    // No caso homologado: liminar foi negada (injunction_denied_block incluído, injunction_granted_block excluído)
    assert(!includedKeys.includes('injunction_granted_block'), 'injunction_granted_block NÃO deve constar');
    // Inépcia da inicial não foi arguida
    assert(!includedKeys.includes('petition_aptitude_block'), 'petition_aptitude_block NÃO deve constar');
    // Prescrição decenal não foi arguida
    assert(!includedKeys.includes('prescription_decennial_block'), 'prescription_decennial_block NÃO deve constar');
    // Reajuste etário não foi contestado
    assert(!includedKeys.includes('merits_age_readjustment_block'), 'merits_age_readjustment_block NÃO deve constar');
    // Repetição simples não foi ativada (repetição em dobro ativada)
    assert(!includedKeys.includes('repetition_simple_block'), 'repetition_simple_block NÃO deve constar');
  });

  // Teste 7: linked_requests são respeitados
  await runTest('7. linked_requests são respeitados', () => {
    const assemblyRes = assembleDocumentFromSnapshot(baseSnapshot);
    const reqKeys = assemblyRes.assembly.includedRequests.map((r) => r.key);

    assert(reqKeys.length === 14, 'Devem constar exatamente os 14 pedidos do snapshot');
    assert(reqKeys.includes('req_standing'), 'Pedido de ilegitimidade ativa presente');
    assert(reqKeys.includes('req_legal_aid'), 'Pedido de impugnação à JG presente');
    assert(reqKeys.includes('req_claim_value'), 'Pedido de valor da causa presente');
    assert(reqKeys.includes('req_prescription_triennial'), 'Pedido de prescrição trienal presente');
    assert(reqKeys.includes('req_merits_head'), 'Cabeçalho de mérito presente');
    assert(reqKeys.includes('req_merits_pme_validity'), 'Validade PME presente');
    assert(reqKeys.includes('req_merits_pru_legality'), 'Legalidade PRU presente');
    assert(reqKeys.includes('req_merits_repetition'), 'Rechaço repetição presente');
    assert(reqKeys.includes('req_merits_moral_damages'), 'Rejeição dano moral presente');
    assert(reqKeys.includes('req_selic'), 'Incidência Selic presente');
    assert(reqKeys.includes('req_provas'), 'Provas presente');
    assert(reqKeys.includes('req_prequestionamento'), 'Prequestionamento presente');
    assert(reqKeys.includes('req_sucumbencia'), 'Sucumbência presente');
    assert(reqKeys.includes('req_publicacoes'), 'Publicações patrono presente');

    // Pedidos excluídos no snapshot não devem constar
    assert(!reqKeys.includes('req_petition_aptitude'), 'req_petition_aptitude NÃO deve constar');
    assert(!reqKeys.includes('req_prescription_decennial'), 'req_prescription_decennial NÃO deve constar');
  });

  // Teste 8: Blocos não são duplicados
  await runTest('8. Blocos não são duplicados', () => {
    const duplicatedSnapshot: PersistedLegalCaseInput = JSON.parse(JSON.stringify(baseSnapshot));
    // Injeta bloco duplicado intencionalmente no snapshot
    duplicatedSnapshot.resolved_architecture.included_blocks.push({
      block_key: 'merits_pme_robustness_block',
      included: true,
      reason: 'duplicação intencional para teste',
      trigger: 'test',
      content_status: 'available',
    });

    const assemblyRes = assembleDocumentFromSnapshot(duplicatedSnapshot);
    const keys = assemblyRes.assembly.includedBlocks.map((b) => b.key);
    const count = keys.filter((k) => k === 'merits_pme_robustness_block').length;

    assert(count === 1, 'Bloco merits_pme_robustness_block deve aparecer exatamente uma vez, sem duplicação');
  });

  // Teste 9: Pedidos não são duplicados
  await runTest('9. Pedidos não são duplicados', () => {
    const duplicatedSnapshot: PersistedLegalCaseInput = JSON.parse(JSON.stringify(baseSnapshot));
    // Injeta pedido duplicado intencionalmente
    duplicatedSnapshot.resolved_architecture.linked_requests.push({
      request_key: 'req_selic',
      label: 'h) Incidência Exclusiva da Taxa Selic',
      order: 80,
      included: true,
    });

    const assemblyRes = assembleDocumentFromSnapshot(duplicatedSnapshot);
    const reqKeys = assemblyRes.assembly.includedRequests.map((r) => r.key);
    const count = reqKeys.filter((k) => k === 'req_selic').length;

    assert(count === 1, 'Pedido req_selic deve constar exatamente uma única vez');
  });

  // Teste 10: Bloco sem conteúdo recebe marcador de não homologado
  await runTest('10. Bloco sem conteúdo recebe marcador de não homologado', () => {
    const snapshotWithFutureBlock: PersistedLegalCaseInput = JSON.parse(JSON.stringify(baseSnapshot));
    const futureKey = 'tese_inedita_bloco_futuro_sem_conteudo';
    snapshotWithFutureBlock.resolved_architecture.included_blocks.push({
      block_key: futureKey,
      included: true,
      reason: 'bloco futuro ainda não homologado na BlockLibrary',
      trigger: 'test',
      content_status: 'unavailable',
    });

    const assemblyRes = assembleDocumentFromSnapshot(snapshotWithFutureBlock);
    assert(
      assemblyRes.unhomologatedBlocks.includes(futureKey),
      'Chave do bloco deve ser listada em unhomologatedBlocks'
    );

    const futureBlock = assemblyRes.assembly.includedBlocks.find((b) => b.key === futureKey);
    assert(Boolean(futureBlock), 'Bloco deve estar presente no array final');
    assert(
      futureBlock?.content === `[CONTEÚDO DO BLOCO AINDA NÃO HOMOLOGADO — ${futureKey}]`,
      'Conteúdo deve conter o marcador visual inequívoco obrigatório'
    );
  });

  // Gate PME: a montagem deve explicitar pendências, não ocultá-las.
  await runTest('PME.1. Snapshot histórico não contém variáveis ou blocos pendentes', () => {
    const result = assembleDocumentFromSnapshot(baseSnapshot);
    assert(result.unresolvedVariables.length === 0, 'DOCX PME não pode conter variáveis não resolvidas');
    assert(result.unhomologatedBlocks.length === 0, 'DOCX PME não pode conter blocos não homologados');
  });

  await runTest('PME.2. Condição de liminar não pode produzir teses contraditórias', () => {
    const result = assembleDocumentFromSnapshot(baseSnapshot);
    const keys = result.assembly.includedBlocks.map((block) => block.key);
    assert(keys.includes('injunction_denied_block'), 'Snapshot histórico deve contemplar liminar indeferida');
    assert(!keys.includes('injunction_granted_block'), 'Snapshot histórico não pode alegar liminar deferida');
  });

  await runTest('PME.3. Pedidos devem corresponder aos blocos associados', () => {
    const result = assembleDocumentFromSnapshot(baseSnapshot);
    const included = new Set(result.assembly.includedBlocks.map((block) => block.key));
    const requests = new Set(result.assembly.includedRequests.map((request) => request.key));
    const catalog = result.assembly.architecture.blocks;
    for (const block of catalog) {
      if (block.associatedRequestKey && included.has(block.key)) {
        assert(requests.has(block.associatedRequestKey), 'Pedido associado ausente: ' + block.key);
      }
    }
  });

  // Teste 11: Nenhuma chamada OpenAI
  await runTest('11. Nenhuma chamada OpenAI', () => {
    const serviceContent = fs.readFileSync('src/services/experimentalDocxService.ts', 'utf-8');
    assert(!/import\s+.*from\s+['"]openai['"]/.test(serviceContent), 'Nenhum import de SDK OpenAI');
    assert(!/new\s+OpenAI\(/.test(serviceContent), 'Nenhum construtor OpenAI instanciado');
    assert(!/\bopenai\.(chat|embeddings|completions)\b/i.test(serviceContent), 'Nenhuma invocação de método de IA');
    assert(!/gpt-4|gpt-3|chat\.completions/.test(serviceContent), 'Nenhum endpoint de LLM referenciado');

    // Confirmação funcional: os textos não sofrem reformulação por IA
    const customSnapshot = getOfficialHomologatedSnapshot();
    const res = assembleDocumentFromSnapshot(customSnapshot);
    assert(
      res.assembly.resolvedVariables.EXECUTIVE_SUMMARY === customSnapshot.custom_texts.executive_summary,
      'Variáveis de texto resolvidas sem intermédio de IA'
    );
  });

  // Teste 12: Nenhuma chamada n8n
  await runTest('12. Nenhuma chamada n8n', () => {
    const serviceContent = fs.readFileSync('src/services/experimentalDocxService.ts', 'utf-8');
    assert(!/webhook.*n8n|n8n\.cloud/i.test(serviceContent), 'Nenhum webhook n8n configurado');
    assert(!serviceContent.includes('VITE_N8N'), 'Nenhuma variável n8n utilizada');
    assert(!/fetch\s*\(\s*.*n8n/i.test(serviceContent), 'Nenhuma chamada fetch para n8n');
  });

  // Teste 13: Nenhum PDF é gerado
  await runTest('13. Nenhum PDF é gerado', async () => {
    const result = await experimentalDocxService.generateDocx(baseSnapshot);
    assert(!result.filename.endsWith('.pdf'), 'Extensão do arquivo não pode ser .pdf');
    assert(result.filename.endsWith('.docx'), 'Extensão do arquivo deve ser .docx');
    assert(result.mimeType !== 'application/pdf', 'MIME type não pode ser PDF');
  });

  // Teste 14: Snapshot original não é alterado
  await runTest('14. Snapshot original não é alterado', async () => {
    const originalSnapshot = getOfficialHomologatedSnapshot();
    const snapshotBefore = JSON.stringify(originalSnapshot);

    await experimentalDocxService.generateDocx(originalSnapshot);

    const snapshotAfter = JSON.stringify(originalSnapshot);
    assert(snapshotBefore === snapshotAfter, 'O snapshot passado como parâmetro não deve sofrer nenhuma mutação');
  });

  // Teste 15: Falha do renderer não apresenta falso sucesso
  await runTest('15. Falha do renderer não apresenta falso sucesso', async () => {
    const brokenSnapshot: PersistedLegalCaseInput = JSON.parse(JSON.stringify(baseSnapshot));
    // Remove campo obrigatório
    delete (brokenSnapshot as any).basic_data;

    let threw = false;
    try {
      await experimentalDocxService.generateDocx(brokenSnapshot);
    } catch (err: unknown) {
      threw = true;
      assert(err instanceof Error, 'Erro capturado deve ser instância de Error');
    }

    assert(threw, 'Operação com snapshot quebrado deve lançar exceção e não reportar falso sucesso');
  });

  console.log('==================================================');
  console.log(`TOTAL DE TESTES DA GERAÇÃO EXPERIMENTAL APROVADOS: ${passedTests}`);
  console.log('==================================================\n');
}

runSuite();
