/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { SECURITY_ARCHIVES } from '../../../common/es_helpers';

const INSPECT_BUTTON_PAGES = [
  {
    pageName: 'Hosts',
    url: '/app/security/hosts/allHosts',
  },
  {
    pageName: 'Network',
    url: '/app/security/network/flows',
  },
  {
    pageName: 'Users',
    url: '/app/security/users/allUsers',
  },
] as const;

test.describe(
  'Inspect Explore pages',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.RISK_SCORES_NEW);
    });

    test.afterAll(async ({ esArchiver }) => {
      // no-op: Scout EsArchiverFixture does not support unload;
    });

    for (const { pageName, url } of INSPECT_BUTTON_PAGES) {
      test(`inspect button opens modal on ${pageName} page`, async ({ page, pageObjects }) => {
        const timerange =
          '?timerange=(global:(linkTo:!(timeline),timerange:(from:1547914976217,fromStr:now-15m,kind:relative,to:1579537385745,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1547914976217,fromStr:now-15m,kind:relative,to:1579537385745,toStr:now)))';

        await page.goto(url + timerange);

        await test.step('Open inspect modal via table inspect button', async () => {
          const inspectBtn = page.testSubj.locator('inspect-icon-button').first();
          await inspectBtn.waitFor({ state: 'visible', timeout: 30_000 });
          await inspectBtn.click();
        });

        await test.step('Verify inspect modal is visible with index pattern', async () => {
          const inspectModal = page.testSubj.locator('inspectorPanel');
          await expect(inspectModal).toBeVisible();

          const indexPatternDisplay = page.testSubj.locator('inspectorIndexPattern');
          await expect(indexPatternDisplay).toBeVisible();
        });

        await test.step('Close the inspect modal', async () => {
          const closeBtn = page.testSubj.locator('euiFlyoutCloseButton').first();
          await closeBtn.click();
          const inspectModal = page.testSubj.locator('inspectorPanel');
          await expect(inspectModal).toBeHidden();
        });
      });
    }
  }
);
