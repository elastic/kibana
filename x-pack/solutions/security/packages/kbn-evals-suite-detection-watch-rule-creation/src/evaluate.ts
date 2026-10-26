/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { RuleCreationClient } from './rule_creation_client';
import { seedSecurityData } from './seed_security_data';

// Extend the base evaluate fixture with our client.
// Playwright constructs RuleCreationClient once per worker and passes it
// into the spec via `async ({ ruleCreationClient }) => { ... }`.
// `{}` is the repo-wide convention for an empty test-fixture bag in
// `base.extend<TestFixtures, WorkerFixtures>` — Playwright's generic constraint rejects
// `Record<string, never>` here. See x-pack/platform/plugins/private/logstash/test/scout.
export const evaluate = base.extend<
  {},
  { securityData: void; ruleCreationClient: RuleCreationClient }
>({
  // `auto` so a spec cannot silently skip seeding and score an empty stack. See
  // seed_security_data.ts for why a purpose-built fixture is used over a stock es_archive.
  securityData: [
    async ({ log, esClient }, use) => {
      const cleanup = await seedSecurityData({ esClient, log });
      await use();
      await cleanup();
    },
    { scope: 'worker', auto: true },
  ],
  ruleCreationClient: [
    async ({ fetch, log }, use) => {
      const client = new RuleCreationClient(fetch, log);
      await use(client);
      await client.cancelPending();
    },
    { scope: 'worker' },
  ],
});

export { tags } from '@kbn/evals';
