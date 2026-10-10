/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { WORKER_IDS } from './constants';
import { runSeededRuleTuningScenario } from './rule_tuning_fixture';
import { withRuleTuningIdentity } from './rule_tuning_identity';

const mockCases = new Map<string, (fixtures: unknown) => Promise<void>>();
jest.mock('@kbn/evals-suite-attack-discovery-fp-tp/src/evaluate', () => {
  const evaluate = Object.assign(
    (name: string, callback: (fixtures: unknown) => Promise<void>) => mockCases.set(name, callback),
    {
      describe: (_name: string, _options: unknown, callback: () => void) => callback(),
      beforeAll: jest.fn(),
      afterAll: jest.fn(),
      skip: jest.fn(),
    }
  );
  return {
    evaluate,
    selectEvaluators: (evaluators: unknown) => evaluators,
    tags: { stateful: { classic: 'classic' } },
  };
});
jest.mock('./rule_tuning_fixture', () => ({ runSeededRuleTuningScenario: jest.fn() }));
jest.mock('./rule_tuning_identity', () => ({
  withRuleTuningIdentity: jest.fn(async ({ run }) =>
    run({ fetch: 'worker-fetch', spaceId: 'default' }, 'namespace/worker')
  ),
}));
jest.mock('./harness_setup', () => ({
  createHarnessState: () => ({
    workerServiceAccounts: { [WORKER_IDS.ruleTuning]: 'namespace/worker' },
  }),
  setupWorkerChainHarness: jest.fn(),
  teardownWorkerChainHarness: jest.fn(),
}));

it('the registered live spec executes both seeded families with a distinct worker and operator approval', async () => {
  await import('../evals/worker_chain.spec');
  const record = { runId: 'run', actions: [], tpRuleIds: ['seeded-rule'] };
  jest.mocked(runSeededRuleTuningScenario).mockResolvedValue(record as never);
  const fetch = jest.fn() as unknown as HttpHandler;
  const esClient = {};
  const results: unknown[] = [];
  const runExperiment = jest.fn(
    async (
      {
        datasets,
        task,
      }: {
        datasets: Array<{ examples: Array<{ input: { family: string } }> }>;
        task: (example: { input: { family: string } }) => Promise<unknown>;
        concurrency: number;
      },
      _evaluators: unknown[]
    ) => {
      for (const dataset of datasets) {
        for (const example of dataset.examples) results.push(await task(example));
      }
    }
  );
  const callback = mockCases.get('runs seeded Rule Tuning with operator-approved actions');
  expect(callback).toBeDefined();
  await callback!({ executorClient: { runExperiment }, fetch, esClient, log: { info: jest.fn() } });
  expect(results).toEqual([{ record }, { record }]);
  expect(runSeededRuleTuningScenario).toHaveBeenCalledTimes(2);
  for (const family of ['encoded-powershell', 'mimicrat-clickfix']) {
    expect(runSeededRuleTuningScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        family,
        worker: { fetch: 'worker-fetch', spaceId: 'default' },
        operator: { fetch, spaceId: 'default' },
        esClient,
        runAsIdentity: 'namespace/worker',
        autonomy: 'assisted',
        approve: true,
        baseSha: expect.any(String),
      })
    );
  }
  expect(withRuleTuningIdentity).toHaveBeenCalledWith(
    expect.objectContaining({ serviceAccountId: 'namespace/worker' })
  );
  expect(runExperiment.mock.calls[0][0].concurrency).toBe(1);
  expect(runExperiment.mock.calls[0][1]).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'TPSuppressedByTuning' })])
  );
});
