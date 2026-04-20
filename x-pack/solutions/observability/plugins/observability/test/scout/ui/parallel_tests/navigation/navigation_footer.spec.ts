/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { spaceTest as test } from '../../fixtures';

// The new chrome navigation is only rendered in stateful when the space uses
// the 'oblt' solution view. We use `spaceTest` to get an isolated space per
// worker and flip it to 'oblt' before any test runs.
test.describe(
  'Stateful Observability Navigation - Footer',
  { tag: [...tags.stateful.classic, ...tags.stateful.observability] },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.setSolutionView('oblt');
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();
    });

    test('renders expected footer items with working links', async ({ pageObjects }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Add data or Ingest Hub entry is visible and linked', async () => {
        const addData = nav.navItemInFooterByDeepLinkId('observabilityOnboarding');
        const ingestHub = nav.navItemInFooterByDeepLinkId('ingestHub');
        const item = addData.or(ingestHub);
        await expect(item).toBeVisible();
        await expect(item).toHaveAttribute('href', /.+/);
      });

      await test.step('Developer tools is visible and linked', async () => {
        const item = nav.navItemInFooterById('devTools');
        await expect(item).toBeVisible();
        await expect(item).toHaveAttribute('href', /.+/);
      });

      await test.step('Data management panel opener is visible', async () => {
        await expect(nav.navItemInFooterById('data_management')).toBeVisible();
      });

      await test.step('Stack Management panel opener is visible', async () => {
        await expect(nav.navItemInFooterById('stack_management')).toBeVisible();
      });
    });

    test('clicking footer items navigates to the correct destinations', async ({
      pageObjects,
      page,
    }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Developer tools navigates to the console app', async () => {
        await nav.navItemInFooterById('devTools').click();
        await expect(page.testSubj.locator('console')).toBeVisible();
      });

      await test.step('Data management opens its side panel', async () => {
        await nav.goto();
        await nav.navItemInFooterById('data_management').click();
        await expect(
          page.testSubj.locator('~kbnChromeNav-sidePanel_data_management')
        ).toBeVisible();
      });

      await test.step('Stack Management opens its side panel', async () => {
        await nav.goto();
        await nav.navItemInFooterById('stack_management').click();
        await expect(
          page.testSubj.locator('~kbnChromeNav-sidePanel_stack_management')
        ).toBeVisible();
      });
    });
  }
);
