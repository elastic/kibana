/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { evaluate as base, tags, selectEvaluators } from '@kbn/evals';

export { tags, selectEvaluators };

export const evaluate = base.extend<
  {},
  {
    supertest: supertest.Agent;
  }
>({
  supertest: [
    async ({ config, log }, use) => {
      const kibanaServerUrl = formatUrl(config.hosts.kibana);
      const kibanaServerUrlWithoutLastCharacter = kibanaServerUrl.slice(0, -1);

      const testAgent = supertest
        .agent(kibanaServerUrlWithoutLastCharacter)
        .auth(config.auth.username, config.auth.password);

      log.serviceLoaded?.(`supertest at ${kibanaServerUrl}`);
      await use(testAgent);
    },
    { scope: 'worker' },
  ],
});
