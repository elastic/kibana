/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScorecardMeasure, ScorecardReport } from '../../../common/types/scorecard';
import { buildScorecardSummary } from './scorecard_summary';

const measure = (overrides: Partial<ScorecardMeasure>): ScorecardMeasure => ({
  id: 'm',
  label: 'Measure',
  unit: 'count',
  value: 0,
  previous: 0,
  change: null,
  direction: 'unknown',
  rating: null,
  ratings: null,
  ...overrides,
});

const report = (overrides: Partial<ScorecardReport> = {}): ScorecardReport => ({
  serviceName: 'shop',
  environments: [],
  period: { start: Date.UTC(2026, 10, 13), end: Date.UTC(2026, 10, 20) },
  previousPeriod: { start: Date.UTC(2026, 10, 6), end: Date.UTC(2026, 10, 13) },
  generatedAt: 0,
  sections: [
    {
      id: 'traffic',
      title: 'Traffic and errors',
      measures: [
        measure({
          label: 'Page loads',
          value: 12345,
          change: 0.2,
          direction: 'neutral',
        }),
        measure({
          label: 'Page load time (p75)',
          unit: 'ms',
          value: 1500,
          change: -0.25,
          direction: 'better',
        }),
        measure({
          label: 'Failed HTTP requests',
          unit: 'ratio',
          value: 0.0123,
          change: 0.5,
          direction: 'worse',
        }),
        measure({ label: 'Interaction to Next Paint (p75)', unit: 'ms', value: null }),
      ],
    },
  ],
  ...overrides,
});

describe('buildScorecardSummary', () => {
  it('names the application and both periods', () => {
    const summary = buildScorecardSummary(report());

    expect(summary).toContain('**Digital Experience scorecard: shop**');
    expect(summary).toContain('2026-11-13 – 2026-11-20, compared with 2026-11-06 – 2026-11-13');
  });

  it('names the environment when there is one', () => {
    expect(buildScorecardSummary(report({ environment: 'production' }))).toContain(
      'Digital Experience scorecard: shop (production)'
    );
  });

  it('lists each measure with its value and its change', () => {
    const summary = buildScorecardSummary(report());

    expect(summary).toContain('**Traffic and errors**');
    expect(summary).toContain('- Page loads: 12,345 (+20.0%)');
    expect(summary).toContain('- Page load time (p75): 1.50 s (−25.0%, better)');
    expect(summary).toContain('- Failed HTTP requests: 1.23% (+50.0%, worse)');
  });

  it('shows a dash for a measure without data', () => {
    expect(buildScorecardSummary(report())).toContain('- Interaction to Next Paint (p75): –');
  });

  it('keeps the direction of a change that has no percentage', () => {
    const summary = buildScorecardSummary(
      report({
        sections: [
          {
            id: 'traffic',
            title: 'Traffic and errors',
            measures: [
              measure({ label: 'JavaScript errors', value: 40, previous: 0, direction: 'worse' }),
            ],
          },
        ],
      })
    );

    expect(summary).toContain('- JavaScript errors: 40 (worse)');
  });
});
