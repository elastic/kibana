/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import {
  deleteAlertsAndRules,
  deleteGapAutoFillScheduler,
  startBasicLicense,
} from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getCustomQueryRuleParams } from '../../../common/rule_objects';
import { RULES_MANAGEMENT_URL } from '../../../common/urls';

test.describe(
  'Rule gaps auto fill status - Basic license',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteGapAutoFillScheduler(kbnClient);
      await startBasicLicense(kbnClient);
      await createRuleFromParams(
        kbnClient,
        getCustomQueryRuleParams({
          rule_id: '1',
          name: 'Rule 1',
          interval: '1m',
          from: 'now-1m',
        })
      );
    });

    test('hides the badge for basic licenses', async ({ page, pageObjects }) => {
      const { rulesManagementTable, ruleGaps } = pageObjects;

      await page.goto(RULES_MANAGEMENT_URL);
      await rulesManagementTable.waitForTableToLoad();
      await ruleGaps.gotoMonitoringTab();
      await expect(ruleGaps.gapsOverviewPanel).toBeVisible();
      await expect(ruleGaps.autoFillStatusBadge).toBeHidden();
    });
  }
);
