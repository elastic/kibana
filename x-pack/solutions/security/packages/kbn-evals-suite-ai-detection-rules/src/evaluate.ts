/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { createRuleCreationClient, type RuleCreationClient } from './rule_creation_client';

export const evaluate = base.extend<
  {},
  { ruleCreationClient: RuleCreationClient }
>({
  ruleCreationClient: [
    async ({ fetch, log, connector }, use) => {
      const client = createRuleCreationClient(fetch, log, connector.id);
      await use(client);
    },
    { scope: 'worker' },
  ],
});
