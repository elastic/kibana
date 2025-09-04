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
    await pageObjects.securityNavigation.goToTimelines();
  });

  test('navigates to the Dashboards landing page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickDashboards();
    expect(page.url()).toContain('/app/security/dashboards');
  });

  test('navigates to the Overview page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickOverview();
    expect(page.url()).toContain('/app/security/overview');
  });

  test('navigates to the Detection & Response page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickDetectionResponse();
    expect(page.url()).toContain('/app/security/detection_response');
  });

  test('navigates to the Entity Analytics page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickEntityAnalytics();
    expect(page.url()).toContain('/app/security/entity_analytics');
  });

  test('navigates to the Alerts page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickAlerts();
    expect(page.url()).toContain('/app/security/alerts');
  });

  test('navigates to the Timelines page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickTimelines();
    expect(page.url()).toContain('/app/security/timelines');
  });

  test('navigates to the Explore landing page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickExplore();
    expect(page.url()).toContain('/app/security/explore');
  });

  test('navigates to the Hosts page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickHosts();
    expect(page.url()).toContain('/app/security/hosts');
  });

  test('navigates to the Network page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickNetwork();
    expect(page.url()).toContain('/app/security/network');
  });

  test('navigates to the Users page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickUsers();
    expect(page.url()).toContain('/app/security/users');
  });

  test('navigates to the Cases page', async ({ page, pageObjects }) => {
    await pageObjects.securityNavigation.clickCases();
    expect(page.url()).toContain('/app/security/cases');
  });
});
