/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import { test, expect } from '@kbn/scout-oblt';
import { getDisposableRule, LogsEspecialist } from './helpers';


test.describe('Rules - Rules Table - Logs Especialist', { tag: ['@ess', '@svlOblt'] }, () => {
    test.beforeAll(async ({ samlAuth }) => {
        await LogsEspecialist.setUp(samlAuth);
    });
    test.beforeEach(async ({ browserAuth, samlAuth }) => {
        await browserAuth.loginAs(samlAuth.customRoleName);
    });

    test('shows the rules table', async ({ page, kbnUrl, apiServices }) => {
        // ToDo: fix eslint error or move to beforeEach/afterEach
        await using disposableRule = await getDisposableRule(apiServices);
        const ruleName = disposableRule.instance.data.name;

        await page.goto(kbnUrl.get('/app/observability/alerts/rules'));
        await expect(page.getByTestId('rulesList')).toBeVisible();
        await expect(page.getByText(ruleName)).toBeVisible();
    });

    test('rules are editable', async ({ page, kbnUrl, apiServices }) => {
        await using disposableRule = await getDisposableRule(apiServices);
        const ruleName = disposableRule.instance.data.name;

        await page.goto(kbnUrl.get('/app/observability/alerts/rules'));
        const ruleRow = page.getByTestId(`rule-row`).filter({ hasText: ruleName });
        await expect(ruleRow).toBeVisible();
    });
});
