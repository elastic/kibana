/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import {
  deleteAlertsAndRules,
  createSavedQuery,
  deleteSavedQueries,
} from '../../../common/api_helpers';
import { createRuleFromParams } from '../../../common/rule_api_helpers';
import { getNewSavedQueryRule } from '../../../common/rule_objects';

const SAVED_QUERY_NAME = 'custom saved query';
const SAVED_QUERY_QUERY = 'process.name: test';

test.describe(
  'Saved query rules - Rule Creation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteSavedQueries(kbnClient);
    });

    test('Creates saved query rule', async ({ page, pageObjects, kbnClient }) => {
      const { ruleCreation } = pageObjects;

      await test.step('Create a saved query via API', async () => {
        await createSavedQuery(kbnClient, {
          title: SAVED_QUERY_NAME,
          query: SAVED_QUERY_QUERY,
        });
      });

      await test.step('Navigate to rule creation', async () => {
        await ruleCreation.goto();
      });

      await test.step('Select saved query rule type and load query', async () => {
        const savedQueryType = page.testSubj.locator('savedQueryRule');
        await savedQueryType.click();

        const savedQueryDropdown = page.testSubj.locator('savedQuerySelector');
        await savedQueryDropdown.click();
        await page.getByRole('option', { name: SAVED_QUERY_NAME }).click();
      });

      await test.step('Verify query is loaded and enable dynamic loading', async () => {
        const loadQueryDynamically = page.testSubj.locator('loadQueryDynamically');
        await loadQueryDynamically.check();

        const queryInput = page.testSubj.locator('queryInput');
        await expect(queryInput).toContainText(SAVED_QUERY_QUERY);
      });

      await test.step('Complete rule creation wizard', async () => {
        await ruleCreation.clickContinue();
        await ruleCreation.fillRuleName('Saved Query Rule Test');
        await ruleCreation.clickContinue();
        await ruleCreation.clickContinue();
        await ruleCreation.createRule();
      });

      await test.step('Verify rule is created', async () => {
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toContainText('Saved Query Rule Test');
      });
    });

    test('Shows error toast when saved query does not exist', async ({
      page,
      pageObjects,
      kbnClient,
    }) => {
      const { ruleDetails } = pageObjects;

      await test.step('Create rule with non-existent saved query via API', async () => {
        const ruleResponse = await createRuleFromParams(
          kbnClient,
          getNewSavedQueryRule({ saved_id: 'non-existent', query: undefined })
        );
        await ruleDetails.goto(ruleResponse.id);
      });

      await test.step('Verify error toast appears', async () => {
        const toastList = page.testSubj.locator('globalToastList');
        await expect(toastList).toContainText('Failed to load the saved query');
      });
    });
  }
);
