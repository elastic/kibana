/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest } from '../../fixtures';

spaceTest.describe(
  'Defend Workflows - Response actions history',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest('loads the response actions history page', async ({ pageObjects, endpointData }) => {
      await pageObjects.responseActions.navigate();
      await expect(pageObjects.responseActions.responsePage).toBeVisible();
    });
  }
);
