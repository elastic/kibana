/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, tags, test } from '@kbn/scout-security';

test.describe('Security Solution Navigation', { tag: tags.ESS_ONLY }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.securityNavigation.gotoTimelines();
  });

  test('navigates through security solution pages', async ({ page, pageObjects }) => {
    await test.step('navigates to the Dashboards landing page', async () => {
      await pageObjects.securityNavigation.clickDashboards();
      await expect(pageObjects.securityNavigation.createDashboardButton).toBeVisible();
      expect(page.url()).toContain('/app/security/dashboards');
    });

    await test.step('navigates to the Overview page', async () => {
      await pageObjects.securityNavigation.clickOverview();
      await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
      expect(page.url()).toContain('/app/security/overview');
    });

    await test.step('navigates to the Detection & Response page', async () => {
      await pageObjects.securityNavigation.clickDetectionResponse();
      await expect(
        page.getByRole('heading', { name: 'Detection & Response', level: 1 })
      ).toBeVisible();
      expect(page.url()).toContain('/app/security/detection_response');
    });

    await test.step('navigates to the Entity Analytics page', async () => {
      await pageObjects.securityNavigation.clickEntityAnalytics();
      await expect(page.getByRole('heading', { name: 'Entity Analytics', level: 1 })).toBeVisible();
      expect(page.url()).toContain('/app/security/entity_analytics');
    });

    await test.step('navigates to the Alerts page', async () => {
      await pageObjects.securityNavigation.clickAlerts();
      await expect(page.getByRole('heading', { name: 'Alerts', level: 1 })).toBeVisible();
      expect(page.url()).toContain('/app/security/alerts');
    });

    await test.step('navigates to the Timelines page', async () => {
      await pageObjects.securityNavigation.clickTimelines();
      await expect(pageObjects.securityNavigation.timelinesTable).toBeVisible();
      expect(page.url()).toContain('/app/security/timelines');
    });

    await test.step('navigates to the Explore landing page', async () => {
      await pageObjects.securityNavigation.clickExplore();
      await expect(page.getByRole('heading', { name: 'Explore', level: 1 })).toBeVisible();
      expect(page.url()).toContain('/app/security/explore');
    });

    await test.step('navigates to the Hosts page', async () => {
      await pageObjects.securityNavigation.clickHosts();
      await expect(page.getByRole('heading', { name: 'Hosts', level: 1 })).toBeVisible();
      expect(page.url()).toContain('/app/security/hosts');
    });

    await test.step('navigates to the Network page', async () => {
      await pageObjects.securityNavigation.clickNetwork();
      await expect(page.getByRole('heading', { name: 'Network', level: 1 })).toBeVisible();
      expect(page.url()).toContain('/app/security/network');
    });

    await test.step('navigates to the Users page', async () => {
      await pageObjects.securityNavigation.clickUsers();
      await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
      expect(page.url()).toContain('/app/security/users');
    });

    await test.step('navigates to the Cases page', async () => {
      await pageObjects.securityNavigation.clickCases();
      await expect(pageObjects.securityNavigation.casesTable).toBeVisible();
      expect(page.url()).toContain('/app/security/cases');
    });
  });
});
