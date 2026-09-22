/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '@kbn/scout-security';
import type { ScoutPage, KbnClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  API_VERSIONS,
  ENTITY_STORE_ROUTES,
  FF_ENABLE_ENTITY_STORE_V2,
} from '../../../../../common';

// Installing/starting the store is slow and blocking, so timeouts sit well above Scout's 60s default.
const TEST_TIMEOUT = 240_000; // per-test cap
const REQUEST_TIMEOUT = 180_000; // waiting for a request or a status change to settle
const INSTALL_GRACE = 2_000; // short window to confirm no auto-install fired

const LEGACY_V1_ENGINE_STATUS_TYPE = 'entity-engine-status';
const LEGACY_V1_ENGINE_DESCRIPTOR_ID = 'entity-engine-descriptor-host-default';

const isStatusResponse = (url: string) => url.includes(ENTITY_STORE_ROUTES.public.STATUS);
const isInstallRequest = (url: string, method: string) =>
  url.includes(ENTITY_STORE_ROUTES.public.INSTALL) && method === 'POST';
const isTimeoutError = (error: unknown) => error instanceof Error && error.name === 'TimeoutError';

/**
 * Fails if the auto-install hook POSTs /install within the grace window. No POST times out, which is
 * the pass case; any other error re-throws.
 */
const throwOnInstallRequest = (page: ScoutPage) =>
  page
    .waitForRequest((req) => isInstallRequest(req.url(), req.method()), { timeout: INSTALL_GRACE })
    .then(
      () => {
        throw new Error('the auto-install hook must not POST /install');
      },
      (error) => {
        if (!isTimeoutError(error)) throw error;
      }
    );

const uninstallEntityStoreV2 = async (kbnClient: KbnClient) => {
  await kbnClient.request({
    method: 'POST',
    path: ENTITY_STORE_ROUTES.public.UNINSTALL,
    headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
    body: {},
    ignoreErrors: [404],
  });
};

const seedLegacyV1EngineStatus = async (kbnClient: KbnClient) => {
  await kbnClient.request({
    method: 'POST',
    path: `/api/saved_objects/${LEGACY_V1_ENGINE_STATUS_TYPE}/${LEGACY_V1_ENGINE_DESCRIPTOR_ID}`,
    body: {
      attributes: {
        type: 'host',
        status: 'running',
      },
    },
    ignoreErrors: [409],
  });
};

const removeLegacyV1EngineStatus = async (kbnClient: KbnClient) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/saved_objects/${LEGACY_V1_ENGINE_STATUS_TYPE}/${LEGACY_V1_ENGINE_DESCRIPTOR_ID}`,
    ignoreErrors: [404],
  });
};

/**
 * Resets to a clean v1-migration state so the chain starts the same on every run (the lane's
 * cluster is shared): uninstall v2, clear any leftover legacy v1 descriptor, then seed a running
 * v1 engine-status saved object so the hook treats this space as a migration candidate.
 */
const resetForV1MigrationAutoInstall = async (kbnClient: KbnClient) => {
  await uninstallEntityStoreV2(kbnClient);
  await removeLegacyV1EngineStatus(kbnClient);
  await seedLegacyV1EngineStatus(kbnClient);
};

/**
 * Runs serially in the default space. The store moves running -> stopped -> uninstalled across
 * the three tests; assertions are on the UI toggle.
 */
test.describe.serial(
  'Entity Store v1 migration auto-install',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });
      await resetForV1MigrationAutoInstall(kbnClient);
    });

    test.beforeEach(async ({ browserAuth }) => {
      test.setTimeout(TEST_TIMEOUT);
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ kbnClient }) => {
      await uninstallEntityStoreV2(kbnClient);
      await removeLegacyV1EngineStatus(kbnClient);
    });

    test('auto-installs the entity store when visiting a Security page', async ({
      page,
      pageObjects,
      apiServices,
    }) => {
      const managementPage = pageObjects.entityAnalyticsManagementPage;

      // The auto-install hook POSTs /install on first navigation; wait for the request to confirm it fired.
      const installRequested = page.waitForRequest(
        (req) => isInstallRequest(req.url(), req.method()),
        { timeout: REQUEST_TIMEOUT }
      );
      await managementPage.navigate();
      await installRequested;

      // /install blocks until the store is installed; poll status instead of the blocking response.
      await apiServices.entityAnalytics.waitForEntityStoreStatus('running', REQUEST_TIMEOUT);
      await expect(managementPage.entityAnalyticsSwitch).toBeChecked({ timeout: REQUEST_TIMEOUT });
    });

    test('does not auto-install after stopping', async ({ page, pageObjects, apiServices }) => {
      const managementPage = pageObjects.entityAnalyticsManagementPage;
      const toggle = managementPage.entityAnalyticsSwitch;

      // The store is installed from the previous test, so the toggle loads checked.
      await test.step('stop the store via the toggle', async () => {
        await managementPage.navigate();
        await managementPage.waitForStatusLoaded();
        await managementPage.toggleEntityAnalytics();
        await apiServices.entityAnalytics.waitForEntityStoreStatus('stopped', REQUEST_TIMEOUT);
        await expect(toggle).not.toBeChecked({ timeout: REQUEST_TIMEOUT });
      });

      await test.step('reloading the page (a fresh app mount) does not re-install the store', async () => {
        const statusLoaded = page.waitForResponse((res) => isStatusResponse(res.url()), {
          timeout: REQUEST_TIMEOUT,
        });
        await page.reload();
        await statusLoaded;
        await throwOnInstallRequest(page);
        await expect(toggle).not.toBeChecked();
      });
    });

    test('does not auto-install after uninstalling', async ({ page, pageObjects, apiServices }) => {
      const managementPage = pageObjects.entityAnalyticsManagementPage;
      const toggle = managementPage.entityAnalyticsSwitch;

      // The store is stopped from the previous test, so the toggle loads unchecked.
      await test.step('start the store via the toggle', async () => {
        await managementPage.navigate();
        await managementPage.waitForStatusLoaded();
        await managementPage.toggleEntityAnalytics();
        await apiServices.entityAnalytics.waitForEntityStoreStatus('running', REQUEST_TIMEOUT);
        await expect(toggle).toBeChecked({ timeout: REQUEST_TIMEOUT });
      });

      await test.step('uninstall by clearing entity data', async () => {
        await managementPage.clearEntityData();
        await apiServices.entityAnalytics.waitForEntityStoreStatus(
          'not_installed',
          REQUEST_TIMEOUT
        );
        await expect(toggle).not.toBeChecked({ timeout: REQUEST_TIMEOUT });
      });

      await test.step('reloading the page (a fresh app mount) does not re-install the store', async () => {
        const statusLoaded = page.waitForResponse((res) => isStatusResponse(res.url()), {
          timeout: REQUEST_TIMEOUT,
        });
        await page.reload();
        await statusLoaded;
        await throwOnInstallRequest(page);
        await expect(toggle).not.toBeChecked();
      });
    });
  }
);
