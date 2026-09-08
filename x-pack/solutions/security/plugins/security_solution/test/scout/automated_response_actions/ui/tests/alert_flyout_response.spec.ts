/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { tags, test } from '../fixtures';
import { seedAlertWithIsolateAction } from '../fixtures/seed_endpoint_response_actions';

const FLEET_SEED_TIMEOUT_MS = 300_000;

/**
 * Internal alert / Fleet index writes are not MKI-safe. Keep cloud serverless
 * off this spec (same constraint as Cypress `@skipInServerlessMKI`).
 */
const FLYOUT_TAGS = [
  ...tags.stateful.classic,
  ...tags.serverless.security.complete.filter((tag) => tag.startsWith('@local-')),
];

test.describe('Alert flyout Response section', { tag: FLYOUT_TAGS }, () => {
  let alertId: string;
  let cleanup: (() => Promise<void>) | undefined;

  test.beforeAll(async ({ esClient, kbnClient, log, config }) => {
    test.setTimeout(FLEET_SEED_TIMEOUT_MS);
    const seeded = await seedAlertWithIsolateAction({
      esClient,
      kbnClient,
      log,
      isServerless: Boolean(config.serverless),
    });
    alertId = seeded.alertId;
    cleanup = seeded.cleanup;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsSecurityRole('soc_manager');
  });

  test.afterAll(async () => {
    await cleanup?.();
  });

  test('shows isolate action status for the seeded alert', async ({ pageObjects }) => {
    test.setTimeout(FLEET_SEED_TIMEOUT_MS);
    await pageObjects.documentResponseFlyout.openForAlertId(alertId);
    await pageObjects.documentResponseFlyout.openResponseDetails();

    await expect(pageObjects.documentResponseFlyout.responseDetails).toBeVisible();
    await expect(pageObjects.documentResponseFlyout.responseActionsView).toBeVisible();
    await expect(pageObjects.documentResponseFlyout.responseDetails).toContainText(
      /isolate is pending|isolate completed successfully/
    );
  });
});
