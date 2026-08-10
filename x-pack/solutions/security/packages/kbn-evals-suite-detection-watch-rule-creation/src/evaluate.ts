/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { RuleCreationClient } from './rule_creation_client';

// Extend the base evaluate fixture with our client.
// Playwright constructs RuleCreationClient once per worker and passes it
// into the spec via `async ({ ruleCreationClient }) => { ... }`.
export const evaluate = base.extend<{}, { ruleCreationClient: RuleCreationClient }>({
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
