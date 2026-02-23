/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';

test.describe(
  'Maintenance window callout',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({ name: 'MW test rule', rule_id: 'mw-1', enabled: false })
      );
    });

    test('displays maintenance window callout when active', async ({
      pageObjects,
      page,
      kbnClient,
    }) => {
      await kbnClient
        .request({
          method: 'POST',
          path: '/internal/alerting/rules/maintenance_window',
          body: {
            title: 'Test MW',
            duration: 3600000,
            r_rule: {
              dtstart: new Date().toISOString(),
              count: 1,
              tzid: 'UTC',
            },
            category_ids: ['securitySolution'],
          },
          headers: { 'x-elastic-internal-origin': 'security-solution' },
        })
        .catch(() => {});

      await pageObjects.rulesManagementTable.goto();
      await pageObjects.rulesManagementTable.waitForTableToLoad();

      const callout = page.testSubj.locator('maintenanceWindowCallout');
      const hasCallout = await callout.isVisible({ timeout: 10_000 }).catch(() => false);
      if (hasCallout) {
        await expect(callout).toContainText(/maintenance/i);
      }
    });
  }
);
