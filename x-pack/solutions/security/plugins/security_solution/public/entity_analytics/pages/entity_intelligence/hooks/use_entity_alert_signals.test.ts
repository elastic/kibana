/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntityAlertSignals } from './use_entity_alert_signals';

const bucket = (key: string, count: number) => ({
  key,
  doc_count: count,
  w7: { doc_count: count },
});

describe('buildEntityAlertSignals', () => {
  it('keeps user, host, and application-service alerts separate', () => {
    const signals = buildEntityAlertSignals({
      by_user: { buckets: [bucket('deploy', 1)] },
      by_host: { buckets: [bucket('deploy', 3)] },
      by_service: { buckets: [bucket('deploy', 2)] },
    });
    expect(signals.get('user:deploy')?.total).toBe(1);
    expect(signals.get('host:deploy')?.total).toBe(3);
    expect(signals.get('service:deploy')?.total).toBe(2);
  });

  it('preserves rules and window counts within a typed identifier', () => {
    const signals = buildEntityAlertSignals({
      by_user: {
        buckets: [{ ...bucket('ROOT', 2), rules: { buckets: [{ key: 'Rule A', doc_count: 2 }] } }],
      },
    });
    expect(signals.get('user:root')?.ruleNames).toEqual(['Rule A']);
    expect(signals.get('user:root')?.windowCounts.w7).toBe(2);
  });
});
