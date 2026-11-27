/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolutionRuleHealth } from './hooks/use_resolution_rules_health';
import { buildRuleFailureReport } from './rule_failure_report';

const rule: ResolutionRuleHealth = {
  rule_id: 'entra_guid_bridge',
  kind: 'managed',
  description: 'd',
  enabled: true,
  status: 'failing',
  last_processed_timestamp: null,
  failure: {
    last_error: 'watermark: ES|QL returned partial results; watermark will not advance',
    consecutive_failures: 3,
    last_failed_at: '2026-11-17T10:56:08.624Z',
    next_attempt_at: '2026-11-17T11:16:08.624Z',
  },
};

describe('buildRuleFailureReport', () => {
  it('lists the rule, the saved error and the failure timing', () => {
    expect(buildRuleFailureReport(rule)).toBe(
      [
        'Rule: entra_guid_bridge',
        'Error: watermark: ES|QL returned partial results; watermark will not advance',
        'Failures in a row: 3',
        'Last failed at: 2026-11-17T10:56:08.624Z',
        'Next attempt at: 2026-11-17T11:16:08.624Z',
      ].join('\n')
    );
  });

  it('says unknown when nothing was saved', () => {
    expect(buildRuleFailureReport({ ...rule, failure: undefined })).toContain('Error: unknown');
  });
});
