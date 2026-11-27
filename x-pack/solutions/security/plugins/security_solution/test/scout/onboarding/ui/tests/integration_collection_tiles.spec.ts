/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { test, tags } from '../fixtures';

// `nginx` is one of Fleet's static collection groups (`INTEGRATION_GROUPS`): two packages that
// share it, as the registry serves them, collapse into a single collection tile.
const GROUP_ID = 'nginx';

const mockPackage = (name: string, title: string, group?: string) => ({
  id: name,
  name,
  title,
  version: '1.0.0',
  description: `${title} description`,
  type: 'integration',
  categories: ['web'],
  icons: [],
  status: 'not_installed',
  format_version: '3.0.0',
  path: `/package/${name}/1.0.0`,
  download: `/epr/${name}/${name}-1.0.0.zip`,
  policy_templates: [],
  data_streams: [],
  ...(group ? { group } : {}),
});

// Synthetic package list, so the test does not depend on which packages (or which `group`s) the
// package registry of the environment ships.
const MOCK_PACKAGES = {
  items: [
    mockPackage('scout_nginx', 'Scout Nginx', GROUP_ID),
    mockPackage('scout_nginx_otel', 'Scout Nginx OTel', GROUP_ID),
    mockPackage('scout_standalone', 'Scout Standalone'),
  ],
};

test.describe(
  'Get started: integration collection tiles',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ page, browserAuth, pageObjects }) => {
      await page.route(
        (url) => url.pathname.endsWith('/api/fleet/epm/packages'),
        (route) => route.fulfill({ status: 200, json: MOCK_PACKAGES })
      );
      await browserAuth.loginAsPlatformEngineer();
      await pageObjects.onboardingPage.gotoIntegrationsCard();
      // The environment ships other custom integrations and the grid renders its tiles in pages:
      // search so only the packages mocked here are listed.
      await pageObjects.onboardingPage.searchIntegrations('scout');
    });

    test('groups packages that share a group into one collection tile', async ({ pageObjects }) => {
      const { onboardingPage } = pageObjects;

      await expect(onboardingPage.collectionCard(GROUP_ID)).toContainText('2 variants');
      // The members only appear in the chooser, not as tiles of their own.
      await expect(onboardingPage.integrationCard('scout_nginx')).toBeHidden();
      await expect(onboardingPage.integrationCard('scout_nginx_otel')).toBeHidden();
      // A package without a group stays a regular tile.
      await expect(onboardingPage.integrationCard('scout_standalone')).toBeVisible();
    });

    test('opens the chooser and lands on the picked variant with the Security return target', async ({
      page,
      pageObjects,
    }) => {
      const { onboardingPage } = pageObjects;

      await onboardingPage.collectionCard(GROUP_ID).click();
      await expect(onboardingPage.collectionFlyout).toBeVisible();
      await expect(onboardingPage.collectionVariantRow('scout_nginx')).toBeVisible();

      await onboardingPage.collectionVariantRow('scout_nginx_otel').click();

      // The variant opens inside the integrations app, with the host's return target in the URL.
      // The cancel/save route state handed to the add-integration page is covered by the
      // `PackageListGrid` Jest test.
      await expect(page).toHaveURL(/\/app\/integrations\/detail\/scout_nginx_otel-1\.0\.0\//);
      const { searchParams } = new URL(page.url());
      expect(searchParams.get('returnAppId')).toBe('securitySolutionUI');
      expect(searchParams.get('returnPath')).toBe('/get_started');
    });
  }
);
