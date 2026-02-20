/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Endpoints page',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.skip('Shows endpoint on the list - requires real endpoint agent enrollment', async () => {
      // Skipped: requires createEndpointHost, real Fleet agent, and endpoint enrollment
    });

    test.skip('should update endpoint policy on Endpoint - requires real endpoint agent', async () => {
      // Skipped: requires real endpoint with policy assignment and metadata API
    });

    test.describe('Endpoint reassignment', () => {
      test.skip('User can reassign a single endpoint to a different Agent Configuration - requires real agents', async () => {
        // Skipped: requires real agents and Fleet reassignment flow
      });
    });
  }
);
