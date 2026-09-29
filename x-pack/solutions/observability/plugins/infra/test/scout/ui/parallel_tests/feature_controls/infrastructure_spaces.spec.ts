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

const SPACE_ALL_ENABLED = 'infra_spaces_all_enabled';
const SPACE_INFRA_DISABLED = 'infra_spaces_infra_disabled';
const SPACE_LOGS_DISABLED = 'infra_spaces_logs_disabled';
const SPACE_APM_DISABLED = 'infra_spaces_apm_disabled';

test.describe('Infrastructure feature controls - spaces', { tag: tags.stateful.classic }, () => {
  const SPACE_IDS = [
    SPACE_ALL_ENABLED,
    SPACE_INFRA_DISABLED,
    SPACE_LOGS_DISABLED,
    SPACE_APM_DISABLED,
  ];

  test.beforeAll(async ({ apiServices }) => {
    // Defensively remove leftovers from a previously failed run before creating,
    // since `spaces.create` returns 409 for an existing id (delete ignores 404).
    await Promise.all(SPACE_IDS.map((id) => apiServices.spaces.delete(id)));
    await apiServices.spaces.create({ id: SPACE_ALL_ENABLED, disabledFeatures: [] });
    await apiServices.spaces.create({
      id: SPACE_INFRA_DISABLED,
      disabledFeatures: ['infrastructure'],
    });
    await apiServices.spaces.create({ id: SPACE_LOGS_DISABLED, disabledFeatures: ['logs'] });
    await apiServices.spaces.create({ id: SPACE_APM_DISABLED, disabledFeatures: ['apm'] });
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { featureControlsPage } }) => {
    await featureControlsPage.forceInfraNoData();
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await Promise.all(SPACE_IDS.map((id) => apiServices.spaces.delete(id)));
  });

  test('is available when no features are disabled', async ({
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await test.step('shows the Infrastructure nav link', async () => {
      await featureControlsPage.gotoHome(SPACE_ALL_ENABLED);
      await collapsibleNav.expandNav();
      await expect(featureControlsPage.getNavLink('Infrastructure')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });

    await test.step('can access the Infrastructure app', async () => {
      await featureControlsPage.gotoInfrastructure(SPACE_ALL_ENABLED);
      await expect(featureControlsPage.infraNoDataPage).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });
  });

  test('is hidden and blocked when infrastructure is disabled', async ({
    page,
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await test.step(`doesn't show the Infrastructure nav link`, async () => {
      await featureControlsPage.gotoHome(SPACE_INFRA_DISABLED);
      await collapsibleNav.expandNav();
      await expect(featureControlsPage.getNavLink('Infrastructure')).toBeHidden();
    });

    await test.step('renders the not-found page for the metrics app', async () => {
      await featureControlsPage.gotoInfrastructure(SPACE_INFRA_DISABLED);
      await expect(page.getByText('"statusCode":404')).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });
  });

  test('remains accessible when an unrelated feature is disabled', async ({
    pageObjects: { featureControlsPage },
  }) => {
    await test.step('can access the Infrastructure app when logs is disabled', async () => {
      await featureControlsPage.gotoInfrastructure(SPACE_LOGS_DISABLED);
      await expect(featureControlsPage.infraNoDataPage).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });

    await test.step('can access the Infrastructure app when apm is disabled', async () => {
      await featureControlsPage.gotoInfrastructure(SPACE_APM_DISABLED);
      await expect(featureControlsPage.infraNoDataPage).toBeVisible({ timeout: EXTENDED_TIMEOUT });
    });
  });
});
