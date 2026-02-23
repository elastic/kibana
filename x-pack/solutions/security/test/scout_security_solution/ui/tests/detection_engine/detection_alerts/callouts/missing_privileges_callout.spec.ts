/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { ALERTS_URL } from '../../../../common/urls';

test.describe(
  'Missing privileges callout',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test('displays missing privileges callout when user lacks access', async ({
      page,
      browserAuth,
    }) => {
      await test.step('Login as viewer with restricted access', async () => {
        await browserAuth.loginAsViewer();
      });

      await test.step('Navigate to alerts page', async () => {
        await page.goto(ALERTS_URL);
      });

      await test.step('Verify restricted access indicator', async () => {
        const noPrivilegesPage = page.testSubj.locator('noPrivilegesPage');
        const callout = page.testSubj.locator('missingPrivilegesCallOut');
        const isNoPrivVisible = await noPrivilegesPage.isVisible().catch(() => false);
        const isCalloutVisible = await callout.isVisible().catch(() => false);
        expect(isNoPrivVisible || isCalloutVisible).toBe(true);
      });
    });
  }
);
