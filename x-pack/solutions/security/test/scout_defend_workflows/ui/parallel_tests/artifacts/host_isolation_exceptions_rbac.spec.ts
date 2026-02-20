/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';

spaceTest.describe(
  'Defend Workflows - host isolation exceptions rbac cy',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.skip(
      'host isolation exceptions rbac cy (Cypress migration placeholder)',
      async () => {
        // Migrated from Cypress; requires Fleet/Endpoint setup or API data loaders.
      }
    );
  }
);
