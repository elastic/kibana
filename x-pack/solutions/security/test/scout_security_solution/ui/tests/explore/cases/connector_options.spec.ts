/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteCases } from '../../../common/api_helpers';

test.describe(
  'Cases connector incident fields',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteCases(kbnClient);
    });

    test('displays connector options when creating a case', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoCases();

      const createCaseBtn = page.testSubj.locator('createNewCaseBtn');
      await createCaseBtn.waitFor({ state: 'visible', timeout: 15_000 });
      await createCaseBtn.click();

      const connectorSelector = page.testSubj.locator('caseConnectors');
      await expect(connectorSelector).toBeVisible({ timeout: 15_000 });
    });
  }
);
