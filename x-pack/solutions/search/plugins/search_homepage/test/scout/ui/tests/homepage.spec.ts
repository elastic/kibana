/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';

test.describe('Homepage', { tag: ['@svlSearch'] }, () => {
  test('Viewer should not be able to see manage button', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.homepage.skipGettingStarted();

    const headerLeftGroup = await pageObjects.homepage.getHeaderLeftGroup();

    await expect(headerLeftGroup).toContainText('Welcome, test viewer');
    await expect(headerLeftGroup).not.toContainText('Manage');
  });

  test('Admin should see the manage button', async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.homepage.skipGettingStarted();

    const headerLeftGroup = await pageObjects.homepage.getHeaderLeftGroup();

    await expect(headerLeftGroup).toContainText('Welcome, test admin');
    const manageLink = await pageObjects.homepage.getManageLink();
    await expect(manageLink).toBeEnabled();
  });

  test('Navigation cards should navigate to correct places', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.homepage.skipGettingStarted();

    const navigationCards = await pageObjects.homepage.getNavigationCards();
    await expect(navigationCards).toHaveCount(5);

    const navCardTests = [
      {
        cardTestId: 'searchHomepageNavLinks-discover',
        expectedUrl: 'discover',
      },
      {
        cardTestId: 'searchHomepageNavLinks-dashboards',
        expectedUrl: 'dashboards',
      },
      {
        cardTestId: 'searchHomepageNavLinks-agentBuilder',
        expectedUrl: 'agent_builder',
      },
      {
        cardTestId: 'searchHomepageNavLinks-machineLearning',
        expectedUrl: 'ml/overview',
      },
      {
        cardTestId: 'searchHomepageNavLinks-dataManagement',
        expectedUrl: 'index_management',
      },
    ];

    for (const { cardTestId, expectedUrl } of navCardTests) {
      await pageObjects.homepage.clickNavigationCard(cardTestId);
      await expect(page).toHaveURL(new RegExp(expectedUrl));
      await pageObjects.homepage.goto();
    }
  });

  test('Get started banner should move user back to getting started', async ({
    pageObjects,
    browserAuth,
    page,
  }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.homepage.skipGettingStarted();

    await pageObjects.homepage.clickGettingStartedButton();

    await expect(page).toHaveURL(new RegExp('getting_started'));
  });

  test('Cloud resources cards should have billing and autoops', async ({
    pageObjects,
    browserAuth,
    esClient,
  }) => {
    const EXPECTED_BILLING_URL = 'https://fake-cloud.elastic.co/billing/overview/';
    const EXPECTED_AUTOOPS_URL = 'https://cloud.elastic.co';

    await esClient.security.putRoleMapping({
      name: 'cloud-billing-admin',
      roles: ['superuser', '_ec_billing_admin'],
      enabled: true,
      rules: { field: { 'realm.name': 'cloud-saml-kibana' } },
    });

    await browserAuth.loginAsAdmin();
    await pageObjects.homepage.skipGettingStarted();

    const cloudResourceCards = await pageObjects.homepage.getCloudResourceCards();
    await expect(cloudResourceCards).toHaveCount(2);

    const cloudResourceLinks = [
      { cardId: 'cloudResourceCard-billing', expectedLink: EXPECTED_BILLING_URL },
      { cardId: 'cloudResourceCard-autoops', expectedLink: EXPECTED_AUTOOPS_URL },
    ];

    for (const { cardId, expectedLink } of cloudResourceLinks) {
      await expect(await pageObjects.homepage.getCloudResourceCardLink(cardId)).toHaveAttribute(
        'href',
        expectedLink
      );
    }

    // Clean up role mapping
    await esClient.security.deleteRoleMapping({ name: 'cloud-billing-admin' });
  });
});
