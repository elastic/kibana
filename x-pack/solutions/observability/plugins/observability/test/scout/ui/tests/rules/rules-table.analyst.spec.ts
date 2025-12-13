/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import { test, expect } from '@kbn/scout-oblt';
import { Analyst, getDisposableRule } from './helpers';


test.describe('Rules - Rules Table - Analyst (Read Only)', { tag: ['@ess', '@svlOblt'] }, () => {


    test.beforeEach(async ({ browserAuth }) => {
        await Analyst.setUp(browserAuth);
    });

    test('shows the rules table', async ({ page, kbnUrl, apiServices }) => {
        // ToDo: fix eslint error or move to beforeEach/afterEach
        await using disposableRule = await getDisposableRule(apiServices);
        const ruleName = disposableRule.instance.data.name;

        await page.goto(kbnUrl.get('/app/observability/alerts/rules'));
        await expect(page.getByTestId('rulesList')).toBeVisible();
        await expect(page.getByText(ruleName)).toBeVisible();
    });

    test('rules are not editable', async ({ page, kbnUrl, apiServices }) => {
        await using disposableRule = await getDisposableRule(apiServices);
        const ruleName = disposableRule.instance.data.name;

        await page.goto(kbnUrl.get('/app/observability/alerts/rules'));
        const ruleRow = page.getByTestId(`rule-row-isNotEditable`).filter({ hasText: ruleName });
        await expect(ruleRow).toBeVisible();
    });
});
