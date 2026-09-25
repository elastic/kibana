/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import {
  createEnabledRuleWithAutomatedResponseActions,
  deleteAlertsForRule,
  deleteSeededRule,
  triggerMatchingProcessEvent,
  type SeededAutomatedResponseActionsRule,
} from '../fixtures/seed_rule';
import { test } from '../fixtures';

const ALERT_TIMEOUT_MS = 180_000;
const RESPONSE_STATUS_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 15 * 60 * 1000;

test.describe('Automated response actions', { tag: ['@local-stateful-classic'] }, () => {
  test.setTimeout(TEST_TIMEOUT_MS);

  let seededRule: SeededAutomatedResponseActionsRule | undefined;

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPlatformEngineer();
  });

  test.afterEach(async ({ kbnClient, esClient }) => {
    const rule = seededRule;
    seededRule = undefined;
    if (!rule) {
      return;
    }

    await deleteSeededRule(kbnClient, rule.id);
    await deleteAlertsForRule(esClient, rule.id);
  });

  test('shows isolate, kill-process, and failed suspend-process on the alert flyout', async ({
    pageObjects,
    kbnClient,
    enrolledEndpoint,
  }) => {
    seededRule = await createEnabledRuleWithAutomatedResponseActions(
      kbnClient,
      enrolledEndpoint.agentId
    );
    await triggerMatchingProcessEvent(enrolledEndpoint.hostname);

    await pageObjects.alertsTablePage.navigate();
    await pageObjects.alertsTablePage.expandFirstAlertDetailsFlyout(
      seededRule.name,
      ALERT_TIMEOUT_MS
    );
    await pageObjects.alertResponse.openResponseDetails();

    // Cypress parity: isolate/kill-process can still be pending when the flyout opens.
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
