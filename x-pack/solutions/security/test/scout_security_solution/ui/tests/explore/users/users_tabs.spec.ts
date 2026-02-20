/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { loadEsArchive, unloadEsArchive } from '../../../common/es_helpers';
import { EXPLORE_ARCHIVES } from '../../../fixtures/page_objects';

test.describe(
  'Users stats and tables',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await loadEsArchive(esArchiver, EXPLORE_ARCHIVES.USERS);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.explore.gotoWithTimeRange(pageObjects.explore.EXPLORE_URLS.USERS_ALL);
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        await unloadEsArchive(esArchiver, EXPLORE_ARCHIVES.USERS);
      } catch {
        // best-effort cleanup
      }
    });

    test.describe('Users page tabs', () => {
      test('renders all users', async ({ pageObjects }) => {
        const totalUsers = 1;
        const subtitle = pageObjects.explore.allUsersTable.locator(
          pageObjects.explore.headerSubtitle
        ).first();
        await expect(subtitle).toHaveText(`Showing: ${totalUsers} user`);
      });

      test('renders all authentications', async ({ pageObjects }) => {
        const totalUsers = 1;
        await pageObjects.explore.clickAuthenticationsTab();
        await pageObjects.explore.authenticationsTable.first().waitFor({ state: 'visible', timeout: 15_000 });
        const subtitle = pageObjects.explore.authenticationsTable.locator(
          pageObjects.explore.headerSubtitle
        ).first();
        await expect(subtitle).toHaveText(`Showing: ${totalUsers} user`);
      });

      test('renders anomalies tab', async ({ pageObjects, page }) => {
        await pageObjects.explore.clickAnomaliesTab();
        const tabContent = page.testSubj.locator('user-anomalies-tab');
        await expect(tabContent.first()).toBeVisible({ timeout: 15_000 });
      });

      test('renders events tab', async ({ pageObjects, page }) => {
        await pageObjects.explore.clickEventsTab();
        const tabContent = page.testSubj.locator('events-viewer-panel');
        await expect(tabContent.first()).toBeVisible({ timeout: 15_000 });
      });

      test.skip('renders users risk tab', { tag: [...tags.stateful.classic] }, async ({
        pageObjects,
        page,
      }) => {
        await pageObjects.explore.clickUserRiskTab();
        const enableRiskButton = page.testSubj.locator('enable-risk-score');
        await expect(enableRiskButton.first()).toBeVisible();
      });
    });

    test.describe('User details tabs', () => {
      test('renders authentications tab', async ({ pageObjects }) => {
        await pageObjects.explore.gotoWithTimeRange(
          '/app/security/users/name/test/authentications'
        );
        const totalUsers = 1;
        const subtitle = pageObjects.explore.authenticationsTable.locator(
          pageObjects.explore.headerSubtitle
        ).first();
        await expect(subtitle).toHaveText(`Showing: ${totalUsers} host`);
      });
    });
  }
);
