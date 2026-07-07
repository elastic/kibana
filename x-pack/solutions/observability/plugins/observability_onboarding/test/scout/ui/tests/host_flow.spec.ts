/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { tags } from '@kbn/scout-oblt';
import { test } from '../fixtures';
import { setupWiredStreamsOnce } from '../fixtures/helpers/wired_streams_setup';

const V2_FF_ID = 'observability.addDataPageV2Enabled';

test.describe.serial(
  'Host Onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await setupWiredStreamsOnce({ apiServices });
      await apiServices.core.settings({
        'feature_flags.overrides': { [V2_FF_ID]: true },
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [V2_FF_ID]: false },
      });
    });

    test('Linux tile navigates to /host/linux with OTel as the selected collection method', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.host.gotoLanding();
      await pageObjects.host.clickHostTile('linux');

      await expect(pageObjects.host.layout('linux')).toBeVisible();
      await expect(page).toHaveURL(/\/host\/linux/);
      await expect(pageObjects.host.collectionMethodSelector()).toBeVisible();
      await expect(pageObjects.host.collectionMethodCard('otel')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });

    test('Linux collection method selector toggles between OTel and Elastic Agent', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.host.gotoPath('/host/linux');

      await pageObjects.host.collectionMethodCard('auto-detect').click();
      await expect(page).toHaveURL(/\/host\/linux\/auto-detect/);

      await pageObjects.host.collectionMethodCard('otel').click();
      // Anchored so /host/linuxxyz and /host/linux/foo don't match.
      await expect(page).toHaveURL(/\/host\/linux(\?|$|#)/);
    });

    test('Linux ingestion mode persists across the collection method toggle', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.host.gotoPath('/host/linux');
      // The ingestion selector's visibility depends on wiredStreamsStatus.isLoading, an async
      // status check that can exceed the default 10s under serverless parallel load. Wait
      // explicitly (matching the 30s wait later in this test).
      await pageObjects.host.ingestionSelector().waitFor({ state: 'visible', timeout: 30_000 });

      await test.step('select Wired Streams ingestion', async () => {
        await pageObjects.onboarding.selectWiredStreams();
        await pageObjects.onboarding.confirmEnableWiredStreamsModalIfPresent();
        await expect(page).toHaveURL(/ingestion=wired/);
      });

      await test.step('switch collection method to Elastic Agent', async () => {
        await pageObjects.host.collectionMethodCard('auto-detect').click();
        await expect(page).toHaveURL(/\/host\/linux\/auto-detect.*ingestion=wired/);
      });

      await test.step('ingestion mode survives the collection method switch', async () => {
        // The auto-detect page re-creates the flow; the ingestion selector lives inside the
        // install step, which renders a skeleton until POST /flow resolves. Wait for it first,
        // mirroring the wait used earlier in this test.
        await pageObjects.host.ingestionSelector().waitFor({ state: 'visible', timeout: 30_000 });
        await expect(pageObjects.onboarding.wiredStreamsOption).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });
    });

    test('macOS landing has OTel as the selected collection method', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.host.gotoPath('/host/macos');
      await expect(pageObjects.host.layout('mac')).toBeVisible();
      await expect(page).toHaveURL(/\/host\/macos/);
      await expect(pageObjects.host.collectionMethodSelector()).toBeVisible();
      await expect(pageObjects.host.collectionMethodCard('otel')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });

    test('macOS tile navigates to /host/macos with OTel as the selected collection method', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.host.gotoLanding();
      await pageObjects.host.clickHostTile('macos');

      await expect(pageObjects.host.layout('mac')).toBeVisible();
      await expect(page).toHaveURL(/\/host\/macos/);
      await expect(pageObjects.host.collectionMethodSelector()).toBeVisible();
      await expect(pageObjects.host.collectionMethodCard('otel')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });

    test('Windows install step renders the PowerShell collector command', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.host.gotoPath('/host/windows');
      await expect(pageObjects.host.layout('windows')).toBeVisible();
      await expect(page).toHaveURL(/\/host\/windows/);
      await expect(pageObjects.host.collectionMethodSelector()).toHaveCount(0);

      const codeBlock = pageObjects.host.otelInstallCodeBlock();
      await expect(codeBlock).toBeVisible();
      await expect(codeBlock).toContainText(/Invoke-WebRequest|otelcol\.ps1/);
    });

    test('setup failure keeps the V2 chrome visible with an inline error and a working retry', async ({
      pageObjects,
    }) => {
      await pageObjects.host.stubOtelHostSetupAsFailing();
      await pageObjects.host.gotoPath('/host/linux');

      await expect(pageObjects.host.layout('linux')).toBeVisible();
      await expect(pageObjects.host.returnLink()).toBeVisible();
      await expect(pageObjects.host.collectionMethodSelector()).toBeVisible();
      await expect(pageObjects.host.emptyPrompt()).toBeVisible();

      const retry = pageObjects.host.emptyPromptRetryButton();
      await expect(retry).toBeVisible();
      await retry.click();

      await expect(pageObjects.host.otelInstallCodeBlock()).toBeVisible({ timeout: 30_000 });
      await expect(pageObjects.host.emptyPrompt()).toHaveCount(0);
    });

    test('pre-existing data activates the visualize step get-started panel', async ({
      pageObjects,
    }) => {
      // Stub before navigation so usePreExistingDataCheck sees true on first render.
      await pageObjects.host.stubHasDataAsPreExisting();
      await pageObjects.host.gotoPath('/host/linux');
      await expect(pageObjects.host.layout('linux')).toBeVisible();
      await expect(pageObjects.host.visualizeActionLink('logs')).toBeVisible({
        timeout: 30_000,
      });
    });

    test('navigating to /host/linux redirects to the V1 landing root when V2 is disabled', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [V2_FF_ID]: false },
      });
      await pageObjects.host.gotoPath('/host/linux');
      await pageObjects.onboarding.useCaseGridByTestId.waitFor({ state: 'visible' });
      await expect(pageObjects.host.landingWrapper).toHaveCount(0);
      await expect(pageObjects.host.layout('linux')).toHaveCount(0);
      await expect(page).not.toHaveURL(/\/host\//);
    });
  }
);
