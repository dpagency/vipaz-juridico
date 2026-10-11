import assert from 'node:assert/strict';
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
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/vipaz-studio-contestacao-ficticia.docx', new Uint8Array(await docx.arrayBuffer()));
  console.log('VIPAZ Studio: DOCX gerado com sucesso, bytes:', docx.size);
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
