import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { prepareVipazReview, type VipazApprovedThesis, type VipazPage } from './vipazMcpQualityTools';
import type { VipazComposition, VipazTemplateRule } from './vipazCompositionContract';

export type VipazApprovedTemplateBlock = VipazTemplateRule & {
  /** Literal text comes from a trusted, versioned Studio/Library template. */
  fixedText?: string;
  title?: string;
};
export type VipazDocxInput = {
  composition: VipazComposition;
  templateBlocks: VipazApprovedTemplateBlock[];
  extractedPages: VipazPage[];
  approvedTheses: VipazApprovedThesis[];
};
const headings: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined> = {
  Title: HeadingLevel.TITLE,
  Heading1: HeadingLevel.HEADING_1,
  Heading2: HeadingLevel.HEADING_2,
  Normal: undefined,
};
const paragraph = (text: string, heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
  new Paragraph({ heading, children: [new TextRun({ text })], spacing: { after: 160 } });

/**
 * Generates a new, structurally controlled DOCX, with approved template blocks in
 * template order. It does not modify or reproduce an imported DOCX's rich layout.
 * Fail closed if evidence or thesis provenance is not verifiable.
 */
export async function renderVipazReviewedDocx(input: VipazDocxInput): Promise<Buffer> {
  const { composition, templateBlocks, extractedPages, approvedTheses } = input;
  const result = prepareVipazReview(composition, templateBlocks, extractedPages, approvedTheses);
  if (!result.approvedForHumanReview) {
    throw new Error('VIPAZ_DOCX_BLOCKED: ' + result.issues.map(issue => issue.code).join(','));
  }
  const byId = new Map(composition.blocks.map(block => [block.blockId, block]));
  const paragraphs: Paragraph[] = [];
  for (const rule of templateBlocks) {
    const heading = headings[rule.headingStyle ?? 'Normal'];
    if (rule.kind === 'fixed') {
      if (rule.title) paragraphs.push(paragraph(rule.title, heading ?? HeadingLevel.HEADING_2));
      if (typeof rule.fixedText !== 'string') throw new Error('VIPAZ_TEMPLATE_FIXED_TEXT_MISSING: ' + rule.blockId);
      paragraphs.push(...rule.fixedText.split(/\r?\n/).map(line => paragraph(line)));
      continue;
    }
    const block = byId.get(rule.blockId);
    if (!block || (block.kind === 'conditional' && block.included === false)) continue;
    if (rule.title) paragraphs.push(paragraph(rule.title, heading ?? HeadingLevel.HEADING_2));
    if (block.kind === 'repeated_theses') {
      for (const thesis of block.theses ?? []) {
        paragraphs.push(paragraph(thesis.title, heading ?? HeadingLevel.HEADING_2));
        paragraphs.push(...thesis.paragraphs.map(line => paragraph(line)));
      }
    } else if (typeof block.text === 'string') {
      paragraphs.push(...block.text.split(/\r?\n/).map(line => paragraph(line)));
    }
  }
  if (!paragraphs.length) throw new Error('VIPAZ_DOCX_EMPTY');
  const document = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  return Packer.toBuffer(document);
}
