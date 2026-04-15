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
  'Serverless Observability Sidebar Structure',
  { tag: [...tags.serverless.observability.all] },
  () => {
    test('sidebar and footer contain expected navigation items', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.serverlessNav.goto();

      await test.step('sidenav is visible', async () => {
        await expect(pageObjects.serverlessNav.sidenav).toBeVisible();
      });

      await test.step('shows Discover', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemByDeepLinkId('discover')).toBeVisible();
      });

      await test.step('shows Dashboards', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemByDeepLinkId('dashboards')).toBeVisible();
      });

      await test.step('shows Workflows', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemByDeepLinkId('workflows')).toBeVisible();
      });

      await test.step('shows Alerts', async () => {
        await expect(
          pageObjects.collapsibleNav.getNavItemByDeepLinkId('observability-overview:alerts')
        ).toBeVisible();
      });

      await test.step('shows Add data in footer', async () => {
        await expect(
          pageObjects.collapsibleNav.getNavItemByDeepLinkId('observabilityOnboarding')
        ).toBeVisible();
      });

      await test.step('shows Developer tools in footer', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemById('devTools')).toBeVisible();
      });

      await test.step('shows Data management in footer', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemById('data_management')).toBeVisible();
      });

      await test.step('shows Admin and Settings in footer', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemById('admin_and_settings')).toBeVisible();
      });
    });

    test('More menu shows overflow navigation items', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.serverlessNav.goto();

      await test.step('open More menu', async () => {
        await pageObjects.collapsibleNav.openMoreMenu();
      });

      await test.step('shows Cases', async () => {
        await expect(
          pageObjects.collapsibleNav.getNavItemByDeepLinkId('observability-overview:cases')
        ).toBeVisible();
      });

      await test.step('shows SLOs', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemByDeepLinkId('slo')).toBeVisible();
      });

      await test.step('shows Streams', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemByDeepLinkId('streams')).toBeVisible();
      });

      await test.step('shows Applications panel', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemById('applications')).toBeVisible();
      });

      await test.step('shows Infrastructure panel', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemById('metrics')).toBeVisible();
      });

      await test.step('shows Other tools panel', async () => {
        await expect(pageObjects.collapsibleNav.getNavItemById('otherTools')).toBeVisible();
      });
    });
  }
);
