/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-search';
import { expect } from '@kbn/scout-search/ui';
import { test } from '../fixtures';

test.describe(
  'Getting Started - Admin: Serverless search',
  { tag: [...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.gettingStarted.goto();
    });

    test(
      'should show Changelog label in Kibana version on serverless',
      { tag: [...tags.serverless.search] },
      async ({ pageObjects }) => {
        const versionBadge = await pageObjects.gettingStarted.getKibanaVersionBadge();
        await expect(versionBadge).toContainText('Changelog');
      }
    );

    test('Top navigation renders correctly', async ({ pageObjects }) => {
      await test.step('renders top nav section', async () => {
        const topNav = await pageObjects.gettingStarted.getTopNav();
        await expect(topNav).toBeVisible();
      });

      await test.step('renders ask expert link with correct href', async () => {
        const askExpertLink = await pageObjects.gettingStarted.getAskExpertLink();
        await expect(askExpertLink).toBeVisible();
        await expect(askExpertLink).toHaveAttribute('href', /.+/);
      });

      await test.step('renders Elastic Cloud link', async () => {
        const cloudHomeLink = await pageObjects.gettingStarted.getCloudHomeLink();
        await expect(cloudHomeLink).toBeVisible();
        await expect(cloudHomeLink).toHaveAttribute('href', /cloud\.elastic\.co/);
      });
    });

    test('Top navigation links respond to screen size', async ({ pageObjects, page }) => {
      await test.step('shows Usage, Organization and Manage subscription links on large screens', async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await pageObjects.gettingStarted.goto();

        const usageLink = await pageObjects.gettingStarted.getCloudUsageLink();
        await expect(usageLink).toBeVisible();
        await expect(usageLink).toHaveAttribute('href', /billing\/usage/);

        const orgLink = await pageObjects.gettingStarted.getCloudOrganizationLink();
        await expect(orgLink).toBeVisible();
        await expect(orgLink).toHaveAttribute('href', /account\/members/);

        const manageSubscriptionLink = await pageObjects.gettingStarted.getManageSubscriptionLink();
        await expect(manageSubscriptionLink).toBeVisible();
        await expect(manageSubscriptionLink).toHaveAttribute('href', /billing\/overview/);
      });

      await test.step('hides Usage, Organization and Manage subscription links on small screens', async () => {
        await page.setViewportSize({ width: 768, height: 900 });
        await pageObjects.gettingStarted.goto();

        const usageLink = await pageObjects.gettingStarted.getCloudUsageLink();
        await expect(usageLink).toBeHidden();

        const orgLink = await pageObjects.gettingStarted.getCloudOrganizationLink();
        await expect(orgLink).toBeHidden();

        const manageSubscriptionLink = await pageObjects.gettingStarted.getManageSubscriptionLink();
        await expect(manageSubscriptionLink).toBeHidden();
      });

      await test.step('hides ask expert link on extra small screens', async () => {
        await page.setViewportSize({ width: 375, height: 812 });
        await pageObjects.gettingStarted.goto();

        const askExpertLink = await pageObjects.gettingStarted.getAskExpertLink();
        await expect(askExpertLink).toBeHidden();
      });
    });
  }
);
