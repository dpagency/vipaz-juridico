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
export async function inspectStudioDocx(file: Blob): Promise<StudioMarker[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('O arquivo não contém word/document.xml');
  return inspectStudioXml(xml);
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
  const output = xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, paragraph => {
    const text = textOf(paragraph);
    const markers = [...text.matchAll(markerRegex)];
    if (!markers.length) return paragraph;
    const conditional = markers.find(m => m[1].includes(':ifEQ(false):drop(p)'));
    if (conditional && resolve(data, pathOf(conditional[1])) === false) return '';
    const repeat = markers.find(m => /\[i(?:\+1)?\]/.test(m[1]));
    if (repeat) {
      const value = resolve(data, pathOf(repeat[1]));
      if (!Array.isArray(value)) { warnings.push('Lista ausente: ' + pathOf(repeat[1])); return ''; }
      // A list is rendered as complete paragraphs; no fragile [i]/[i+1] pairing.
      // Legacy templates may contain adjacent [i] and [i+1] paragraphs.
      if (repeat[1].includes('[i+1]')) return '';
      return value.map(item => replaceText(paragraph, text.replace(markerRegex, (_full, expr: string) =>
        /\[i(?:\+1)?\]/.test(expr) ? apply(item, expr) : apply(resolve(data, pathOf(expr)), expr)
      ))).join('');
    }
    const rendered = text.replace(markerRegex, (_full, expr: string) => {
      if (expr.includes(':ifEQ(false):drop(p)')) return '';
      const value = resolve(data, pathOf(expr));
      if (value === undefined) warnings.push('Campo ausente: ' + pathOf(expr));
      return apply(value, expr);
    });
    return replaceText(paragraph, rendered);
  });
  if (warnings.length) throw new Error([...new Set(warnings)].join('\n'));
  zip.file('word/document.xml', output);
  return new Blob([await zip.generateAsync({ type: 'uint8array' })], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
