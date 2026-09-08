/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { tags, test } from '../fixtures';
import {
  MISSING_ENTITY_ID_FIELD_ERROR,
  seedAutomatedResponseActions,
} from '../fixtures/seed_automated_response_actions';

const FLEET_SEED_TIMEOUT_MS = 180_000;

/**
 * Internal alert / Fleet / action-index writes are not MKI-safe.
 * Cypress used `@ess` + `@serverless` without `@skipInServerlessMKI`, but
 * the live host path never ran in MKI. Keep cloud serverless off this spec.
 */
const SPEC_TAGS = [
  ...tags.stateful.classic,
  ...tags.serverless.security.complete.filter((tag) => tag.startsWith('@local-')),
];

test.describe('Automated response actions on an alert', { tag: SPEC_TAGS }, () => {
  let alertId: string;
  let cleanup: (() => Promise<void>) | undefined;

  test.beforeAll(async ({ esClient, kbnClient, log }) => {
    test.setTimeout(FLEET_SEED_TIMEOUT_MS);
    const seeded = await seedAutomatedResponseActions({
      esClient,
      kbnClient,
      log,
    });
    alertId = seeded.alertId;
    cleanup = seeded.cleanup;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsSecurityRole('endpoint_operations_analyst');
  });

  test.afterAll(async () => {
    await cleanup?.();
  });

  test('shows isolate, kill-process, and the missing-field error for the seeded alert', async ({
    pageObjects,
  }) => {
    test.setTimeout(FLEET_SEED_TIMEOUT_MS);
    await pageObjects.documentResponseFlyout.openForAlertId(alertId);
    await pageObjects.documentResponseFlyout.openResponseDetails();

    await expect(pageObjects.documentResponseFlyout.responseDetails).toBeVisible();
    await expect(pageObjects.documentResponseFlyout.responseActionsView).toBeVisible();
    await expect(pageObjects.documentResponseFlyout.responseDetails).toContainText(
      /isolate is pending|isolate completed successfully/
    );
    await expect(pageObjects.documentResponseFlyout.responseDetails).toContainText(
      /kill-process is pending|kill-process completed successfully/
    );
    await expect(pageObjects.documentResponseFlyout.responseDetails).toContainText(
      MISSING_ENTITY_ID_FIELD_ERROR
    );
  });
});
