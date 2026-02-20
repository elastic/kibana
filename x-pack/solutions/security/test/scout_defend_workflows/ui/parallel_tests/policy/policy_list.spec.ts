/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  DEFEND_WORKFLOWS_ROUTES,
  createFleetEndpointPolicy,
  deleteFleetEndpointPolicies,
} from '../../fixtures';
import type { IndexedFleetEndpointPolicyResponse } from '../../fixtures';

spaceTest.describe(
  'Defend Workflows - policy list',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let indexedPolicies: IndexedFleetEndpointPolicyResponse | null = null;

    spaceTest.beforeAll(async ({ kbnClient, log }) => {
      indexedPolicies = await createFleetEndpointPolicy(kbnClient, {
        policyPrefix: 'Scout policy list',
        log,
      });
    });

    spaceTest.afterAll(async ({ kbnClient }) => {
      if (indexedPolicies) {
        await deleteFleetEndpointPolicies(kbnClient, indexedPolicies);
      }
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest('loads policy list and shows at least one policy', async ({ page }) => {
      await page.goto(DEFEND_WORKFLOWS_ROUTES.policies);
      await page
        .locator(testSubjSelector('globalLoadingIndicator-hidden'))
        .waitFor({ state: 'visible' });
      await expect(page.locator(testSubjSelector('policyListPage'))).toBeVisible();
      await expect(page.locator(testSubjSelector('policyListTable'))).toBeVisible();
    });
  }
);
