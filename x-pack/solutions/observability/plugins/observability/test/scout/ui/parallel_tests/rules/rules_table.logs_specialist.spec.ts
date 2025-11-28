/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';
import { createRule, LogsSpecialist } from './helpers';
import type { CreateRuleResponse } from './types';

test.describe('Rules Table - Logs Specialist', { tag: ['@ess', '@svlOblt'] }, () => {
  let createdRule: CreateRuleResponse['data'];
  test.beforeAll(async ({ apiServices, samlAuth }) => {
    createdRule = (await createRule(apiServices, { name: 'Specialist Test Rule' })).data;
    await LogsSpecialist.setUp(samlAuth);
  });

  test.beforeEach(async ({ browserAuth, pageObjects, samlAuth }) => {
    await LogsSpecialist.login(browserAuth, samlAuth);
    await pageObjects.rulesPage.goto();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alerting.rules.delete(createdRule.id);
  });

  test('should see the Rules Table container', async ({ pageObjects }) => {
    await expect(pageObjects.rulesPage.rulesTableContainer).toBeVisible();
  });

  test('should see an editable rule in the Rules Table', async ({ pageObjects }) => {
    const editableRules = pageObjects.rulesPage.getEditableRules();
    await expect(editableRules).toBeVisible();
    await expect(editableRules).toHaveCount(1);
    await expect(editableRules.filter({ hasText: createdRule.name })).toHaveCount(1);
  });
});
