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
  'Defend Workflows - Policy list',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest(
      'displays the policy list page with created policies',
      async ({ pageObjects, endpointPolicy }) => {
        await pageObjects.policy.navigateToList();
        await expect(pageObjects.policy.policyListPage).toBeVisible();
      }
    );

    spaceTest(
      'can navigate to policy details',
      async ({ pageObjects, endpointPolicy }) => {
        await pageObjects.policy.navigateToDetails(endpointPolicy.integrationPolicyId);
        await expect(pageObjects.policy.policyDetailsPage).toBeVisible();
      }
    );
  }
);
