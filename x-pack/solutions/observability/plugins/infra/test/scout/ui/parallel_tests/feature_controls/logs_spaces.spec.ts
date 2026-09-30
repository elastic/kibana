/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const SPACE_ALL_ENABLED = 'logs_spaces_all_enabled';
const SPACE_LOGS_DISABLED = 'logs_spaces_logs_disabled';

test.describe('Logs feature controls - spaces', { tag: tags.stateful.classic }, () => {
  const SPACE_IDS = [SPACE_ALL_ENABLED, SPACE_LOGS_DISABLED];

  test.beforeAll(async ({ apiServices }) => {
    // Defensively remove leftovers from a previously failed run before creating,
    // since `spaces.create` returns 409 for an existing id (delete ignores 404).
    await Promise.all(SPACE_IDS.map((id) => apiServices.spaces.delete(id)));
    await apiServices.spaces.create({ id: SPACE_ALL_ENABLED, disabledFeatures: [] });
    await apiServices.spaces.create({ id: SPACE_LOGS_DISABLED, disabledFeatures: ['logs'] });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.all(SPACE_IDS.map((id) => apiServices.spaces.delete(id)));
  });

  test('shows the Logs nav link when no features are disabled', async ({
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await featureControlsPage.gotoHome(SPACE_ALL_ENABLED);
    await collapsibleNav.expandNav();
    await expect(featureControlsPage.getNavLink('Logs')).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('is hidden and blocked when logs is disabled', async ({
    page,
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await test.step(`doesn't show the Logs nav link`, async () => {
      await featureControlsPage.gotoHome(SPACE_LOGS_DISABLED);
      await collapsibleNav.expandNav();
      await expect(featureControlsPage.getNavLink('Logs')).toBeHidden();
    });

    await test.step('renders the not-found page for the logs app', async () => {
      await featureControlsPage.gotoLogs(SPACE_LOGS_DISABLED);
      await expect(page.getByText('"statusCode":404')).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });
  });
});
