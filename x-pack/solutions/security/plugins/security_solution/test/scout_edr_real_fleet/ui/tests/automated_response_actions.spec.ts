/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { createEnabledRuleWithAutomatedResponseActions } from '../fixtures/seed_rule';
import { tags, test } from '../fixtures';

const ALERT_TIMEOUT_MS = 180_000;
const RESPONSE_STATUS_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 15 * 60 * 1000;

test.describe('Automated response actions', { tag: tags.stateful.classic }, () => {
  test.setTimeout(TEST_TIMEOUT_MS);

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPlatformEngineer();
  });

  test.afterEach(async ({ apiServices }) => {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionAlerts.deleteAll();
  });

  test('shows isolate, kill-process, and failed suspend-process on the alert flyout', async ({
    pageObjects,
    kbnClient,
    enrolledEndpoint,
  }) => {
    const { name: ruleName } = await createEnabledRuleWithAutomatedResponseActions(
      kbnClient,
      enrolledEndpoint.agentId
    );

    await pageObjects.alertsTablePage.navigate();
    await expect(
      pageObjects.alertsTablePage.alertsTable.getByTestId('ruleName').filter({ hasText: ruleName })
    ).toBeVisible({ timeout: ALERT_TIMEOUT_MS });

    await pageObjects.alertsTablePage.expandAlertDetailsFlyout(ruleName);
    await pageObjects.alertResponse.openResponseDetails();

    await expect(pageObjects.alertResponse.details).toContainText(
      /isolate is pending|isolate completed successfully/,
      { timeout: RESPONSE_STATUS_TIMEOUT_MS }
    );
    await expect(pageObjects.alertResponse.details).toContainText(
      /kill-process is pending|kill-process completed successfully/,
      { timeout: RESPONSE_STATUS_TIMEOUT_MS }
    );
    await expect(pageObjects.alertResponse.details).toContainText(
      'The action was called with a non-existing event field name: entity_id',
      { timeout: RESPONSE_STATUS_TIMEOUT_MS }
    );
  });
});
