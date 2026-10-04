/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { releaseHost } from '../fixtures/process_actions';
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
/** Includes up to 120s to release host isolation before the next spec SSHes in. */
const TEST_TIMEOUT_MS = 18 * 60 * 1000;

test.describe('Automated response actions', { tag: ['@local-stateful-classic'] }, () => {
  test.setTimeout(TEST_TIMEOUT_MS);

  let seededRule: SeededAutomatedResponseActionsRule | undefined;

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPlatformEngineer();
  });

  test.afterEach(async ({ kbnClient, esClient, enrolledEndpoint }) => {
    const rule = seededRule;
    seededRule = undefined;
    const failures: unknown[] = [];

    // Delete the rule before releasing the host. It matches process.name: "sleep"
    // and would isolate the VM again, and kill the next spec's sleep, if it is
    // still enabled while unisolate is in flight.
    if (rule) {
      try {
        await deleteSeededRule(kbnClient, rule.id);
      } catch (error) {
        failures.push(error);
      }

      try {
        await deleteAlertsForRule(esClient, rule.id);
      } catch (error) {
        failures.push(error);
      }
    }

    try {
      await releaseHost(kbnClient, enrolledEndpoint.agentId);
    } catch (error) {
      failures.push(error);
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, 'Failed to clean up the shared Endpoint host');
    }
  });

  test('shows isolate, kill-process, and failed suspend-process on the alert flyout', async ({
    pageObjects,
    kbnClient,
    apiServices,
    enrolledEndpoint,
  }) => {
    seededRule = await createEnabledRuleWithAutomatedResponseActions(
      kbnClient,
      enrolledEndpoint.agentId
    );
    await triggerMatchingProcessEvent(enrolledEndpoint.hostname);
    await apiServices.detectionAlerts.waitForAlerts(seededRule.name, 1, ALERT_TIMEOUT_MS);

    await pageObjects.alertsTablePage.navigate();
    await pageObjects.alertsTablePage.expandFirstAlertDetailsFlyout(
      seededRule.name,
      ALERT_TIMEOUT_MS
    );
    await pageObjects.documentFlyout.waitForAlertFlyout();
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
