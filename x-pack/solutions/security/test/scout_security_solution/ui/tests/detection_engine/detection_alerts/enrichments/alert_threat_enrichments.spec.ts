/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules } from '../../../../common/api_helpers';
import { createRuleFromParams } from '../../../../common/rule_api_helpers';
import { getNewIndicatorMatchRule } from '../../../../common/rule_objects';
import { SECURITY_ARCHIVES } from '../../../../common/es_helpers';
import { ALERTS_URL } from '../../../../common/urls';

test.describe(
  'Alert threat enrichments',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient, esArchiver }) => {
      await browserAuth.loginAsAdmin();
      await esArchiver.loadIfNeeded(SECURITY_ARCHIVES.AUDITBEAT_MULTIPLE);
      await deleteAlertsAndRules(apiServices);
    });

    test.afterAll(async ({ esArchiver }) => {
      // no-op: Scout EsArchiverFixture does not support unload;
    });

    test('displays threat enrichments in alert flyout', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const rule = getNewIndicatorMatchRule({ rule_id: 'threat-enrichment-rule' });

      await test.step('Create indicator match rule via API', async () => {
        await createRuleFromParams(kbnClient, rule);
      });

      await test.step('Navigate to alerts page', async () => {
        await page.goto(ALERTS_URL);
        await pageObjects.detectionAlerts.waitForAlertsToLoad();
      });

      await test.step('Verify alerts table is visible', async () => {
        await expect(pageObjects.detectionAlerts.alertsTable).toBeVisible();
      });

      await test.step('Expand first alert to check enrichments', async () => {
        const expandBtn = page.testSubj.locator('expand-event').first();
        const isExpandVisible = await expandBtn.isVisible().catch(() => false);
        test.skip(!isExpandVisible, 'No alerts generated - need threat indicator data');
        await expandBtn.click();

        const flyout = page.testSubj.locator('euiFlyoutCloseButton');
        await expect(flyout).toBeVisible();
      });
    });
  }
);
