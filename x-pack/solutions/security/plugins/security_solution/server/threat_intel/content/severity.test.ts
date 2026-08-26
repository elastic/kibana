/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEVERITY_LEVELS } from '../../../common/threat_intel';
import { DEFAULT_SEVERITY_LEVEL, DEFAULT_SEVERITY_SCORE, severityScore } from './severity';

describe('severityScore', () => {
  it.each([
    ['critical', 90],
    ['high', 70],
    ['medium', 40],
    ['low', 20],
  ] as const)('maps %s to %i', (level, expected) => {
    expect(severityScore(level)).toBe(expected);
  });

  // The promote task takes the max severity across citing reports, so the mapping
  // has to stay strictly ordered or a more severe report could fail to raise it.
  it('is strictly increasing across the severity vocabulary', () => {
    const scores = SEVERITY_LEVELS.map(severityScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });

  it('covers every level in the shared vocabulary', () => {
    for (const level of SEVERITY_LEVELS) {
      expect(Number.isFinite(severityScore(level))).toBe(true);
    }
  });
});

describe('ingest defaults', () => {
  // Applied by adapters until classify_severity runs, so they have to be consistent
  // with each other or a report's level and score disagree until enrichment.
  it('the default score matches the default level', () => {
    expect(DEFAULT_SEVERITY_SCORE).toBe(severityScore(DEFAULT_SEVERITY_LEVEL));
  });

  it('defaults to a mid severity rather than an extreme', () => {
    expect(DEFAULT_SEVERITY_LEVEL).toBe('medium');
  });
});
