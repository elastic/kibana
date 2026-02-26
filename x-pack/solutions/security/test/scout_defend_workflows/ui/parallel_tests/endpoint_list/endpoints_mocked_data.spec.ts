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
  'Defend Workflows - Endpoint list with mocked data',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest('displays endpoint hosts in the list', async ({ pageObjects, endpointData }) => {
      await pageObjects.endpointList.navigate();
      await pageObjects.endpointList.waitForTableLoaded();

      const rowCount = await pageObjects.endpointList.getTableRowCount();
      expect(rowCount).toBeGreaterThanOrEqual(endpointData.hostIds.length);
    });

    spaceTest('sorts by enrollment date descending by default', async ({ page, pageObjects }) => {
      const metadataResponse = page.waitForResponse(
        (r) => r.url().includes('/api/endpoint/metadata') && r.status() === 200
      );

      await pageObjects.endpointList.navigate();
      const response = await metadataResponse;
      const body = await response.json();

      expect(body.sortField).toBe('enrolled_at');
      expect(body.sortDirection).toBe('desc');
    });

    spaceTest('can open endpoint details flyout', async ({ page, pageObjects, endpointData }) => {
      await pageObjects.endpointList.navigate();
      await pageObjects.endpointList.waitForTableLoaded();

      await pageObjects.endpointList.openEndpointDetails();
      await expect(page.testSubj.locator('endpointDetailsFlyout')).toBeVisible();
    });
  }
);
