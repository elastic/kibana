/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PDFDocument } from 'pdf-lib';
import { NO_WEB_VITALS } from '../../../common/core_web_vitals';
import type { ApplicationOverview } from '../../../common/types/overview';
import type { ScorecardMeasure } from './scorecard';
import { buildScorecard } from './scorecard';
import { formatChange, formatMeasureValue, renderScorecardPdf } from './scorecard_pdf';

const overview = (serviceName: string): ApplicationOverview => ({
  serviceName,
  percentile: 75,
  pageLoads: { count: 12345 },
  loadTime: { percentileMs: 2450, sampleCount: 12000 },
  jsErrors: { count: 12 },
  httpRequests: { count: 5000, failedCount: 50, failedRatio: 0.01 },
  webVitals: {
    ...NO_WEB_VITALS,
    lcp: {
      p75Ms: 2600,
      sampleCount: 900,
      ratings: { good: 0.6, needsImprovement: 0.3, poor: 0.1 },
    },
  },
  trend: [],
});

const report = (serviceName: string) =>
  buildScorecard({
    current: overview(serviceName),
    previous: overview(serviceName),
    environment: 'production',
    period: { start: Date.UTC(2026, 10, 9), end: Date.UTC(2026, 10, 16) },
    previousPeriod: { start: Date.UTC(2026, 10, 2), end: Date.UTC(2026, 10, 9) },
    generatedAt: Date.UTC(2026, 10, 16, 8),
  });

describe('renderScorecardPdf', () => {
  it('renders a PDF that can be read back', async () => {
    const bytes = await renderScorecardPdf(report('shop'));

    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
    expect(document.getTitle()).toBe('shop scorecard');
  });

  it('renders application names that the standard fonts cannot encode', async () => {
    const bytes = await renderScorecardPdf(report('商店 shop \u{1F6D2}\nsecond line'));

    await expect(PDFDocument.load(bytes)).resolves.toBeDefined();
  });

  it('renders a very long application name', async () => {
    const bytes = await renderScorecardPdf(report('shop-'.repeat(200)));

    await expect(PDFDocument.load(bytes)).resolves.toBeDefined();
  });
});

describe('formatMeasureValue', () => {
  it.each([
    ['count', 12345, '12,345'],
    ['ms', 450, '450 ms'],
    ['ms', 2450, '2.45 s'],
    ['score', 0.1234, '0.123'],
    ['rate', 2.5, '2.50'],
    ['ratio', 0.0123, '1.2%'],
    ['count', null, '-'],
  ] as const)('formats %s %s as %s', (unit, value, expected) => {
    expect(formatMeasureValue(unit, value)).toBe(expected);
  });
});

describe('formatChange', () => {
  const measure = (overrides: Partial<ScorecardMeasure>): ScorecardMeasure => ({
    id: 'm',
    label: 'M',
    unit: 'count',
    value: 1,
    previous: 1,
    change: null,
    direction: 'unknown',
    rating: null,
    ratings: null,
    ...overrides,
  });

  it('signs a relative change', () => {
    expect(formatChange(measure({ change: 0.123 }))).toBe('+12.3%');
    expect(formatChange(measure({ change: -0.05 }))).toBe('-5.0%');
    expect(formatChange(measure({ change: -0.0004 }))).toBe('0.0%');
  });

  it('shows no change, a value from zero and a missing value', () => {
    expect(formatChange(measure({ value: 0, previous: 0 }))).toBe('0.0%');
    expect(formatChange(measure({ value: 4, previous: 0 }))).toBe('new');
    expect(formatChange(measure({ value: null }))).toBe('-');
  });
});
