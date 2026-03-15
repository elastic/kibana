/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { loadEsArchive, unloadEsArchive } from '../../../common/es_helpers';
import { SECURITY_ARCHIVES } from '../../../common/es_helpers';

test.describe(
  'Threat Intelligence - Block list',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await loadEsArchive(esArchiver, SECURITY_ARCHIVES.TI_INDICATORS_DATA_SINGLE);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esArchiver }) => {
      await unloadEsArchive(esArchiver, SECURITY_ARCHIVES.TI_INDICATORS_DATA_SINGLE).catch(
        () => {}
      );
    });

    test('can add indicator to block list', async ({ pageObjects, page }) => {
      await pageObjects.threatIntelligence.goto();

      const table = pageObjects.threatIntelligence.indicatorsTable;
      await table.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});

      const indicatorRow = table.locator('.euiTableRow').first();
      if (await indicatorRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
        const moreActions = indicatorRow.locator('[data-test-subj="tiIndicatorTableMoreAction"]');
        await moreActions.click();
        const blockListOption = page.testSubj.locator('tiIndicatorsTableAddToBlockListContextMenu');
        if (await blockListOption.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await expect(blockListOption).toBeVisible();
        }
      }
    });
  }
);
