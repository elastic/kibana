/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_THREAT_SUMMARY_CHARS, buildThreatSummary } from './build_threat_summary';
import { dedupeCoverageGaps } from './dedupe_coverage_gaps';

const report = { title: 'Sign-in watch bulletin', techniques: ['T1110.003'] };

const gapsOf = (count: number) =>
  dedupeCoverageGaps(
    Array.from({ length: count }, (_, index) => ({
      reason: 'unknown_technique_id',
      detail: `T${9000 + index}`,
      technique_id: `T${9000 + index}`,
    }))
  );

describe('buildThreatSummary unsearched line', () => {
  it('adds one line after the report extract', () => {
    const summary = buildThreatSummary({
      hasConfirmedHit: false,
      report,
      unsearched: gapsOf(1),
    });
    expect(summary.split('\n').at(-1)).toBe(
      'Not searched by Hunt Watch (1 gap): T9000 (unknown technique id)'
    );
    expect(summary).toContain('Sign-in watch bulletin');
  });

  it('is unchanged without gaps', () => {
    const withoutGaps = buildThreatSummary({ hasConfirmedHit: false, report });
    expect(buildThreatSummary({ hasConfirmedHit: false, report, unsearched: gapsOf(0) })).toBe(
      withoutGaps
    );
  });

  it('keeps the count and stays inside the cap with 100 gaps', () => {
    const summary = buildThreatSummary({
      hasConfirmedHit: false,
      report: { ...report, bodyText: 'lead-in '.repeat(400) },
      unsearched: gapsOf(100),
    });
    expect(summary.length).toBeLessThanOrEqual(MAX_THREAT_SUMMARY_CHARS);
    expect(summary).toContain('Not searched by Hunt Watch (at least 100 gaps): T9000');
    expect(summary).toContain('Sign-in watch bulletin');
    expect(summary).not.toMatch(/\(unknown$/);
  });
});
