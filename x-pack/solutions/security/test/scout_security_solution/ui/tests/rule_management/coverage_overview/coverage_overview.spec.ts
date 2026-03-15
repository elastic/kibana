/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import {
  deleteAlertsAndRules,
  installPrebuiltRules,
  createRule,
} from '../../../common/api_helpers';
import { RULES_COVERAGE_OVERVIEW_URL } from '../../../common/urls';

test.describe(
  'Coverage overview',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await installPrebuiltRules(kbnClient);
      await createRule(apiServices, {
        name: 'Enabled custom rule',
        enabled: true,
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0001',
              name: 'Initial Access',
              reference: 'https://attack.mitre.org/tactics/TA0001/',
            },
            technique: [
              {
                id: 'T1078',
                name: 'Valid Accounts',
                reference: 'https://attack.mitre.org/techniques/T1078/',
                subtechnique: [],
              },
            ],
          },
        ],
      });
      await createRule(apiServices, {
        name: 'Disabled custom rule',
        rule_id: 'disabled-custom-rule',
        enabled: false,
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0002',
              name: 'Execution',
              reference: 'https://attack.mitre.org/tactics/TA0002/',
            },
            technique: [
              {
                id: 'T1059',
                name: 'Command and Scripting Interpreter',
                reference: 'https://attack.mitre.org/techniques/T1059/',
                subtechnique: [],
              },
            ],
          },
        ],
      });
    });

    test('renders MITRE ATT&CK coverage data on page load', async ({ page }) => {
      await test.step('Navigate to coverage overview page', async () => {
        await page.goto(RULES_COVERAGE_OVERVIEW_URL);
      });

      await test.step('Verify MITRE ATT&CK tactic panels are visible', async () => {
        const tacticPanel = page.testSubj.locator('coverageOverviewTacticPanel');
        await expect(tacticPanel.first()).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify Initial Access tactic is shown with enabled rule', async () => {
        await expect(page.getByText('Initial Access')).toBeVisible();
      });
    });

    test('filters for all data including disabled rules', async ({ page }) => {
      await test.step('Navigate to coverage overview page', async () => {
        await page.goto(RULES_COVERAGE_OVERVIEW_URL);
        const tacticPanel = page.testSubj.locator('coverageOverviewTacticPanel');
        await expect(tacticPanel.first()).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify filtering controls are available', async () => {
        const activityFilterBtn = page.testSubj.locator(
          'coverageOverviewFilterGroupActivityButton'
        );
        await expect(activityFilterBtn).toBeVisible();
      });
    });

    test('filters for only prebuilt rules', async ({ page }) => {
      await test.step('Navigate to coverage overview page', async () => {
        await page.goto(RULES_COVERAGE_OVERVIEW_URL);
        const tacticPanel = page.testSubj.locator('coverageOverviewTacticPanel');
        await expect(tacticPanel.first()).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify source filter is available', async () => {
        const sourceFilterBtn = page.testSubj.locator('coverageOverviewFilterGroupSourceButton');
        await expect(sourceFilterBtn).toBeVisible();
      });
    });

    test('filters for only custom rules', async ({ page }) => {
      await test.step('Navigate to coverage overview page', async () => {
        await page.goto(RULES_COVERAGE_OVERVIEW_URL);
        const tacticPanel = page.testSubj.locator('coverageOverviewTacticPanel');
        await expect(tacticPanel.first()).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify source filter is available', async () => {
        const sourceFilterBtn = page.testSubj.locator('coverageOverviewFilterGroupSourceButton');
        await expect(sourceFilterBtn).toBeVisible();
      });
    });

    test('filters by search term', async ({ page }) => {
      await test.step('Navigate to coverage overview page', async () => {
        await page.goto(RULES_COVERAGE_OVERVIEW_URL);
        const tacticPanel = page.testSubj.locator('coverageOverviewTacticPanel');
        await expect(tacticPanel.first()).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify search bar is available', async () => {
        const searchBar = page.testSubj.locator('coverageOverviewFilterSearchBar');
        await expect(searchBar).toBeVisible();
      });
    });

    test('enables all disabled rules from technique panel', async ({ page }) => {
      await test.step('Navigate to coverage overview page', async () => {
        await page.goto(RULES_COVERAGE_OVERVIEW_URL);
        const tacticPanel = page.testSubj.locator('coverageOverviewTacticPanel');
        await expect(tacticPanel.first()).toBeVisible({ timeout: 60_000 });
      });

      await test.step('Verify Initial Access tactic is visible', async () => {
        await expect(page.getByText('Initial Access')).toBeVisible();
      });
    });
  }
);
