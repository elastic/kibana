/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { ALERTS_URL } from '../../../common/urls';

test.describe(
  'Timelines - Bulk add to timeline',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({
          name: 'Bulk timeline rule',
          rule_id: 'bulk-tl-1',
          enabled: true,
        })
      );
    });

    test('bulk add alerts to timeline from alerts page', async ({ pageObjects, page }) => {
      await pageObjects.explore.gotoUrl(ALERTS_URL);
      const alertsTable = page.testSubj.locator('alertsTable');
      await alertsTable.waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

      const checkbox = page.testSubj.locator('checkboxSelectAll');
      if (await checkbox.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await checkbox.click();
        const addToTimelineBtn = page.testSubj.locator('send-alert-to-timeline-button');
        if (await addToTimelineBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await addToTimelineBtn.click();
          const timelinePanel = page.testSubj.locator('timeline-bottom-bar');
          await expect(timelinePanel).toBeVisible({ timeout: 15_000 });
        }
      }
    });
  }
);
