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
  'Serverless essentials tier access',
  {
    tag: [...tags.serverless.security.essentials],
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

    test('Exception list pages should be accessible on essentials tier', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.exceptions.gotoSharedExceptionLists();

      const showingText = page.testSubj.locator('exceptionsTableShowingLists');
      await expect(showingText).toContainText('1');
    });
  }
);
