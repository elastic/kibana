/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PDFDocument } from 'pdf-lib';
import type { RumScorecardReport } from './rum_report';
import {
  buildReportPdfBuffer,
  parsePdfInline,
  textToPdfBuffer,
  toPdfSafeText,
} from './rum_report_pdf';

const scorecard: RumScorecardReport = {
  templateId: 'scorecard',
  title: 'Weekly UX scorecard',
  serviceName: 'shop',
  rangeFrom: '2026-08-03T00:00:00.000Z',
  rangeTo: '2026-08-10T00:00:00.000Z',
  compareFrom: '2026-07-27T00:00:00.000Z',
  compareTo: '2026-08-03T00:00:00.000Z',
  generatedAt: '2026-08-14T00:00:00.000Z',
  noPreviousPeriod: false,
  kpis: {
    sessions: { current: 10, previous: 8, abs: 2, pct: 0.25 },
    pageViews: { current: 20, previous: 20, abs: 0, pct: 0 },
    errorRate: { current: 0.1, previous: 0.2, abs: -0.1, pct: -0.5 },
    bounceRate: { current: 0.4, previous: 0.5, abs: -0.1, pct: -0.2 },
    p75LoadMs: { current: 1200, previous: 1000, abs: 200, pct: 0.2 },
    p75Inp: { current: 180, previous: 200, abs: -20, pct: -0.1 },
  },
  vitals: {
    lcp: { p75: 5000, ranks: { good: 10, ni: 20, poor: 70 }, samples: 10 },
    inp: { p75: null, ranks: null, samples: 0 },
    cls: { p75: null, ranks: null, samples: 0 },
    fcp: { p75: null, ranks: null, samples: 0 },
  },
  vitalsPrevious: null,
  trends: [],
  frustration: {
    rageSessions: 1,
    errorSessions: 2,
    deadClickSessions: 0,
    rageClicks: 1,
    deadClicks: 0,
    errorClicks: 0,
  },
  frustrationPrevious: null,
  topPages: [],
  errorGroups: [],
  sampleSessions: [],
  browsers: [],
  os: [],
  countries: [],
};

describe('toPdfSafeText', () => {
  it('maps bullets and arrows to ASCII', () => {
    expect(toPdfSafeText('Period: a → b\n• Sessions: 10')).toBe('Period: a -> b\n- Sessions: 10');
  });
});

describe('parsePdfInline', () => {
  it('turns markdown bold into a bold run and drops the markers', () => {
    expect(parsePdfInline('**Error rate is severe at 60%**: 6 of 10 sessions')).toEqual([
      { text: 'Error rate is severe at 60%', bold: true },
      { text: ': 6 of 10 sessions', bold: false },
    ]);
  });

  it('keeps plain text as a single regular run', () => {
    expect(parsePdfInline('No frustration signals')).toEqual([
      { text: 'No frustration signals', bold: false },
    ]);
  });
});

describe('textToPdfBuffer', () => {
  it('builds a PDF without replacing ASCII content with question marks', () => {
    const pdf = textToPdfBuffer('# Weekly UX scorecard\n- Sessions: 10').toString('latin1');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('Weekly UX scorecard');
    expect(pdf).toContain('Sessions: 10');
    expect(pdf).toContain('Helvetica-Bold');
  });
});

describe('buildReportPdfBuffer', () => {
  it('typesets a scorecard with an AI summary as a valid PDF', async () => {
    const pdf = await buildReportPdfBuffer(
      scorecard,
      'https://kbn/app/ux/reports/scorecard',
      '## Findings\n\n- Error rate is high\n\n**Next:** open Sessions'
    );
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
    const loaded = await PDFDocument.load(Uint8Array.from(pdf));
    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('paginates a long AI narrative instead of clipping it', async () => {
    const narrative = Array.from({ length: 80 }, (_, index) => `- Finding line ${index + 1}`).join(
      '\n'
    );
    const pdf = await buildReportPdfBuffer(
      scorecard,
      'https://kbn/app/ux/reports/scorecard',
      narrative
    );
    const loaded = await PDFDocument.load(Uint8Array.from(pdf));
    expect(loaded.getPageCount()).toBeGreaterThan(1);
  });
});
