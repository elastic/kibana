/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SCENARIOS } from '../dataset';
import type { CorroborationReport } from '../types';

describe('raw_log_corroboration schema conformance (L1)', () => {
  it('all scenarios have required fields', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.id).toBeDefined();
      expect(scenario.narrative).toBeDefined();
      expect(scenario.alertIds).toBeInstanceOf(Array);
      expect(scenario.scope.hosts).toBeInstanceOf(Array);
      expect(scenario.expected.corroboratedCount).toBeGreaterThanOrEqual(0);
      expect(scenario.expected.gapCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('corroboration report shape is valid', () => {
    const mockReport: CorroborationReport = {
      corroboratedEvents: [
        { stage: 'initial-access', evidence: 'PowerShell execution found', confidence: 0.9 },
      ],
      gapEvents: [{ stage: 'lateral-movement', expected: 'WMI connection logs' }],
      confidence: 0.5,
      unresolvedQuestions: ['Was WMI used for lateral movement?'],
    };
    expect(mockReport.corroboratedEvents).toBeInstanceOf(Array);
    expect(mockReport.gapEvents).toBeInstanceOf(Array);
    expect(mockReport.confidence).toBeGreaterThanOrEqual(0);
    expect(mockReport.confidence).toBeLessThanOrEqual(1);
    expect(mockReport.unresolvedQuestions).toBeInstanceOf(Array);
  });

  it('full corroboration scenario expects 0 gaps', () => {
    const scenario = SCENARIOS.find((s) => s.id === 'full-corroboration');
    expect(scenario).toBeDefined();
    expect(scenario?.expected.gapCount).toBe(0);
  });

  it('partial gap scenario expects exactly 1 gap', () => {
    const scenario = SCENARIOS.find((s) => s.id === 'partial-gap');
    expect(scenario).toBeDefined();
    expect(scenario?.expected.gapCount).toBe(1);
  });

  it('no raw telemetry scenario expects 0 corroborated events', () => {
    const scenario = SCENARIOS.find((s) => s.id === 'no-raw-telemetry');
    expect(scenario).toBeDefined();
    expect(scenario?.expected.corroboratedCount).toBe(0);
  });
});
