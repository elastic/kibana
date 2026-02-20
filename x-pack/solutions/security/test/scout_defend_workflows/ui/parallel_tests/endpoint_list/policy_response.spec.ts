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
  indexEndpointHostsData,
  deleteIndexedEndpointHostsData,
} from '../../fixtures';
import type { IndexedHostsAndAlertsResponse } from '../../fixtures';

spaceTest.describe(
  'Defend Workflows - policy response',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let indexedHosts: IndexedHostsAndAlertsResponse | null = null;

    spaceTest.beforeAll(async ({ esClient, kbnClient, log }) => {
      indexedHosts = await indexEndpointHostsData(esClient, kbnClient, { numHosts: 2, log });
    });

    spaceTest.afterAll(async ({ esClient, kbnClient }) => {
      if (indexedHosts) {
        await deleteIndexedEndpointHostsData(esClient, kbnClient, indexedHosts);
      }
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest('loads endpoint list with policy response data', async ({ page }) => {
      await page.goto(DEFEND_WORKFLOWS_ROUTES.endpoints);
      await page
        .locator(testSubjSelector('globalLoadingIndicator-hidden'))
        .waitFor({ state: 'visible' });
      await expect(page.locator(testSubjSelector('endpointPage'))).toBeVisible();
      await expect(page.locator(testSubjSelector('endpointListTable'))).toBeVisible();
    });
  }
);
