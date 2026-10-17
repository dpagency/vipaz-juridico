import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/** Offline-only homologation: reads a local PDF and indexes its text by page. */
export async function extractVipazPdfPages(filePath: string): Promise<string[]> {
  const bytes = await readFile(filePath);
  if (bytes.length > 50 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== '%PDF-') {
    throw new Error('VIPAZ_INVALID_PDF');
  }
  const document = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' ').trim());
    }
  } finally {
    await document.destroy();
  }
  if (!pages.some(text => text.length >= 8)) throw new Error('VIPAZ_PDF_OCR_REQUIRED');
  return pages;
}

/**
 * Writes only pages for an existing tenant-scoped source document.
 * Requires a service role token and explicit isolated homologation flag.
 * Do not expose this function in a public API.
 */
export async function indexVipazPdfForHomologation(documentId: string, filePath: string): Promise<number> {
  if (process.env.VIPAZ_HOMOLOGATION_MODE !== 'enabled') throw new Error('VIPAZ_HOMOLOGATION_DISABLED');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('VIPAZ_SUPABASE_NOT_CONFIGURED');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: source, error } = await client.from('source_documents')
    .select('id,organization_id,process_id,mime_type').eq('id', documentId).maybeSingle();
  if (error || !source || source.mime_type !== 'application/pdf') throw new Error('VIPAZ_SOURCE_NOT_FOUND');
  const pages = await extractVipazPdfPages(filePath);
  const rows = pages.map((content, index) => ({
    organization_id: source.organization_id,
    process_id: source.process_id,
    source_document_id: source.id,
    page_number: index + 1,
    content: content || '[PAGINA SEM TEXTO]',
    extraction_method: 'pdfjs-text',
  }));
  const { error: writeError } = await client.from('vipaz_extracted_pages')
    .upsert(rows, { onConflict: 'source_document_id,page_number' });
  if (writeError) throw new Error('VIPAZ_PAGE_INDEX_FAILED: ' + writeError.message);
  return rows.length;
}
