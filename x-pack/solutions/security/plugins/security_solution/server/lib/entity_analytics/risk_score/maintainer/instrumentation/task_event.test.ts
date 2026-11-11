/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRiskScoreTaskEvent } from './task_event';

it.each(['running', 'success', 'aborted'] as const)(
  'retains calculation identity and bounds the %s snapshot',
  (status) => {
    const stages = Array.from({ length: 100 }, (_, index) => ({
      entityType: 'host',
      stage: `stage_${index}`,
      status: 'success' as const,
      durationMs: 10,
    }));
    const event = buildRiskScoreTaskEvent('calculation-1', status, 100, stages);
    expect(Buffer.byteLength(JSON.stringify(event))).toBeLessThanOrEqual(3500);
    expect(event.calculationRunId).toBe('calculation-1');
    expect(event.status).toBe(status);
    expect(event.stages.length + event.omittedStages).toBe(100);
    expect(stages).toHaveLength(100);
  }
);
