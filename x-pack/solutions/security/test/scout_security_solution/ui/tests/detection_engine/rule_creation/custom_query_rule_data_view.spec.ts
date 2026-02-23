/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';

test.describe(
  'Custom query rules with data views - Rule Creation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    const DATA_VIEW_ID = 'security-solution-default';
    const RULE_NAME = 'Data View Rule Test';

    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);

      await kbnClient
        .request({
          method: 'POST',
          path: '/api/data_views/data_view',
          body: {
            data_view: {
              title: 'auditbeat-*',
              id: DATA_VIEW_ID,
              allowNoIndex: true,
            },
            override: true,
          },
        })
        .catch(() => {});
    });

    test.afterEach(async ({ kbnClient }) => {
      await kbnClient
        .request({
          method: 'DELETE',
          path: `/api/data_views/data_view/${DATA_VIEW_ID}`,
        })
        .catch(() => {});
    });

    test('Creates and enables a new rule with data view', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;

      await test.step('Navigate to rule creation page', async () => {
        await ruleCreation.goto();
      });

      await test.step('Fill define step with data view', async () => {
        const dataViewSelector = page.testSubj.locator('switchToDataView');
        await dataViewSelector.click();

        const dataViewCombobox = page.testSubj.locator('pick-rule-data-source');
        await expect(dataViewCombobox).toBeVisible();

        await ruleCreation.clickContinue();
      });

      await test.step('Fill about step', async () => {
        await ruleCreation.fillRuleName(RULE_NAME);
        await ruleCreation.clickContinue();
      });

      await test.step('Fill schedule step', async () => {
        await ruleCreation.clickContinue();
      });

      await test.step('Create rule and verify', async () => {
        await ruleCreation.createRule();
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toContainText(RULE_NAME);
      });
    });

    test('Adds filter on define step', async ({ page, pageObjects }) => {
      const { ruleCreation } = pageObjects;

      await ruleCreation.goto();

      await test.step('Switch to data view and add filter', async () => {
        const dataViewSelector = page.testSubj.locator('switchToDataView');
        await dataViewSelector.click();

        const addFilterBtn = page.testSubj.locator('addFilter');
        await addFilterBtn.click();

        const filterFieldInput = page.testSubj.locator('filterFieldSuggestionList');
        await filterFieldInput.locator('input').fill('host.name');
        await page.getByRole('option', { name: 'host.name' }).click();

        const operatorInput = page.testSubj.locator('filterOperatorList');
        await operatorInput.locator('input').fill('exists');
        await page.getByRole('option', { name: 'exists' }).click();

        const saveFilterBtn = page.testSubj.locator('saveFilter');
        await saveFilterBtn.click();
      });

      await test.step('Verify filter badge exists', async () => {
        const filterBadge = page.testSubj.locator('filter-badge-filterContent');
        await expect(filterBadge).toContainText('host.name');
      });
    });
  }
);
