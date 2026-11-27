/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PDFFont, PDFPage } from 'pdf-lib';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type {
  ChangeDirection,
  MeasureUnit,
  ScorecardMeasure,
  ScorecardPeriod,
  ScorecardReport,
  ScorecardSection,
} from './scorecard';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLUMN = {
  label: MARGIN + 8,
  value: MARGIN + 340,
  previous: MARGIN + 420,
  change: MARGIN + CONTENT_WIDTH - 8,
} as const;

const COLOR = {
  header: rgb(0.07, 0.2, 0.35),
  text: rgb(0.1, 0.12, 0.16),
  subdued: rgb(0.42, 0.45, 0.5),
  stripe: rgb(0.96, 0.97, 0.98),
  rule: rgb(0.85, 0.87, 0.9),
  white: rgb(1, 1, 1),
  good: rgb(0.05, 0.66, 0.46),
  needsImprovement: rgb(0.96, 0.65, 0.0),
  poor: rgb(0.74, 0.16, 0.14),
} as const;

const DIRECTION_COLOR: Record<ChangeDirection, ReturnType<typeof rgb>> = {
  better: COLOR.good,
  worse: COLOR.poor,
  unchanged: COLOR.subdued,
  neutral: COLOR.text,
  unknown: COLOR.subdued,
};

const NO_VALUE = '-';

const formatDate = (timestamp: number): string =>
  `${new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC`;

const formatPeriod = ({ start, end }: ScorecardPeriod): string =>
  `${formatDate(start)} - ${formatDate(end)}`;

const formatDuration = (milliseconds: number): string =>
  milliseconds < 1000 ? `${Math.round(milliseconds)} ms` : `${(milliseconds / 1000).toFixed(2)} s`;

export const formatMeasureValue = (unit: MeasureUnit, value: number | null): string => {
  if (value === null) {
    return NO_VALUE;
  }
  switch (unit) {
    case 'count':
      return Math.round(value).toLocaleString('en-US');
    case 'ms':
      return formatDuration(value);
    case 'score':
      return value.toFixed(3);
    case 'rate':
      return value.toFixed(2);
    case 'ratio':
      return `${(value * 100).toFixed(1)}%`;
  }
};

export const formatChange = ({ change, value, previous }: ScorecardMeasure): string => {
  if (change !== null) {
    const percent = (change * 100).toFixed(1);
    if (Number(percent) === 0) {
      return '0.0%';
    }
    return `${change > 0 ? '+' : ''}${percent}%`;
  }
  if (value === null || previous === null) {
    return NO_VALUE;
  }
  return value === previous
    ? '0.0%'
    : i18n.translate('xpack.digitalExperience.report.scorecard.newValue', {
        defaultMessage: 'new',
      });
};

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

/** Standard PDF fonts only encode Latin-1 text; anything else, e.g. in an application name, is replaced. */
const toEncodable = (font: PDFFont, text: string): string => {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text.replace(/\s+/g, ' '))
    .map((character) => (supported.has(character.codePointAt(0) ?? -1) ? character : '?'))
    .join('');
};

const fit = (font: PDFFont, size: number, text: string, maxWidth: number): string => {
  const safe = toEncodable(font, text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) {
    return safe;
  }
  let shortened = safe;
  while (shortened.length > 1 && font.widthOfTextAtSize(`${shortened}...`, size) > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}...`;
};

class Canvas {
  private page: PDFPage;
  public y: number;

  constructor(private readonly doc: PDFDocument, private readonly fonts: Fonts) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  ensureSpace(height: number): void {
    if (this.y - height >= MARGIN + 20) {
      return;
    }
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  text(
    text: string,
    x: number,
    y: number,
    {
      size = 10,
      bold = false,
      color = COLOR.text,
      align = 'left',
      maxWidth = CONTENT_WIDTH,
    }: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      align?: 'left' | 'right';
      maxWidth?: number;
    } = {}
  ): void {
    const font = bold ? this.fonts.bold : this.fonts.regular;
    const safe = fit(font, size, text, maxWidth);
    const left = align === 'right' ? x - font.widthOfTextAtSize(safe, size) : x;
    this.page.drawText(safe, { x: left, y, size, font, color });
  }

  rect(x: number, y: number, width: number, height: number, color: ReturnType<typeof rgb>): void {
    this.page.drawRectangle({ x, y, width, height, color });
  }
}

const drawHeader = (canvas: Canvas, report: ScorecardReport): void => {
  const height = 96;
  canvas.rect(0, PAGE_HEIGHT - height, PAGE_WIDTH, height, COLOR.header);
  canvas.text(
    i18n.translate('xpack.digitalExperience.report.scorecard.title', {
      defaultMessage: 'Digital Experience scorecard',
    }),
    MARGIN,
    PAGE_HEIGHT - 38,
    { size: 11, color: COLOR.white }
  );
  canvas.text(report.serviceName, MARGIN, PAGE_HEIGHT - 66, {
    size: 22,
    bold: true,
    color: COLOR.white,
  });
  canvas.y = PAGE_HEIGHT - height - 24;

  const environment =
    report.environment ??
    i18n.translate('xpack.digitalExperience.report.scorecard.allEnvironments', {
      defaultMessage: 'All environments',
    });
  canvas.text(environment, MARGIN, canvas.y, { size: 10, bold: true });
  canvas.y -= 16;
  canvas.text(
    i18n.translate('xpack.digitalExperience.report.scorecard.period', {
      defaultMessage: 'Period: {period}',
      values: { period: formatPeriod(report.period) },
    }),
    MARGIN,
    canvas.y,
    { size: 9, color: COLOR.subdued }
  );
  canvas.y -= 13;
  canvas.text(
    i18n.translate('xpack.digitalExperience.report.scorecard.previousPeriod', {
      defaultMessage: 'Compared with: {period}',
      values: { period: formatPeriod(report.previousPeriod) },
    }),
    MARGIN,
    canvas.y,
    { size: 9, color: COLOR.subdued }
  );
  canvas.y -= 30;
};

const drawRatingBar = (canvas: Canvas, measure: ScorecardMeasure, y: number): void => {
  const { ratings } = measure;
  if (!ratings) {
    return;
  }
  const width = 200;
  let x = COLUMN.label;
  const segments = [
    [ratings.good, COLOR.good],
    [ratings.needsImprovement, COLOR.needsImprovement],
    [ratings.poor, COLOR.poor],
  ] as const;
  segments.forEach(([share, color]) => {
    const segmentWidth = share * width;
    if (segmentWidth > 0) {
      canvas.rect(x, y, segmentWidth, 4, color);
      x += segmentWidth;
    }
  });
  canvas.text(
    i18n.translate('xpack.digitalExperience.report.scorecard.ratingShares', {
      defaultMessage: '{good}% good, {needsImprovement}% needs improvement, {poor}% poor',
      values: {
        good: Math.round(ratings.good * 100),
        needsImprovement: Math.round(ratings.needsImprovement * 100),
        poor: Math.round(ratings.poor * 100),
      },
    }),
    COLUMN.label + width + 8,
    y - 1,
    { size: 7, color: COLOR.subdued, maxWidth: 200 }
  );
};

const drawSection = (canvas: Canvas, section: ScorecardSection): void => {
  canvas.ensureSpace(60);
  canvas.text(section.title, MARGIN, canvas.y, { size: 13, bold: true });
  canvas.y -= 18;

  const headings: Array<[string, number, 'left' | 'right']> = [
    [
      i18n.translate('xpack.digitalExperience.report.scorecard.measure', {
        defaultMessage: 'Measure',
      }),
      COLUMN.label,
      'left',
    ],
    [
      i18n.translate('xpack.digitalExperience.report.scorecard.thisPeriod', {
        defaultMessage: 'This period',
      }),
      COLUMN.value,
      'right',
    ],
    [
      i18n.translate('xpack.digitalExperience.report.scorecard.previous', {
        defaultMessage: 'Previous',
      }),
      COLUMN.previous,
      'right',
    ],
    [
      i18n.translate('xpack.digitalExperience.report.scorecard.change', {
        defaultMessage: 'Change',
      }),
      COLUMN.change,
      'right',
    ],
  ];
  headings.forEach(([heading, x, align]) =>
    canvas.text(heading, x, canvas.y, { size: 8, bold: true, color: COLOR.subdued, align })
  );
  canvas.y -= 6;
  canvas.rect(MARGIN, canvas.y, CONTENT_WIDTH, 0.75, COLOR.rule);

  section.measures.forEach((measure, index) => {
    const rowHeight = measure.ratings ? 34 : 24;
    canvas.ensureSpace(rowHeight);
    const top = canvas.y;
    const bottom = top - rowHeight;
    if (index % 2 === 0) {
      canvas.rect(MARGIN, bottom, CONTENT_WIDTH, rowHeight, COLOR.stripe);
    }
    const baseline = measure.ratings ? top - 15 : top - rowHeight / 2 - 3;
    canvas.text(measure.label, COLUMN.label, baseline, { size: 10, maxWidth: 270 });
    canvas.text(formatMeasureValue(measure.unit, measure.value), COLUMN.value, baseline, {
      size: 10,
      bold: true,
      align: 'right',
      color: measure.rating ? COLOR[measure.rating] : COLOR.text,
    });
    canvas.text(formatMeasureValue(measure.unit, measure.previous), COLUMN.previous, baseline, {
      size: 10,
      color: COLOR.subdued,
      align: 'right',
    });
    canvas.text(formatChange(measure), COLUMN.change, baseline, {
      size: 10,
      align: 'right',
      color: DIRECTION_COLOR[measure.direction],
    });
    drawRatingBar(canvas, measure, bottom + 8);
    canvas.y = bottom;
  });
  canvas.y -= 24;
};

/** Renders the scorecard as a PDF: a header with the period, then a table per section. */
export const renderScorecardPdf = async (report: ScorecardReport): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  doc.setTitle(`${report.serviceName} scorecard`);
  doc.setCreationDate(new Date(report.generatedAt));
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const canvas = new Canvas(doc, fonts);
  drawHeader(canvas, report);
  report.sections.forEach((section) => drawSection(canvas, section));

  canvas.text(
    i18n.translate('xpack.digitalExperience.report.scorecard.generated', {
      defaultMessage: 'Generated {date}',
      values: { date: formatDate(report.generatedAt) },
    }),
    MARGIN,
    MARGIN - 10,
    { size: 8, color: COLOR.subdued }
  );

  return doc.save();
};
