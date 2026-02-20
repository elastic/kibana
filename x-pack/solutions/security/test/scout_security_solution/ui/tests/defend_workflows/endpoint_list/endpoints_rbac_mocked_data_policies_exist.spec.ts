/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';

test.describe(
  'Endpoints RBAC - policies exist mocked data',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.skip('should display endpoints for endpoint_all when policies exist - requires createAgentPolicy + RBAC', async () => {
      // Skipped: requires createAgentPolicyTask and RBAC role
    });
  }
);
