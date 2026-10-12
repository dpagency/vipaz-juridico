import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { mkdir, writeFile } from 'node:fs/promises';
import { DocumentRenderer } from '../../../services/documentRenderer.js';
import { getPhase41HomologatedSnapshot, assembleDocumentFromSnapshot } from '../../../services/experimentalDocxService.js';
import { resolveVipazStudioTheme } from '../../../services/vipazStudioTheme.js';

async function run() {
  const theme = resolveVipazStudioTheme({ organizationName: 'Escritorio Ficticio', headerText: 'TESTE VIPAZ STUDIO', footerText: 'Documento ficticio', fontFamily: 'Times New Roman' });
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
  // 5. Identificação processual e tese central devem estar no documento.
  assert.ok(documentXml.includes('0802491'), 'Número de processo fictício ausente');
  assert.ok(documentXml.includes('SUL AMÉRICA') || documentXml.includes('SUL AM'), 'Identificação da parte do modelo PME ausente');
  console.log('VIPAZ Studio: cinco gates OOXML/tema/conteúdo aprovados');
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/vipaz-studio-contestacao-ficticia.docx', new Uint8Array(await docx.arrayBuffer()));
  console.log('VIPAZ Studio: DOCX gerado com sucesso, bytes:', docx.size);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
