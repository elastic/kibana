/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect } from '@kbn/scout-oblt';
import { createRule, LogsEspecialist } from './helpers';
import type { CreateRuleResponse } from './types';

test.describe('Rules - Rules Table - Logs Especialist', { tag: ['@ess', '@svlOblt'] }, () => {
  let rule: CreateRuleResponse;
  test.beforeAll(async ({ samlAuth, apiServices }) => {
    await LogsEspecialist.setUp(samlAuth);
    rule = await createRule(apiServices);
  });

  test.beforeEach(async ({ browserAuth, samlAuth }) => {
    await browserAuth.loginAs(samlAuth.customRoleName);
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alerting.rules.delete(rule.data.id);
  });

  test('shows the rules table', async ({ page, kbnUrl }) => {
    // ToDo: fix eslint error or move to beforeEach/afterEach
    // await using disposableRule = await getDisposableRule(apiServices);
    const ruleName = rule.data.name;

    await page.goto(kbnUrl.get('/app/observability/alerts/rules'));
    await expect(page.getByTestId('rulesList')).toBeVisible();
    await expect(page.getByText(ruleName)).toBeVisible();
  });

  test('rules are editable', async ({ page, kbnUrl }) => {
    // await using disposableRule = await getDisposableRule(apiServices);
    const ruleName = rule.data.name;

    await page.goto(kbnUrl.get('/app/observability/alerts/rules'));
    const ruleRow = page.getByTestId(`rule-row`).filter({ hasText: ruleName });
    await expect(ruleRow).toBeVisible();
  });
});
