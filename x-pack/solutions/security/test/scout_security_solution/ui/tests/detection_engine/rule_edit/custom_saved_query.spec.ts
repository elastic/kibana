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
import { getNewRule } from '../../../common/rule_objects';

const SAVED_QUERY_NAME = 'custom saved query';
const SAVED_QUERY_QUERY = 'process.name: test';

test.describe(
  'Custom saved query - Rule Edit',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      await deleteSavedQueries(kbnClient);
    });

    test('Edits saved query rule', async ({ page, kbnClient }) => {
      await test.step('Create saved query and rule via API', async () => {
        await createSavedQuery(kbnClient, {
          title: SAVED_QUERY_NAME,
          query: SAVED_QUERY_QUERY,
        });
        const rule = getNewRule({ rule_id: 'query-rule-edit' });
        const created = await createRuleFromParams(kbnClient, rule);
        await page.gotoApp(`security/rules/id/${created.id}/edit`);
      });

      await test.step('Select saved query and enable dynamic loading', async () => {
        const savedQueryDropdown = page.testSubj.locator('savedQuerySelector');
        if (await savedQueryDropdown.isVisible()) {
          await savedQueryDropdown.click();
          await page.getByRole('option', { name: SAVED_QUERY_NAME }).click();

          const loadDynamically = page.testSubj.locator('loadQueryDynamically');
          await loadDynamically.check();
        }
      });

      await test.step('Save changes', async () => {
        const saveBtn = page.testSubj.locator('ruleEditSubmitButton');
        await saveBtn.click();
      });

      await test.step('Verify rule is saved', async () => {
        const ruleNameHeader = page.testSubj.locator('header-page-title');
        await expect(ruleNameHeader).toBeVisible();
      });
    });
  }
);
