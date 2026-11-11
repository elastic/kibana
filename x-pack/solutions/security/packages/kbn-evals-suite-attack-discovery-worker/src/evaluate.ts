/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { runPreflight, type PreflightResult } from './preflight';
import { AttackDiscoveryWorkerClient, usingClient } from './worker_client';

// Extends the base evaluate fixture with the stack preflight (cohort routing, eval space) and
// the runner client. `{}` is the repo-wide convention for an empty test-fixture bag in
// `base.extend<TestFixtures, WorkerFixtures>`.
export const evaluate = base.extend<
  {},
  { adWorkerPreflight: PreflightResult; adWorkerClient: AttackDiscoveryWorkerClient }
>({
  // `auto` so a spec cannot skip the preflight and score a stack that routes to the wrong
  // model or lacks the workflows. The routing it writes is restored on teardown.
  adWorkerPreflight: [
    async ({ fetch, esClient, log, connector, repetitions }, use) => {
      if (repetitions > 1) {
        log.warning(
          `Attack Discovery Worker evals run with repetitions=${repetitions}. Every repeat re-runs all rows serially in the shared eval space, and the Playwright test timeout covers one pass over the rows. Use repetitions=1 (EVAL_REPETITIONS / --repetitions).`
        );
      }
      const preflight = await runPreflight({
        fetch,
        esClient,
        log,
        connector,
      });
      try {
        await use(preflight);
      } finally {
        await preflight.restore();
      }
    },
    { scope: 'worker', auto: true },
  ],
  adWorkerClient: [
    async ({ fetch, log, adWorkerPreflight }, use) => {
      void adWorkerPreflight;
      const client = new AttackDiscoveryWorkerClient(fetch, log);
      await usingClient(client, () => use(client));
    },
    { scope: 'worker' },
  ],
});

export { tags } from '@kbn/evals';
