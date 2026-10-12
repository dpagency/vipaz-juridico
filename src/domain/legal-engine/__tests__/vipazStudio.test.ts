import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { mkdir, writeFile } from 'node:fs/promises';
import { DocumentRenderer } from '../../../services/documentRenderer.js';
import { getPhase41HomologatedSnapshot, assembleDocumentFromSnapshot } from '../../../services/experimentalDocxService.js';
import { inspectStudioStructure, validateStudioData, setStudioDataPath, renderStudioDocx } from '../../../services/studioTemplateEngine.js';
import { resolveVipazStudioTheme } from '../../../services/vipazStudioTheme.js';

async function run() {
  const theme = resolveVipazStudioTheme({ organizationName: 'Escritorio Ficticio', headerText: 'TESTE VIPAZ STUDIO', footerText: 'Documento ficticio', fontFamily: 'Times New Roman', fontSizeHalfPoints: 26, textColor: '112233', mutedColor: '445566', marginTopTwips: 1550, marginBottomTwips: 1560, marginLeftTwips: 1800, marginRightTwips: 1400 });
  const result = assembleDocumentFromSnapshot(getPhase41HomologatedSnapshot());
  assert.ok(result.assembly.includedBlocks.length > 0);
  const docx = await new DocumentRenderer().renderToDocxBlob(result.assembly, theme);
  assert.ok(docx.size > 1000);
  const bytes = new Uint8Array(await docx.arrayBuffer());
  assert.equal(bytes[0], 80);
  assert.equal(bytes[1], 75);
  assert.throws(() => resolveVipazStudioTheme({ fontSizeHalfPoints: 3 }));
  // Cinco gates de homologação visual e estrutural; nenhum depende de IA ou n8n.
  const zip = await JSZip.loadAsync(await docx.arrayBuffer());
  const documentXml = await zip.file('word/document.xml')?.async('string');
  const stylesXml = await zip.file('word/styles.xml')?.async('string');
  const headerXml = await zip.file('word/header1.xml')?.async('string');
  const footerXml = await zip.file('word/footer1.xml')?.async('string');
  const sectionXml = documentXml || '';
  // 1. O pacote OOXML precisa conter corpo, estilos, cabeçalho e rodapé.
  assert.ok(documentXml && stylesXml && headerXml && footerXml, 'DOCX incompleto: partes OOXML obrigatórias ausentes');
  // 2. A marca institucional configurada precisa constar do cabeçalho.
  assert.ok(headerXml.includes('TESTE VIPAZ STUDIO'), 'Cabeçalho personalizado ausente');
  // 3. O rodapé deve informar o caráter fictício da minuta.
  assert.ok(footerXml.includes('Documento ficticio'), 'Rodapé personalizado ausente');
  // 4. Fonte personalizada e configuração de margens devem estar no OOXML.
  assert.ok((documentXml + stylesXml).includes('Times New Roman'), 'Fonte do tema não aplicada');
  assert.ok(sectionXml.includes('<w:pgMar'), 'Margens da seção ausentes');
  for (const margin of ['1550', '1560', '1800', '1400']) assert.ok(sectionXml.includes('="' + margin + '"'), 'Margem personalizada ausente: ' + margin);
  assert.ok(documentXml.includes('112233'), 'Cor de texto personalizada ausente');
  assert.ok((documentXml + stylesXml).includes('w:sz w:val="26"'), 'Tamanho de fonte personalizado ausente');
  // 5. Identificação processual e tese central devem estar no documento.
  assert.ok(documentXml.includes('0802491'), 'Número de processo fictício ausente');
  assert.ok(documentXml.includes('SUL AMÉRICA') || documentXml.includes('SUL AM'), 'Identificação da parte do modelo PME ausente');
  // Gate de importação: modelo fictício com marcador repartido entre runs.
  const fixture = new JSZip();
  const originalXml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>{d.processo.</w:t></w:r><w:r><w:t>numero}</w:t></w:r></w:p><w:p><w:r><w:t>Texto jurídico inalterado</w:t></w:r></w:p></w:body></w:document>';
  fixture.file('word/document.xml', originalXml);
  const fixtureBlob = new Blob([await fixture.generateAsync({ type: 'arraybuffer' })]);
  const inspection = await inspectStudioStructure(fixtureBlob);
  assert.equal(inspection.markers.length, 1, 'Placeholder dividido entre runs não identificado');
  assert.equal(inspection.markers[0].path, 'processo.numero');
  assert.equal(inspection.paragraphs.length, 2);
  assert.deepEqual(validateStudioData(inspection.markers, {}).missing, ['processo.numero']);
  const mapped = setStudioDataPath({}, 'processo.numero', '0000000-00.2026.8.00.0000');
  assert.equal((mapped.processo as Record<string, unknown>).numero, '0000000-00.2026.8.00.0000');
  assert.throws(() => setStudioDataPath({}, '__proto__.x', 'inseguro'));
  const filled = await renderStudioDocx(fixtureBlob, mapped);
  const filledXml = await (await JSZip.loadAsync(await filled.arrayBuffer())).file('word/document.xml')?.async('string');
  assert.ok(filledXml?.includes('0000000-00.2026.8.00.0000'), 'Valor fictício não aplicado');
  assert.ok(filledXml?.includes('<w:b/>'), 'Estilo original removido');
  assert.ok(filledXml?.includes('Texto jurídico inalterado'), 'Conteúdo jurídico alterado');
  assert.ok(!filledXml?.includes('{d.processo.'), 'Placeholder residual');
  console.log('VIPAZ Studio: importação, mapeamento, segurança e substituição entre runs aprovados');
  console.log('VIPAZ Studio: cinco gates OOXML/tema/conteúdo aprovados');
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/vipaz-studio-contestacao-ficticia.docx', new Uint8Array(await docx.arrayBuffer()));
  console.log('VIPAZ Studio: DOCX gerado com sucesso, bytes:', docx.size);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
