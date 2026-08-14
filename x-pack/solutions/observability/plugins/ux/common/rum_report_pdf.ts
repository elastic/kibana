/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
