/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadAttackDiscoveryData } from '@kbn/security-solution-plugin/scripts/assistant/attack_discovery/load';
import { test, expect } from '../../fixtures';

test.describe('Attack discovery', () => {
  test.beforeAll(async ({ stackServices, connectors }) => {
    if (!connectors) {
      test.skip('No connectors found');
    }

    await loadAttackDiscoveryData({
      kbnClient: stackServices.kbnClient,
      esClient: stackServices.esClient,
      log: stackServices.log,
    });
  });

  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(1000000);
    await page.goto('/app/security/attack_discovery');
  });

  test('it works', async ({ page, connectors }) => {
    for (const connector of connectors) {
      await test.step(`${connector.name} connector is present`, async () => {
        await page.getByTestId('connectorSelectorPlaceholderButton').click();
        await page.getByTestId(`${connector.id}`).click();
        await page.getByTestId('generate').first().click();
        await expect(page.getByTestId('attackDiscoveryGenerationInProgress')).toBeVisible();
        await expect(page.getByTestId('attackDiscoveryGenerationInProgress')).not.toBeVisible({
          timeout: 600000,
        });
        for (const locator of await page.getByTestId('entityButton').all()) {
          await expect(locator).not.toHaveText('{');
        }
      });
    }
  });
});
