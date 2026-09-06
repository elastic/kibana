/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { outcomesFromExecutions, replay } from './replay_outcomes';

describe('outcomesFromExecutions', () => {
  it('reads the verdict off context.output where the engine materializes it', () => {
    const { outcomes } = outcomesFromExecutions([
      {
        goldenId: 'dw-001-ransomware-kill-chain',
        context: { output: { isIncident: true, gate: 'assessed' } },
      },
    ]);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].actualIncident).toBe(true);
    expect(outcomes[0].gate).toBe('assessed');
  });

  it('counts executions it cannot map instead of dropping them silently', () => {
    const { outcomes, unmatched } = outcomesFromExecutions([{ goldenId: 'not-a-row' }]);
    expect(outcomes).toHaveLength(0);
    expect(unmatched).toBe(1);
  });
});

describe('replay', () => {
  it('reproduces the live discrimination verdict from archived outputs', () => {
    const { report } = replay([
      {
        goldenId: 'dw-001-ransomware-kill-chain',
        context: { output: { isIncident: true, gate: 'assessed' } },
      },
      {
        goldenId: 'dw-002-benign-patch-window',
        context: { output: { isIncident: false, gate: 'assessed' } },
      },
      {
        goldenId: 'dw-003-benign-narrative-hostile-telemetry',
        context: { output: { isIncident: true, gate: 'assessed' } },
      },
    ]);
    expect(report.truePositives).toBe(2);
    expect(report.trueNegatives).toBe(1);
    expect(report.discriminates).toBe(true);
  });

  it('does not report green when a row failed to produce a verdict', () => {
    const { report } = replay([
      {
        goldenId: 'dw-001-ransomware-kill-chain',
        context: { output: { isIncident: true, gate: 'assessed' } },
      },
      {
        goldenId: 'dw-002-benign-patch-window',
        context: { output: { isIncident: false, gate: 'agent_no_structured_output' } },
      },
    ]);
    expect(report.harnessErrors).toBe(1);
    expect(report.discriminates).toBe(false);
  });
});
