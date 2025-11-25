/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';
import { Analyst, createRule } from './helpers';
import type { CreateRuleResponse } from './types';

test.describe('Rules Table - Analyst', { tag: ['@ess', '@svlOblt'] }, () => {
  let createdRule: CreateRuleResponse['data'];
  test.beforeAll(async ({ apiServices }) => {
    createdRule = (await createRule(apiServices)).data;
  });
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await Analyst.login(browserAuth);
    await pageObjects.rulesPage.goto();
  });
  test.afterAll(async ({ apiServices }) => {
    await apiServices.alerting.rules.delete(createdRule.id);
  });

  test('should see the Rules Table container', async ({ pageObjects }) => {
    await expect(pageObjects.rulesPage.rulesTableContainer).toBeVisible();
  });

  test('should see a non-editable rule in the Rules Table', async ({ pageObjects }) => {
    const nonEditableRules = pageObjects.rulesPage.getNonEditableRules();
    await expect(nonEditableRules).toBeVisible();
    await expect(nonEditableRules).toHaveCount(1);
    await expect(nonEditableRules.filter({ hasText: createdRule.name })).toHaveCount(1);
  });
});
