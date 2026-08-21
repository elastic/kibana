/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  detectionChangeSignalSchema,
  ruleTuningTriggerSchema,
  detectionGapSchema,
} from './detection_change';
import { sourceWatchSchema } from './proposal';
import { RecommendedAction, WatchTier } from '@kbn/pnd-common';

describe('detection_change schemas', () => {
  it('accepts a valid Detection Change Signal', () => {
    const r = detectionChangeSignalSchema.safeParse({
      sourceWatch: 'watch-dark',
      runId: 'run-1',
      investigationId: 'inv-1',
      gaps: [{ technique: 'T1003.001', evidence: 'LSASS access, no rule', confidence: 0.9 }],
    });
    expect(r.success).toBe(true);
  });

  it('accepts watch-ad as a signal source (D11 AD continuation worker)', () => {
    const r = detectionChangeSignalSchema.safeParse({
      sourceWatch: 'watch-ad',
      runId: 'run-1',
      investigationId: 'inv-1',
      gaps: [{ technique: 'T1059.001', evidence: 'encoded PowerShell, no rule', confidence: 0.8 }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects an empty gaps array (a signal must carry >= 1 gap)', () => {
    const r = detectionChangeSignalSchema.safeParse({
      sourceWatch: 'watch-deep',
      runId: 'run-1',
      investigationId: 'inv-1',
      gaps: [],
    });
    expect(r.success).toBe(false);
  });

  it('requires technique/evidence/confidence on each gap', () => {
    const r = detectionGapSchema.safeParse({ technique: 'T1059' });
    expect(r.success).toBe(false);
  });

  it('accepts a false_positive rule-tuning trigger and rejects other reasons', () => {
    expect(
      ruleTuningTriggerSchema.safeParse({
        reason: 'false_positive',
        alertId: 'a-1',
        confidence: 0.8,
        investigationId: 'inv-1',
      }).success
    ).toBe(true);
    expect(
      ruleTuningTriggerSchema.safeParse({
        reason: 'true_positive',
        alertId: 'a-1',
        confidence: 0.8,
        investigationId: 'inv-1',
      }).success
    ).toBe(false);
  });
});

describe('Detection Watch tier contract (lockdown)', () => {
  it('sourceWatchSchema includes the Detection Watch + AD sources', () => {
    // Lock the producer/consumer sources so a future edit cannot silently drop them.
    expect(sourceWatchSchema.safeParse('watch-detection').success).toBe(true);
    expect(sourceWatchSchema.safeParse('watch-ad').success).toBe(true);
    // And the original four remain.
    for (const w of ['watch-floor', 'watch-officer', 'watch-dark', 'watch-deep']) {
      expect(sourceWatchSchema.safeParse(w).success).toBe(true);
    }
    expect(sourceWatchSchema.safeParse('watch-nonexistent').success).toBe(false);
  });

  it('RecommendedAction includes create (rule creation) and tune (rule tuning)', () => {
    expect(RecommendedAction.safeParse('create').success).toBe(true);
    expect(RecommendedAction.safeParse('tune').success).toBe(true);
  });

  it('WatchTier includes the 5th Detection tier', () => {
    expect(WatchTier.safeParse('detection').success).toBe(true);
  });
});
