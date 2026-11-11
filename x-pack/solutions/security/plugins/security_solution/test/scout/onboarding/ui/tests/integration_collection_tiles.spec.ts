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
const COLLECTION_CARD = `integration-card:collection:${GROUP_ID}`;
// `OnboardingCardId.integrations`, the "Add data with integrations" card of Get started.
const INTEGRATIONS_CARD_ID = 'integrations';

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
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ page, browserAuth }) => {
      await page.route(
        (url) => url.pathname.endsWith('/api/fleet/epm/packages'),
        (route) => route.fulfill({ status: 200, json: MOCK_PACKAGES })
      );
      await browserAuth.loginAsAdmin();
    });

    test('groups packages that share a group into one collection tile', async ({ page }) => {
      // The card id in the hash makes the Security onboarding expand the integrations card.
      await page.gotoApp('security/get_started', { hash: INTEGRATIONS_CARD_ID });
      await page.testSubj.click('securitySolutionIntegrationsTab-all');
      // The grid loads tiles in pages as the user scrolls, and the environment ships other custom
      // integrations: search so only the packages mocked here are listed.
      await page.testSubj.fill('epmList.searchBar', 'scout');

      await expect(page.testSubj.locator(COLLECTION_CARD)).toContainText('2 variants');
      // The members only appear in the chooser, not as tiles of their own.
      await expect(page.testSubj.locator('integration-card:epr:scout_nginx')).toBeHidden();
      await expect(page.testSubj.locator('integration-card:epr:scout_nginx_otel')).toBeHidden();
      // A package without a group stays a regular tile.
      await expect(page.testSubj.locator('integration-card:epr:scout_standalone')).toBeVisible();
    });

    test('opens the chooser and hands the Security return target to the picked variant', async ({
      page,
    }) => {
      // The card id in the hash makes the Security onboarding expand the integrations card.
      await page.gotoApp('security/get_started', { hash: INTEGRATIONS_CARD_ID });
      await page.testSubj.click('securitySolutionIntegrationsTab-all');

      await page.testSubj.locator(COLLECTION_CARD).click();
      await expect(page.testSubj.locator('collectionFlyout')).toBeVisible();
      await expect(page.testSubj.locator('collectionVariantRow-epr:scout_nginx')).toBeVisible();

      await page.testSubj.click('collectionVariantRow-epr:scout_nginx_otel');

      // The variant opens inside the integrations app, with the host's return target in the URL...
      await expect(page).toHaveURL(/\/app\/integrations\/detail\/scout_nginx_otel-1\.0\.0\//);
      const { searchParams } = new URL(page.url());
      expect(searchParams.get('returnAppId')).toBe('securitySolutionUI');
      expect(searchParams.get('returnPath')).toBe('/get_started');

      // ...and in the route state, which is what the add-integration page reads for Cancel and
      // Save (Save does not read the query params).
      const routeState = await page.evaluate(() => window.history.state?.state);
      expect(routeState).toMatchObject({
        onCancelNavigateTo: ['securitySolutionUI', { path: '/get_started' }],
        onSaveNavigateTo: ['securitySolutionUI', { path: '/get_started' }],
      });
    });
  }
);
