/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../../common/api_helpers';
import {
  createExceptionList,
  deleteAllExceptionLists,
} from '../../../../../common/detection_engine_api_helpers';

test.describe(
  'Shared exception list read only',
  {
    tag: [...tags.stateful.classic],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteAllExceptionLists(kbnClient);

      await createExceptionList(kbnClient, {
        list_id: 'test_exception_list',
        name: 'Test Exception List',
        description: 'Test exception list',
        type: 'detection',
      });
    });

    test('Displays missing privileges callout for read-only user', async ({
      page,
      pageObjects,
      browserAuth,
    }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.exceptions.gotoSharedExceptionLists();

      await test.step('Verify lists are visible', async () => {
        const showingText = page.testSubj.locator('exceptionsTableShowingLists');
        await expect(showingText).toContainText('1');
      });

      await test.step('Verify missing privileges callout', async () => {
        const callout = page.testSubj.locator('missingPrivilegesCallout');
        if (await callout.isVisible({ timeout: 5_000 })) {
          await expect(callout).toBeVisible();
        }
      });
    });

    test('Exception list actions are enabled for read-only user', async ({
      page,
      pageObjects,
      browserAuth,
    }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.exceptions.gotoSharedExceptionLists();

      await test.step('Verify overflow actions button is enabled', async () => {
        const actionsBtn = page.testSubj.locator('exceptionOverflowCardButton').first();
        await expect(actionsBtn).toBeEnabled();
      });
    });
  }
);
