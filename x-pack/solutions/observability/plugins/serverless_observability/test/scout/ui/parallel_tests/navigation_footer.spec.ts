/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe(
  'Serverless Observability Navigation - Footer',
  { tag: [...tags.serverless.observability.all] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();
    });

    test('renders expected footer items with working links', async ({ pageObjects }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Add data (observabilityOnboarding) is visible and linked', async () => {
        const item = nav.navItemInFooterByDeepLinkId('observabilityOnboarding');
        await expect(item).toBeVisible();
        await nav.expectNavItemHasHref(item);
      });

      await test.step('Developer tools is visible and linked', async () => {
        const item = nav.navItemInFooterById('devTools');
        await expect(item).toBeVisible();
        await nav.expectNavItemHasHref(item);
      });

      await test.step('Data management panel opener is visible', async () => {
        await expect(nav.navItemInFooterById('data_management')).toBeVisible();
      });

      await test.step('Admin and Settings panel opener is visible', async () => {
        await expect(nav.navItemInFooterById('admin_and_settings')).toBeVisible();
      });
    });

    test('clicking footer items navigates to the correct destinations', async ({
      pageObjects,
      page,
    }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Add data navigates to onboarding home', async () => {
        await nav.expectNavItemNavigatesTo(
          nav.navItemInFooterByDeepLinkId('observabilityOnboarding'),
          page.testSubj.locator('obltOnboardingHomeTitle')
        );
      });

      await test.step('Developer tools navigates to the console app', async () => {
        await nav.goto();
        await nav.expectNavItemNavigatesTo(
          nav.navItemInFooterById('devTools'),
          page.testSubj.locator('console')
        );
      });

      await test.step('Data management opens its side panel', async () => {
        await nav.goto();
        await nav.navItemInFooterById('data_management').click();
        await expect(
          page.testSubj.locator('~kbnChromeNav-sidePanel_data_management')
        ).toBeVisible();
      });

      await test.step('Admin and Settings opens its side panel', async () => {
        await nav.goto();
        await nav.navItemInFooterById('admin_and_settings').click();
        await expect(
          page.testSubj.locator('~kbnChromeNav-sidePanel_admin_and_settings')
        ).toBeVisible();
      });

      await test.step('Management landing renders cards navigation', async () => {
        await page.gotoApp('management');
        await expect(page.testSubj.locator('cards-navigation-page')).toBeVisible();
      });
    });
  }
);
