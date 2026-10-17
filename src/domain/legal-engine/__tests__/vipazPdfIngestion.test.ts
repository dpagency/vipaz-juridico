import { strict as assert } from 'node:assert';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractVipazPdfPages, indexVipazPdfForHomologation } from '../vipazPdfIngestion';

const dir = await mkdtemp(join(tmpdir(), 'vipaz-pdf-'));
try {
  const invalid = join(dir, 'invalid.pdf');
  await writeFile(invalid, 'not a pdf');
  await assert.rejects(extractVipazPdfPages(invalid), /VIPAZ_INVALID_PDF/);
  await assert.rejects(indexVipazPdfForHomologation('invalid', invalid), /VIPAZ_HOMOLOGATION_DISABLED/);
  console.log('VIPAZ PDF ingestion: invalid file and disabled ingestion rejected');
} finally {
  await rm(dir, { recursive: true, force: true });
}
