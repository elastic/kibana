/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { EVAL_SPACE_IDS } from './constants';
import { HuntWatchClient } from './hunt_watch_client';
import { assertWorkflowInstalled } from './workflow_fixture';
import { runPreflight } from './preflight';
import { seedHuntData } from './seed_hunt_data';

// Extend the base evaluate fixture with the Hunt Watch client and the stack preflight.
// Playwright constructs each worker-scoped fixture once per worker and passes it into the spec
// via `async ({ huntWatchClient }) => { ... }`. `{}` is the repo-wide convention for an empty
// test-fixture bag in `base.extend<TestFixtures, WorkerFixtures>` — Playwright's generic
// constraint rejects `Record<string, never>` here. See x-pack/platform/plugins/private/logstash/
// test/scout.
export const evaluate = base.extend<
  {},
  { huntWatchPreflight: void; huntWatchSeed: void; huntWatchClient: HuntWatchClient }
>({
  // `auto` so a spec cannot silently skip the preflight and score an empty/misconfigured
  // stack. Order matters: the preflight must run before `assertWorkflowInstalled` checks the
  // per-space Worker, since enabling it is part of the preflight.
  huntWatchPreflight: [
    async ({ fetch, log, connector, evaluationConnector }, use) => {
      const cleanup = await runPreflight({
        fetch,
        log,
        connectorId: connector.id,
        evaluationConnector,
      });
      // The preflight has already swapped the default AI connector in every eval space by the
      // time it returns, so a failed install check must still restore it.
      try {
        await assertWorkflowInstalled({ fetch, log, spaceIds: EVAL_SPACE_IDS });
        await use();
      } finally {
        await cleanup();
      }
    },
    { scope: 'worker', auto: true },
  ],
  // Seeds the Demo C+ aws-iam pack, the non-default space copies, and the canary once per
  // worker, then verifies every bound report id exists in its expected space. `auto` so an
  // unseeded stack cannot be scored. Runs after the preflight (spaces must exist for the copies).
  huntWatchSeed: [
    async ({ config, esClient, fetch, log, huntWatchPreflight }, use) => {
      void huntWatchPreflight;
      const cleanup = await seedHuntData({
        esClient,
        fetch,
        log,
        target: {
          kibanaUrl: config.hosts.kibana,
          elasticsearchUrl: config.hosts.elasticsearch,
          username: config.auth.username,
          password: config.auth.password,
        },
      });
      await use();
      await cleanup();
    },
    { scope: 'worker', auto: true },
  ],
  huntWatchClient: [
    async ({ fetch, log, huntWatchPreflight, huntWatchSeed }, use) => {
      void huntWatchPreflight;
      void huntWatchSeed;
      const client = new HuntWatchClient(fetch, log);
      await use(client);
      await client.cancelPending();
    },
    { scope: 'worker' },
  ],
});

export { tags } from '@kbn/evals';
