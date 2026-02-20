/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { APP_RESPONSE_ACTIONS_HISTORY_PATH } from '../../../../common/defend_workflows_urls';

test.describe(
  'Response actions history',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('should display response actions history page', async ({ page, pageObjects }) => {
      await pageObjects.responseActions.gotoResponseActionsHistory();
      await expect(page).toHaveURL(new RegExp('.*administration/response_actions_history.*'));
      await expect(page.testSubj.locator('responseActionsPage').first()).toBeVisible({
        timeout: 15_000,
      });
    });
  }
);
