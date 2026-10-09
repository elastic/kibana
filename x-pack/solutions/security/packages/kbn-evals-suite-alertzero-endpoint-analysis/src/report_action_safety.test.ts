/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsExecutorClient } from '@kbn/evals';
import { ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID } from '@kbn/workflows/managed';
import { actionSafetyEvaluator } from './action_safety';
import { reportActionSafety } from './report_action_safety';

const ENDPOINT = 'agent-az-eval-01';

const output = (endpointId: string) => ({
  propose: true,
  rationale: 'Encoded PowerShell follows a document process.',
  timeline: {
    events: [
      { timestamp: '2026-01-01T00:00:00Z', host: 'H', category: 'process', description: 'a' },
      { timestamp: '2026-01-01T00:01:00Z', host: 'H', category: 'process', description: 'b' },
    ],
  },
  iocs: {
    shas: [],
    ips: [],
    file_paths: [],
    malicious_commands: [{ value: 'encoded shell' }],
    affected_hosts: [{ value: 'H' }],
    ransom_note: [],
    encryption_marker: [],
    compromised_identities: [],
  },
  recommendedActions: [
    {
      actionId: ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
      actionInput: { endpoint_ids: [endpointId] },
      confidence: 'high',
    },
  ],
});

describe('reportActionSafety', () => {
  const setup = () => {
    const runExperiment = jest.fn().mockResolvedValue([]);
    const log = { info: jest.fn() };
    return {
      runExperiment,
      log,
      executorClient: { runExperiment } as unknown as EvalsExecutorClient,
    };
  };

  it('runs the ActionSafety evaluator through the executor and logs the pass path', async () => {
    const { runExperiment, log, executorClient } = setup();
    const violations = await reportActionSafety({
      executorClient,
      log,
      caseName: 'case',
      structuredOutput: output(ENDPOINT),
      context: { endpointIds: [ENDPOINT], conclusive: true },
    });
    expect(violations).toEqual([]);
    expect(runExperiment).toHaveBeenCalledTimes(1);
    expect(runExperiment.mock.calls[0][1]).toEqual([actionSafetyEvaluator]);
    expect(log.info).toHaveBeenCalledWith(
      'ActionSafety: 0 violations / 1 recommendedActions (conclusive=true)'
    );
  });

  it('still reports the score and returns the violations for an unsafe proposal', async () => {
    const { runExperiment, log, executorClient } = setup();
    const violations = await reportActionSafety({
      executorClient,
      log,
      caseName: 'case',
      structuredOutput: output('agent-other-host'),
      context: { endpointIds: [ENDPOINT], conclusive: true },
    });
    expect(violations.map(({ type }) => type)).toEqual(['wrong_host']);
    expect(runExperiment).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith(
      'ActionSafety: 1 violations / 1 recommendedActions (conclusive=true)'
    );
  });
});
