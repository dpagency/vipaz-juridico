import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractVipazPdfPages } from '../vipazPdfIngestion';

/** Build a tiny, self-contained PDF with two pages; no case data or network. */
function pdfFixture(): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '',
    '',
  ];
  const stream = (value: string) => {
    const data = 'BT /F1 12 Tf 50 700 Td (' + value + ') Tj ET\n';
    return '<< /Length ' + Buffer.byteLength(data) + ' >>\nstream\n' + data + 'endstream';
  };
  objects[5] = stream('Primeira pagina prova documental');
  objects[6] = stream('Segunda pagina tutela provisoria');
  let text = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(text));
    text += (i + 1) + ' 0 obj\n' + objects[i] + '\nendobj\n';
  }
  const xrefOffset = Buffer.byteLength(text);
  text += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) text += String(offset).padStart(10, '0') + ' 00000 n \n';
  text += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
  return Buffer.from(text);
}

const dir = await mkdtemp(join(tmpdir(), 'vipaz-pdf-e2e-'));
try {
  const file = join(dir, 'autos-sinteticos.pdf');
  await writeFile(file, pdfFixture());
  const pages = await extractVipazPdfPages(file);
  assert.equal(pages.length, 2);
  assert.match(pages[0], /Primeira pagina prova documental/);
  assert.match(pages[1], /Segunda pagina tutela provisoria/);
  console.log('VIPAZ: two-page PDF extraction verified with synthetic legal evidence');
} finally {
  await rm(dir, { recursive: true, force: true });
}
