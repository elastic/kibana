/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteAlertsAndRules } from '../../../common/api_helpers';
import { createRuleFromParams, type CreateRuleResponse } from '../../../common/rule_api_helpers';
import { getNewRule } from '../../../common/rule_objects';

test.describe(
  'Fill all rule gaps',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.security.complete],
  },
  () => {
    let ruleResponse: CreateRuleResponse;

    test.beforeEach(async ({ browserAuth, apiServices, kbnClient }) => {
      await browserAuth.loginAsAdmin();
      await deleteAlertsAndRules(apiServices);
      ruleResponse = await createRuleFromParams(
        kbnClient,
        getNewRule({ rule_id: '1', name: 'Rule 1', enabled: true, interval: '1m', from: 'now-1m' })
      );
    });

    test('schedule gap fills for an enabled rule from rule details', async ({
      page,
      pageObjects,
    }) => {
      const { ruleDetails } = pageObjects;
      const fillAllGapsButton = page.testSubj.locator('ruleFillAllGaps');
      const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');

      await test.step('Navigate to rule details execution log', async () => {
        await ruleDetails.goto(ruleResponse.id);
        await ruleDetails.goToExecutionLogTab();
      });

      await test.step('Click fill all gaps and confirm', async () => {
        await fillAllGapsButton.click();
        await confirmBtn.click();
      });

      await test.step('Verify success toast', async () => {
        await expect(page.testSubj.locator('globalToastList')).toContainText(
          'scheduled gap fills for 1 rule'
        );
      });
    });

    test('handle the case when the rule is disabled', async ({ page, pageObjects }) => {
      const { ruleDetails } = pageObjects;
      const fillAllGapsButton = page.testSubj.locator('ruleFillAllGaps');

      await test.step('Navigate to rule details execution log', async () => {
        await ruleDetails.goto(ruleResponse.id);
        await ruleDetails.goToExecutionLogTab();
      });

      await test.step('Disable the rule', async () => {
        await ruleDetails.clickEnableRuleSwitch();
        const ruleSwitch = page.testSubj.locator('ruleSwitch');
        await expect(ruleSwitch).not.toBeChecked();
      });

      await test.step('Attempt to fill gaps and see reject modal', async () => {
        await fillAllGapsButton.click();
        const rejectModal = page.testSubj.locator('bulkActionRejectModal');
        await expect(rejectModal).toBeVisible();
        await expect(rejectModal).toContainText('Unable to schedule gap fills for a disabled rule');

        const closeBtn = rejectModal.locator('[data-test-subj="confirmModalConfirmButton"]');
        await closeBtn.click();
      });
    });

    test('handle gap fills result when no gaps detected', async ({ page, pageObjects }) => {
      const { ruleDetails } = pageObjects;
      const fillAllGapsButton = page.testSubj.locator('ruleFillAllGaps');
      const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');

      await ruleDetails.goto(ruleResponse.id);
      await ruleDetails.goToExecutionLogTab();

      await fillAllGapsButton.click();
      await confirmBtn.click();

      const toastList = page.testSubj.locator('globalToastList');
      await expect(toastList).toContainText(/scheduled gap fills|No gaps were detected/);
    });
  }
);
