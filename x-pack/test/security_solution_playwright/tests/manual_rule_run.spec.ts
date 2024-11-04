/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test } from '@playwright/test';
import { PageFactory } from '../page_objects/page_factory';
import { RuleDetailsPage } from '../page_objects/rule_details_page_po';
import { createRule, deleteAllRules } from '../api_utils/rules';
import { deleteAllSecurityDocuments } from '../api_utils/documents';
import { RuleManagementPage } from '../page_objects/rule_management_po';
import { createEsArchiver } from '../fixtures/es_archiver';

let ruleDetailsPage: RuleDetailsPage;
let ruleManagementPage: RuleManagementPage;

test.beforeAll(async () => {
  const esArchiver = await createEsArchiver();
  await esArchiver.loadIfNeeded('auditbeat_single');
});

test.describe('Manual rule run', { tag: ['@ess', '@serverless'] }, () => {
  test.use({ storageState: '.auth/user.json' });

  test.beforeEach(async ({ request }) => {
    await deleteAllRules(request);
    await deleteAllSecurityDocuments(request);
  });

  test('schedule from rule details page', async ({ request, page }) => {
    const { id: ruleId } = await createRule(request);

    ruleDetailsPage = await PageFactory.createRuleDetailsPage(page);

    await ruleDetailsPage.navigateTo(ruleId);
    await ruleDetailsPage.manualRuleRun();

    await expect(ruleDetailsPage.toaster).toHaveText(
      'Successfully scheduled manual run for 1 rule'
    );
  });

  test('schedule from rules management table', async ({ request, page }) => {
    await createRule(request);

    ruleManagementPage = await PageFactory.createRuleManagementPage(page);

    await ruleManagementPage.navigate();
    await ruleManagementPage.disableAutoRefresh();
    await ruleManagementPage.manuallyRunFirstRule();

    await expect(ruleManagementPage.toaster).toHaveText(
      'Successfully scheduled manual run for 1 rule'
    );
  });
});
