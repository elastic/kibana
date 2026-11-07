/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsExecutorClient } from '@kbn/evals';
import {
  ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
  ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { reportBenignVerdict, reportContainmentProposed } from './report_verdict_checks';
import { benignVerdictEvaluator, containmentProposedEvaluator } from './verdict_checks';

const ENDPOINT = 'agent-az-eval-01';

const output = (overrides: Record<string, unknown> = {}) => ({
  verdict: 'confirmed_incident',
  propose: true,
  rationale: 'Encoded PowerShell follows a document process.',
  timeline: {
    window: { start: '2026-01-01T00:00:00Z', end: '2026-01-01T01:00:00Z' },
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
      actionWorkflowId: ALERTZERO_ACTION_ISOLATE_HOST_WORKFLOW_ID,
      title: 'Isolate host',
      comment: 'Isolate the host.',
      actionInput: { endpoint_ids: [ENDPOINT] },
      confidence: 'high',
    },
    {
      actionWorkflowId: ALERTZERO_ACTION_KILL_PROCESS_WORKFLOW_ID,
      title: 'Kill process',
      comment: 'Kill the process.',
      actionInput: { endpoint_ids: [ENDPOINT] },
      confidence: 'high',
    },
  ],
  ...overrides,
});

describe('report verdict checks', () => {
  const setup = () => {
    const runExperiment = jest.fn().mockResolvedValue([]);
    const log = { info: jest.fn() };
    return {
      runExperiment,
      log,
      executorClient: { runExperiment } as unknown as EvalsExecutorClient,
    };
  };

  describe('reportContainmentProposed', () => {
    const context = { endpointIds: [ENDPOINT] };

    it('scores through the executor and logs the pass line with action types', async () => {
      const { runExperiment, log, executorClient } = setup();
      const failures = await reportContainmentProposed({
        executorClient,
        log,
        caseName: 'case',
        structuredOutput: output(),
        context,
      });
      expect(failures).toEqual([]);
      expect(runExperiment).toHaveBeenCalledTimes(1);
      expect(runExperiment.mock.calls[0][1].map(({ name }: { name: string }) => name)).toEqual([
        containmentProposedEvaluator.name,
      ]);
      expect(log.info).toHaveBeenCalledWith(
        'ContainmentProposed: pass verdict=confirmed_incident propose=true actions=isolate-host,kill-process'
      );
    });

    it('still reports the score before the caller asserts, and logs "none" without actions', async () => {
      const { runExperiment, log, executorClient } = setup();
      const failures = await reportContainmentProposed({
        executorClient,
        log,
        caseName: 'case',
        structuredOutput: output({ propose: false, recommendedActions: [] }),
        context,
      });
      expect(failures.length).toBeGreaterThan(0);
      expect(runExperiment).toHaveBeenCalledTimes(1);
      expect(log.info).toHaveBeenCalledWith(
        'ContainmentProposed: fail verdict=confirmed_incident propose=false actions=none'
      );
    });

    it('scores only the first executor repetition', async () => {
      const { runExperiment, log, executorClient } = setup();
      await reportContainmentProposed({
        executorClient,
        log,
        caseName: 'case',
        structuredOutput: output({ recommendedActions: [] }),
        context,
      });
      const [options, [evaluator]] = runExperiment.mock.calls[0];
      const example = options.datasets[0].examples[0];
      const outputs = [await options.task(example), await options.task(example)];
      const scores = await Promise.all(
        outputs.map((taskOutput) =>
          evaluator.evaluate({ input: example.input, output: taskOutput, expected: example.output })
        )
      );
      expect(scores[0]).toMatchObject({ score: 0 });
      expect(scores[1]).toMatchObject({ score: null });
    });

    it.each([
      ['missing', undefined],
      ['malformed', { verdict: 'confirmed_incident' }],
    ])('skips scoring a %s structured output instead of throwing', async (_label, value) => {
      const { runExperiment, log, executorClient } = setup();
      const failures = await reportContainmentProposed({
        executorClient,
        log,
        caseName: 'case',
        structuredOutput: value,
        context,
      });
      expect(failures).toEqual([]);
      expect(runExperiment).not.toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith(
        'ContainmentProposed: not scored, case has no valid structured output'
      );
    });
  });

  describe('reportBenignVerdict', () => {
    it('scores a benign verdict and logs the pass line', async () => {
      const { runExperiment, log, executorClient } = setup();
      const failures = await reportBenignVerdict({
        executorClient,
        log,
        caseName: 'case',
        structuredOutput: output({
          verdict: 'not_an_incident',
          propose: false,
          recommendedActions: [],
        }),
      });
      expect(failures).toEqual([]);
      expect(runExperiment.mock.calls[0][1].map(({ name }: { name: string }) => name)).toEqual([
        benignVerdictEvaluator.name,
      ]);
      expect(log.info).toHaveBeenCalledWith('BenignVerdict: pass verdict=not_an_incident');
    });

    it('reports the score and logs fail for confirmed_incident with no action', async () => {
      const { runExperiment, log, executorClient } = setup();
      const failures = await reportBenignVerdict({
        executorClient,
        log,
        caseName: 'case',
        structuredOutput: output({ propose: false, recommendedActions: [] }),
      });
      expect(failures).toHaveLength(1);
      expect(runExperiment).toHaveBeenCalledTimes(1);
      expect(log.info).toHaveBeenCalledWith('BenignVerdict: fail verdict=confirmed_incident');
    });

    it('skips scoring a missing structured output', async () => {
      const { runExperiment, log, executorClient } = setup();
      await reportBenignVerdict({
        executorClient,
        log,
        caseName: 'case',
        structuredOutput: undefined,
      });
      expect(runExperiment).not.toHaveBeenCalled();
      expect(log.info).toHaveBeenCalledWith(
        'BenignVerdict: not scored, case has no valid structured output'
      );
    });
  });
});
