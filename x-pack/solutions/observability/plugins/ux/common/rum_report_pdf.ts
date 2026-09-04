/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import type { RumReportResponse } from './rum_report';
import { reportModel } from './rum_report_email';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const FONT_SIZE = 10;
const LINE_HEIGHT = 13;
const MAX_CHARS = 92;
const LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT);

export const toPdfSafeText = (value: string): string =>
  value
    .replace(/\u2022/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/[—–]/g, '-')
    .replace(/[^\x20-\x7E\n]/g, '');

export interface PdfTextRun {
  text: string;
  bold: boolean;
}

/** Splits `**bold**` / `__bold__` into Helvetica vs Helvetica-Bold runs. */
export const parsePdfInline = (value: string): PdfTextRun[] => {
  const safe = toPdfSafeText(value);
  const runs: PdfTextRun[] = [];
  const mark = /(\*\*|__)(.+?)\1/g;
  let last = 0;
  for (const match of safe.matchAll(mark)) {
    const offset = match.index ?? 0;
    if (offset > last) {
      runs.push({ text: safe.slice(last, offset), bold: false });
    }
    if (match[2]) {
      runs.push({ text: match[2], bold: true });
    }
    last = offset + match[0].length;
  }
  if (last < safe.length) {
    runs.push({ text: safe.slice(last), bold: false });
  }
  return runs.filter((run) => run.text.length > 0);
};

const escapePdf = (value: string): string =>
  toPdfSafeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const wrapLine = (line: string): string[] => {
  if (line.length <= MAX_CHARS) {
    return [line.length === 0 ? ' ' : line];
  }
  const wrapped: string[] = [];
  for (let i = 0; i < line.length; i += MAX_CHARS) {
    wrapped.push(line.slice(i, i + MAX_CHARS));
  }
  return wrapped;
};

const headingOf = (line: string): { font: 'F1' | 'F2'; text: string } => {
  if (line.startsWith('# ')) {
    return { font: 'F2', text: line.slice(2) };
  }
  if (line.startsWith('## ')) {
    return { font: 'F2', text: line.slice(3) };
  }
  return { font: 'F1', text: line };
};

const pageContent = (lines: string[]): string => {
  const ops = ['BT', `/F1 ${FONT_SIZE} Tf`, `${MARGIN} ${PAGE_HEIGHT - MARGIN} Td`];
  let font: 'F1' | 'F2' = 'F1';
  lines.forEach((line, index) => {
    if (index > 0) {
      ops.push(`0 -${LINE_HEIGHT} Td`);
    }
    const next = headingOf(line);
    if (next.font !== font) {
      ops.push(`/${next.font} ${FONT_SIZE} Tf`);
      font = next.font;
    }
    ops.push(`(${escapePdf(next.text)}) Tj`);
  });
  ops.push('ET');
  return ops.join('\n');
};

/** Builds a Helvetica PDF 1.4 buffer from plain/markdown text. */
export const textToPdfBuffer = (text: string): Buffer => {
  const lines = text.split('\n').flatMap(wrapLine);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }
  if (pages.length === 0) {
    pages.push([' ']);
  }

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageObjectIds = pages.map((_, index) => 5 + index * 2);
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${
      pages.length
    } >>`
  );
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  pages.forEach((pageLines, index) => {
    const contentId = 6 + index * 2;
    const stream = pageContent(pageLines);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`
    );
  });

  let out = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(out, 'utf8'));
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(out, 'utf8');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(out, 'utf8');
};

const A4_W = 595.28;
const A4_H = 841.89;
const M = 48;
const TITLE = 20;
const H2 = 13;
const BODY = 10;
const META = 9;
const LEAD = 14;
const INK = rgb(0.11, 0.13, 0.16);
const MUTED = rgb(0.35, 0.38, 0.42);
const RULE = rgb(0.82, 0.85, 0.88);
const ACCENT = rgb(0.0, 0.47, 0.8);
const AI_BG = rgb(0.96, 0.97, 0.99);

const wrapPdf = (font: PDFFont, text: string, size: number, maxWidth: number): string[] => {
  const safe = toPdfSafeText(text);
  if (!safe) {
    return [' '];
  }
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [' '];
};

const wrapPdfRuns = (
  runs: PdfTextRun[],
  size: number,
  maxWidth: number,
  regular: PDFFont,
  boldFont: PDFFont
): PdfTextRun[][] => {
  if (runs.length === 0) {
    return [[{ text: ' ', bold: false }]];
  }
  const faceOf = (isBold: boolean) => (isBold ? boldFont : regular);
  const lines: PdfTextRun[][] = [];
  let current: PdfTextRun[] = [];
  let width = 0;

  const append = (token: string, isBold: boolean) => {
    const tokenWidth = faceOf(isBold).widthOfTextAtSize(token, size);
    if (width > 0 && width + tokenWidth > maxWidth) {
      lines.push(current);
      current = [];
      width = 0;
      if (/^\s+$/.test(token)) {
        return;
      }
    }
    const last = current[current.length - 1];
    if (last && last.bold === isBold) {
      last.text += token;
    } else {
      current.push({ text: token, bold: isBold });
    }
    width += tokenWidth;
  };

  for (const run of runs) {
    for (const token of run.text.split(/(\s+)/)) {
      if (!token || (width === 0 && /^\s+$/.test(token))) {
        continue;
      }
      append(token, run.bold);
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [[{ text: ' ', bold: false }]];
};

interface PdfCursor {
  page: PDFPage;
  y: number;
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
}

const newPage = async (ctx: PdfCursor): Promise<void> => {
  ctx.page = ctx.doc.addPage([A4_W, A4_H]);
  ctx.y = A4_H - M;
};

const ensure = async (ctx: PdfCursor, need: number): Promise<void> => {
  if (ctx.y - need < M) {
    await newPage(ctx);
  }
};

const drawLines = async (
  ctx: PdfCursor,
  lines: string[],
  size: number,
  font: PDFFont,
  color: typeof INK,
  leading = LEAD
): Promise<void> => {
  for (const line of lines) {
    await ensure(ctx, leading);
    ctx.page.drawText(line, { x: M, y: ctx.y - size, size, font, color });
    ctx.y -= leading;
  }
};

/** Typeset scorecard + AI summary (email attachment). Not a screenshot. */
export const buildReportPdfBuffer = async (
  report: RumReportResponse,
  shareUrl: string,
  narrative?: string
): Promise<Buffer> => {
  const model = reportModel(report);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: PdfCursor = { doc, page: doc.addPage([A4_W, A4_H]), y: A4_H - M, font, bold };
  const max = A4_W - M * 2;

  await drawLines(ctx, wrapPdf(bold, model.title, TITLE, max), TITLE, bold, INK, 26);
  for (const line of model.meta) {
    await drawLines(ctx, wrapPdf(font, line, META, max), META, font, MUTED, 12);
  }
  ctx.y -= 8;
  ctx.page.drawLine({
    start: { x: M, y: ctx.y },
    end: { x: A4_W - M, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 16;

  const trimmed = narrative?.trim();
  if (trimmed) {
    await ensure(ctx, 28);
    ctx.page.drawRectangle({
      x: M,
      y: ctx.y - 18,
      width: 4,
      height: 18,
      color: ACCENT,
    });
    ctx.page.drawText('AI summary', {
      x: M + 12,
      y: ctx.y - H2,
      size: H2,
      font: bold,
      color: ACCENT,
    });
    ctx.y -= 22;
    for (const raw of trimmed.split('\n')) {
      const line = raw.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '- ');
      const wrapped = line.trim()
        ? wrapPdfRuns(parsePdfInline(line), BODY, max - 12, font, bold)
        : [[{ text: ' ', bold: false }]];
      for (const part of wrapped) {
        await ensure(ctx, 13);
        ctx.page.drawRectangle({
          x: M,
          y: ctx.y - 12,
          width: max,
          height: 13,
          color: AI_BG,
        });
        let x = M + 12;
        for (const run of part) {
          const face = run.bold ? bold : font;
          ctx.page.drawText(run.text, { x, y: ctx.y - BODY, size: BODY, font: face, color: INK });
          x += face.widthOfTextAtSize(run.text, BODY);
        }
        ctx.y -= 13;
      }
    }
    ctx.y -= 12;
  }

  for (const section of model.sections) {
    await ensure(ctx, 36);
    await drawLines(ctx, wrapPdf(bold, section.heading, H2, max), H2, bold, INK, 18);
    ctx.page.drawLine({
      start: { x: M, y: ctx.y + 4 },
      end: { x: A4_W - M, y: ctx.y + 4 },
      thickness: 0.5,
      color: RULE,
    });
    ctx.y -= 6;
    for (const row of section.rows) {
      await drawLines(ctx, wrapPdf(font, `- ${row}`, BODY, max), BODY, font, INK, 13);
    }
    ctx.y -= 8;
  }

  await ensure(ctx, 24);
  await drawLines(
    ctx,
    wrapPdf(font, `Open in Kibana: ${shareUrl}`, META, max),
    META,
    font,
    ACCENT,
    12
  );

  return Buffer.from(await doc.save());
};
