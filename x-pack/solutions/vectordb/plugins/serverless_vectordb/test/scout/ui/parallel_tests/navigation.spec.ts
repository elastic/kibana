/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { ONBOARDING_SEEN_STORAGE_KEY, VECTORDB_SPA_SHELL_TIMEOUT_MS } from '../fixtures/constants';

test.describe('Vector DB navigation', { tag: [...tags.serverless.vectordb] }, () => {
  test.beforeEach(async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    // Side nav is hidden until onboarding has been seen (public/plugin.ts)
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'true');
    }, ONBOARDING_SEEN_STORAGE_KEY);
    await pageObjects.vectordbNavigation.goto();
    await pageObjects.vectordbNavigation.waitForLoad();
  });

  test('renders expected body and footer nav items with working links', async ({ pageObjects }) => {
    const nav = pageObjects.vectordbNavigation;

    await test.step('primary body items are visible and linked', async () => {
      const primaryDeepLinks = ['discover', 'dashboards', 'agent_builder'];
      for (const deepLinkId of primaryDeepLinks) {
        const item = nav.navItemInPrimaryByDeepLinkId(deepLinkId);
        await expect(item).toBeVisible();
        await expect(item).toHaveAttribute('href', /.+/);
      }
    });

    await test.step('Data management panel opener is visible', async () => {
      await expect(nav.navItemInPrimaryById('data_management')).toBeVisible();
    });

    await test.step('footer items are visible', async () => {
      await expect(nav.navItemInFooterById('vectordb_getting_started')).toBeVisible();
      await expect(nav.navItemInFooterById('dev_tools')).toBeVisible();
      await expect(nav.navItemInFooterById('admin_and_settings')).toBeVisible();
    });
  });

  test('Getting started footer link opens the tutorials page', async ({ pageObjects, page }) => {
    const nav = pageObjects.vectordbNavigation;

    await nav.navItemInFooterById('vectordb_getting_started').click();

    await expect(pageObjects.vectordbTutorials.topicFilter).toBeVisible({
      timeout: VECTORDB_SPA_SHELL_TIMEOUT_MS,
    });
    await expect(page).toHaveURL(/\/app\/vectordb\/tutorials/);
  });

  test('Discover nav item navigates and becomes active', async ({ pageObjects }) => {
    const nav = pageObjects.vectordbNavigation;

    await nav.navItemInPrimaryByDeepLinkId('discover').click();

    await expect(nav.pageOrNoData('dscPage')).toBeVisible({
      timeout: VECTORDB_SPA_SHELL_TIMEOUT_MS,
    });
    await expect(nav.activeNavItemByDeepLinkId('discover')).toBeVisible({
      timeout: VECTORDB_SPA_SHELL_TIMEOUT_MS,
    });
  });
});
