import JSZip from 'jszip';

export type StudioData = Record<string, unknown>;
export interface StudioMarker { expression: string; path: string; count: number; kind: 'field' | 'repeat' | 'conditional'; }
const markerRegex = /\{d\.([^{}]+)\}/g;
const xmlEscape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decodeXml = (value: string) => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const pathOf = (expression: string) => expression.split(':')[0].replace(/\[i(?:\+1)?\]/g, '');
function resolve(data: StudioData, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, data);
}
function apply(value: unknown, expression: string): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (expression.includes(':upperCase()')) text = text.toLocaleUpperCase('pt-BR');
  if (expression.includes(':lowerCase()')) text = text.toLocaleLowerCase('pt-BR');
  return text;
}
function textOf(paragraph: string): string {
  return [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match => decodeXml(match[1])).join('');
}
function replaceText(paragraph: string, text: string): string {
  const runs = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g)];
  if (!runs.length) return paragraph;
  let index = 0;
  return paragraph.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, () => {
    const output = index++ === 0 ? xmlEscape(text) : '';
    return '<w:t xml:space="preserve">' + output + '</w:t>';
  });
}
// Replace only the text nodes intersecting each placeholder. Other runs and their
// typography remain untouched; replacement inherits the first marker run style.
function replaceMarkersPreservingRuns(paragraph: string, data: StudioData, warnings: string[]): string {
  const textNodes = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g)];
  if (!textNodes.length) return paragraph;
  const texts = textNodes.map(node => decodeXml(node[0].replace(/^<w:t(?:\s[^>]*)?>|<\/w:t>$/g, '')));
  const joined = texts.join('');
  const matches = [...joined.matchAll(markerRegex)];
  if (!matches.length) return paragraph;
  const offsets: number[] = [];
  let cursor = 0;
  for (const text of texts) { offsets.push(cursor); cursor += text.length; }
  for (const match of matches.reverse()) {
    const start = match.index!, end = start + match[0].length;
    const expression = match[1], value = resolve(data, pathOf(expression));
    if (value === undefined || value === null) warnings.push('Campo ausente: ' + pathOf(expression));
    const replacement = apply(value, expression);
    const first = offsets.reduce((found, offset, i) => offset <= start ? i : found, -1);
    const last = offsets.reduce((found, offset, i) => offset < end ? i : found, -1);
    if (first < 0 || last < 0) continue;
    const firstLocal = start - offsets[first], lastLocal = end - offsets[last];
    if (first === last) texts[first] = texts[first].slice(0, firstLocal) + replacement + texts[first].slice(lastLocal);
    else {
      texts[first] = texts[first].slice(0, firstLocal) + replacement;
      for (let i = first + 1; i < last; i++) texts[i] = '';
      texts[last] = texts[last].slice(lastLocal);
    }
  }
  let index = 0;
  return paragraph.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, () => '<w:t xml:space="preserve">' + xmlEscape(texts[index++]) + '</w:t>');
}
export function inspectStudioXml(xml: string): StudioMarker[] {
  const counts = new Map<string, StudioMarker>();
  for (const match of xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)) {
    const text = textOf(match[0]);
    for (const marker of text.matchAll(markerRegex)) {
      const expression = marker[1], path = pathOf(expression);
      const kind = /\[i(?:\+1)?\]/.test(expression) ? 'repeat' : expression.includes(':ifEQ(') ? 'conditional' : 'field';
      const current = counts.get(expression);
      if (current) current.count++;
      else counts.set(expression, { expression, path, count: 1, kind });
    }
  }
  return [...counts.values()];
}
export interface StudioParagraph { index: number; text: string; markers: string[]; style: string; }
export interface StudioInspection { markers: StudioMarker[]; paragraphs: StudioParagraph[]; tables: number; }
export async function inspectStudioStructure(file: Blob): Promise<StudioInspection> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('DOCX inválido: documento principal ausente');
  const paragraphs: StudioParagraph[] = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map((match, index) => {
    const text = textOf(match[0]);
    const style = match[0].match(/<w:pStyle\s+w:val="([^"]+)"/)?.[1] || 'Normal';
    return { index, text, style, markers: [...text.matchAll(markerRegex)].map(item => item[1]) };
  });
  return { markers: inspectStudioXml(xml), paragraphs, tables: [...xml.matchAll(/<w:tbl(?:\s[^>]*)?>/g)].length };
}

export async function inspectStudioDocx(file: Blob): Promise<StudioMarker[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('O arquivo não contém word/document.xml');
  return inspectStudioXml(xml);
}
export interface StudioValidation { missing: string[]; unsupported: string[]; available: string[]; }
export function validateStudioData(markers: StudioMarker[], data: StudioData): StudioValidation {
  const missing: string[] = [], unsupported: string[] = [], available: string[] = [];
  for (const marker of markers) {
    if (marker.kind !== 'field') { unsupported.push(marker.expression); continue; }
    const value = resolve(data, marker.path);
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) missing.push(marker.path);
    else if (typeof value === 'object') unsupported.push(marker.expression);
    else available.push(marker.path);
  }
  return { missing: [...new Set(missing)], unsupported: [...new Set(unsupported)], available: [...new Set(available)] };
}
export function setStudioDataPath(data: StudioData, path: string, value: string): StudioData {
  if (!/^[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*$/.test(path) || path.split('.').some(k => ['__proto__', 'prototype', 'constructor'].includes(k))) throw new Error('Caminho de variável inválido');
  const copy: StudioData = JSON.parse(JSON.stringify(data));
  const keys = path.split('.');
  let cursor: StudioData = copy;
  for (const key of keys.slice(0, -1)) {
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) cursor[key] = {};
    cursor = cursor[key] as StudioData;
  }
  cursor[keys[keys.length - 1]] = value;
  return copy;
}

export interface StudioLegalSection { heading: StudioParagraph; paragraphs: StudioParagraph[]; category: 'tese' | 'pedido' | 'secao'; }
export function groupStudioLegalSections(paragraphs: StudioParagraph[]): StudioLegalSection[] {
  const sections: StudioLegalSection[] = [];
  for (const paragraph of paragraphs) {
    const text = paragraph.text.trim();
    if (!text) continue;
    const heading = /^(?:[IVXLC]+[.)-]|\d+(?:\\.\\d+)*[.)\\-])\s+/.test(text) || /heading|title|titulo|título/i.test(paragraph.style) || (/^[A-ZÀ-Ú\\s]{8,}$/.test(text) && text.length < 130);
    if (heading) {
      const category = /PEDIDOS|REQUERIMENTOS|REQUER/i.test(text) ? 'pedido' : /MÉRITO|PRELIMINAR|TESE|REAJUSTE|CONTRATO/i.test(text) ? 'tese' : 'secao';
      sections.push({ heading: paragraph, paragraphs: [], category });
    } else if (sections.length) sections[sections.length - 1].paragraphs.push(paragraph);
  }
  return sections;
}

export async function renderStudioDocx(file: Blob, data: StudioData): Promise<Blob> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('DOCX inválido: documento principal ausente');
  const xml = await entry.async('string');
  // Fail closed: legacy Carbone loops and conditions need explicit migration.
  // Silently dropping legal paragraphs could change the meaning of a pleading.
  const unsupported = inspectStudioXml(xml).filter(marker => marker.kind !== 'field');
  if (unsupported.length) {
    throw new Error('Modelo contém condições ou repetições Carbone ainda não homologadas: ' +
      unsupported.map(marker => '{d.' + marker.expression + '}').join(', '));
  }
  const warnings: string[] = [];
  const output = xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, paragraph => replaceMarkersPreservingRuns(paragraph, data, warnings));
  if (warnings.length) throw new Error([...new Set(warnings)].join('\n'));
  zip.file('word/document.xml', output);
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
