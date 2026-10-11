/**
 * VIPAZ Jurídico — Motor Determinístico de Montagem Jurídica
 * Renderizador de Documentos DOCX Profissionais
 * Utiliza exclusivamente a biblioteca 'docx' oficial
 */

import {
  Document,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  PageNumber,
  Packer,
} from 'docx';
import { ResolvedDocumentAssembly } from '../domain/legal-engine/types.js';
import { resolveVipazStudioTheme, type VipazStudioTheme } from './vipazStudioTheme.js';

export class DocumentRenderer {
  /**
   * Converte a montagem jurídica resolvida em um documento DOCX profissional (Blob)
   */
  async renderToDocxBlob(assembly: ResolvedDocumentAssembly, themeOverrides: Partial<VipazStudioTheme> = {}): Promise<Blob> {
    const theme = resolveVipazStudioTheme(themeOverrides);
    const paragraphs: Paragraph[] = [];

    for (let i = 0; i < assembly.includedBlocks.length; i++) {
      const block = assembly.includedBlocks[i];
      const lines = block.content.split('\n');

      // Se não for o primeiro bloco, insere espaçamento entre tópicos
      if (i > 0) {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [],
          })
        );
      }

      // Adiciona o conteúdo do bloco linha por linha formatado
      let isFirstLineOfBlock = true;

      for (let j = 0; j < lines.length; j++) {
        const rawLine = lines[j];
        const trimmed = rawLine.trim();

        if (!trimmed) {
          // Linha em branco para respiro
          paragraphs.push(
            new Paragraph({
              spacing: { after: 100 },
              children: [],
            })
          );
          continue;
        }

        // Título de Seção (todo em maiúsculas ou títulos de blocos)
        const isSectionHeader =
          trimmed.startsWith('DO ') ||
          trimmed.startsWith('DA ') ||
          trimmed.startsWith('DAS ') ||
          trimmed.startsWith('DOS ') ||
          trimmed.startsWith('EMENTA EXECUTIVA') ||
          trimmed.startsWith('DOUTO JUÍZO') ||
          trimmed.startsWith('CONTESTAÇÃO');

        // Citação destacada / Decisão / Jurisprudência (começa com aspas)
        const isCitation =
          trimmed.startsWith('"') ||
          trimmed.startsWith('“') ||
          (trimmed.endsWith('"') && trimmed.length > 80) ||
          trimmed.startsWith('Isso porque') ||
          trimmed.startsWith('Como visto, no caso') ||
          trimmed.startsWith('Os contratos coletivos');

        // Itens de requerimento ou listas
        const isListItem =
          /^[a-z]\)/.test(trimmed) ||
          /^[a-z]\.[0-9]\)/.test(trimmed) ||
          /^[0-9]+\)/.test(trimmed);

        if (isSectionHeader && isFirstLineOfBlock) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 280, after: 180 },
              children: [
                new TextRun({
                  text: trimmed,
                  bold: true,
                  size: 24, // 12pt
                  font: theme.fontFamily,
                  color: '0F172A',
                }),
              ],
            })
          );
          isFirstLineOfBlock = false;
        } else if (isCitation) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { left: 2268 }, // Recuo de 4cm (padrão ABNT / forense)
              spacing: { before: 120, after: 140, line: 240 }, // Entrelinha simples
              children: [
                new TextRun({
                  text: trimmed,
                  italics: true,
                  size: 20, // 10pt
                  font: theme.fontFamily,
                  color: '334155',
                }),
              ],
            })
          );
        } else if (isListItem) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { left: 720 },
              spacing: { before: 100, after: 100, line: 360 },
              children: [
                new TextRun({
                  text: trimmed,
                  size: 24,
                  font: theme.fontFamily,
                  color: '0F172A',
                }),
              ],
            })
          );
        } else if (trimmed.startsWith('Processo nº')) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 140, after: 200 },
              children: [
                new TextRun({
                  text: trimmed,
                  bold: true,
                  size: 24,
                  font: theme.fontFamily,
                  color: '0F172A',
                }),
              ],
            })
          );
        } else if (
          trimmed.startsWith('Nestes Termos') ||
          trimmed.startsWith('Pede Deferimento')
        ) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 200, after: 80 },
              children: [
                new TextRun({
                  text: trimmed,
                  bold: true,
                  size: 24,
                  font: theme.fontFamily,
                  color: '0F172A',
                }),
              ],
            })
          );
        } else if (
          trimmed.startsWith('BRUNA D’ ANGELO') ||
          trimmed.startsWith('MÁRCIO AGUIAR') ||
          trimmed.startsWith('JOSÉ ANTÔNIO MARTINS')
        ) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 140, after: 40 },
              children: [
                new TextRun({
                  text: trimmed,
                  bold: true,
                  size: 22,
                  font: theme.fontFamily,
                  color: '0F172A',
                }),
              ],
            })
          );
        } else if (trimmed.startsWith('OAB/')) {
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 120 },
              children: [
                new TextRun({
                  text: trimmed,
                  size: 20,
                  font: theme.fontFamily,
                  color: '475569',
                }),
              ],
            })
          );
        } else {
          // Parágrafo comum de texto corrido
          paragraphs.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { firstLine: 720 }, // 1.25 cm
              spacing: { before: 80, after: 100, line: 360 }, // 1.5 line spacing
              children: [
                new TextRun({
                  text: trimmed,
                  size: 24, // 12pt
                  font: theme.fontFamily,
                  color: '0F172A',
                }),
              ],
            })
          );
        }
      }
    }

    // Cria o documento com cabeçalho e rodapé forense do escritório CAW
    const doc = new Document({
      creator: theme.organizationName,
      title: `${assembly.architecture.documentPiece} - ${assembly.resolvedVariables.PROCESS_NUMBER || 'Peça'}`,
      description: 'Peça processual montada pelo Motor Determinístico VIPAZ Jurídico',
      styles: {
        default: {
          document: {
            run: {
              font: theme.fontFamily,
              size: 24,
              color: '0F172A',
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 2.54 cm
                bottom: 1440,
                left: 1700, // ~3.0 cm
                right: 1440, // 2.54 cm
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 120 },
                  children: [
                    new TextRun({
                      text: theme.headerText,
                      bold: true,
                      size: 16, // 8pt
                      color: '64748B',
                      font: theme.fontFamily,
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 120 },
                  children: [
                    new TextRun({
                      text: theme.footerText + ' | Página ',
                      size: 16,
                      color: '94A3B8',
                      font: theme.fontFamily,
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 16,
                      color: '94A3B8',
                      font: theme.fontFamily,
                    }),
                    new TextRun({
                      text: ' de ',
                      size: 16,
                      color: '94A3B8',
                      font: theme.fontFamily,
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      size: 16,
                      color: '94A3B8',
                      font: theme.fontFamily,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: paragraphs,
        },
      ],
    });

    return await Packer.toBlob(doc);
  }
}

export const documentRenderer = new DocumentRenderer();
