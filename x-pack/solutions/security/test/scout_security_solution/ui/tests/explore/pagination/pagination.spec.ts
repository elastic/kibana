/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { loadEsArchive, unloadEsArchive } from '../../../common/es_helpers';
import { EXPLORE_ARCHIVES, EXPLORE_URLS } from '../../../fixtures/page_objects';

test.describe(
  'Pagination',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.describe('Host uncommon processes table', () => {
      test.beforeAll(async ({ esArchiver }) => {
        await loadEsArchive(esArchiver, EXPLORE_ARCHIVES.HOST_UNCOMMON_PROCESSES);
      });

      test.beforeEach(async ({ browserAuth, pageObjects }) => {
        await browserAuth.loginAsAdmin();
        await pageObjects.explore.gotoWithTimeRange(EXPLORE_URLS.HOSTS_UNCOMMON);
        await pageObjects.explore.uncommonProcessesTable
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });
      });

      test.afterAll(async ({ esArchiver }) => {
        try {
          await unloadEsArchive(esArchiver, EXPLORE_ARCHIVES.HOST_UNCOMMON_PROCESSES);
        } catch {
          // best-effort cleanup
        }
      });

      test('pagination updates results and page number', async ({ pageObjects }) => {
        await expect(
          pageObjects.explore.uncommonProcessesTable
            .locator(pageObjects.explore.tableFirstPage)
            .first()
        ).toHaveAttribute('aria-current', 'page');

        const firstPageProcess = await pageObjects.explore.processNameField.first().textContent();
        await pageObjects.explore.goToTablePage(2);
        await pageObjects.explore.uncommonProcessesTable
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });

        const secondPageProcess = await pageObjects.explore.processNameField.first().textContent();
        expect(firstPageProcess).not.toBe(secondPageProcess);

        await expect(
          pageObjects.explore.uncommonProcessesTable
            .locator(pageObjects.explore.tableFirstPage)
            .first()
        ).not.toHaveAttribute('aria-current', 'page');
        await expect(
          pageObjects.explore.uncommonProcessesTable
            .locator(pageObjects.explore.tableSecondPage)
            .first()
        ).toHaveAttribute('aria-current', 'page');
      });

      test('pagination keeps track of page results when tabs change', async ({
        pageObjects,
        page,
      }) => {
        await expect(
          pageObjects.explore.uncommonProcessesTable
            .locator(pageObjects.explore.tableFirstPage)
            .first()
        ).toHaveAttribute('aria-current', 'page');

        await pageObjects.explore.goToTablePage(2);
        await pageObjects.explore.uncommonProcessesTable
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });

        const expectedThirdPageResult = await pageObjects.explore.processNameField
          .first()
          .textContent();
        await pageObjects.explore.clickEventsTab();
        await page.testSubj
          .locator('events-viewer-panel')
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });
        await expect(pageObjects.explore.tableFirstPage.first()).toHaveAttribute(
          'aria-current',
          'page'
        );

        await pageObjects.explore.clickUncommonProcessesTab();
        await pageObjects.explore.uncommonProcessesTable
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });
        await expect(pageObjects.explore.tableSecondPage.first()).toHaveAttribute(
          'aria-current',
          'page'
        );
        const actualThirdPageResult = await pageObjects.explore.processNameField
          .first()
          .textContent();
        expect(expectedThirdPageResult).toBe(actualThirdPageResult);
      });

      test('pagination resets results and page number to first page when refresh is clicked', async ({
        pageObjects,
      }) => {
        await expect(
          pageObjects.explore.uncommonProcessesTable
            .locator(pageObjects.explore.tableFirstPage)
            .first()
        ).toHaveAttribute('aria-current', 'page');

        await pageObjects.explore.goToTablePage(2);
        await pageObjects.explore.uncommonProcessesTable
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });
        await expect(
          pageObjects.explore.uncommonProcessesTable
            .locator(pageObjects.explore.tableFirstPage)
            .first()
        ).not.toHaveAttribute('aria-current', 'page');

        await pageObjects.explore.refreshPage();
        await pageObjects.explore.uncommonProcessesTable
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });
        await expect(
          pageObjects.explore.uncommonProcessesTable
            .locator(pageObjects.explore.tableFirstPage)
            .first()
        ).toHaveAttribute('aria-current', 'page');
      });
    });

    test.describe('All users and all Hosts tables', () => {
      test.beforeAll(async ({ esArchiver }) => {
        await loadEsArchive(esArchiver, EXPLORE_ARCHIVES.ALL_USERS);
      });

      test.beforeEach(async ({ browserAuth }) => {
        await browserAuth.loginAsAdmin();
      });

      test.afterAll(async ({ esArchiver }) => {
        try {
          await unloadEsArchive(esArchiver, EXPLORE_ARCHIVES.ALL_USERS);
        } catch {
          // best-effort cleanup
        }
      });

      test('reset all Hosts pagination when sorting column', async ({ pageObjects }) => {
        await pageObjects.explore.gotoWithTimeRange(EXPLORE_URLS.HOSTS_ALL);
        await pageObjects.explore.allHostsTable
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });
        await pageObjects.explore.goToTablePage(2);
        await expect(
          pageObjects.explore.allHostsTable.locator(pageObjects.explore.tableFirstPage).first()
        ).not.toHaveAttribute('aria-current', 'page');

        await pageObjects.explore.sortFirstTableColumn();

        await expect(
          pageObjects.explore.allHostsTable.locator(pageObjects.explore.tableFirstPage).first()
        ).toHaveAttribute('aria-current', 'page');
      });

      test('reset all users pagination when sorting column', async ({ pageObjects }) => {
        await pageObjects.explore.gotoWithTimeRange(EXPLORE_URLS.USERS_ALL);
        await pageObjects.explore.allUsersTable
          .first()
          .waitFor({ state: 'visible', timeout: 15_000 });
        await pageObjects.explore.goToTablePage(2);
        await expect(
          pageObjects.explore.allUsersTable.locator(pageObjects.explore.tableFirstPage).first()
        ).not.toHaveAttribute('aria-current', 'page');

        await pageObjects.explore.sortFirstTableColumn();

        await expect(
          pageObjects.explore.allUsersTable.locator(pageObjects.explore.tableFirstPage).first()
        ).toHaveAttribute('aria-current', 'page');
      });
    });
  }
);
