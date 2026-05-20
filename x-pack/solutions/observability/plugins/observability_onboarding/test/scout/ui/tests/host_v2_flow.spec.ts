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
  'V2 Host Onboarding',
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

    test('Linux tile navigates to /host/linux with the OTel approach selected', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.hostV2.gotoLanding();
      await pageObjects.hostV2.clickHostTile('linux');

      await expect(pageObjects.hostV2.layout('linux')).toBeVisible();
      await expect(page).toHaveURL(/\/host\/linux/);
      await expect(pageObjects.hostV2.approachSelector()).toBeVisible();
      await expect(pageObjects.hostV2.approachCard('otel')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });

    test('Linux approach selector toggles between OTel and Elastic Agent', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.hostV2.gotoPath('/host/linux');

      await pageObjects.hostV2.approachCard('auto-detect').click();
      await expect(page).toHaveURL(/\/host\/linux\/auto-detect/);

      await pageObjects.hostV2.approachCard('otel').click();
      // Anchored so /host/linuxxyz and /host/linux/foo don't match.
      await expect(page).toHaveURL(/\/host\/linux(\?|$|#)/);
    });

    test('Linux ingestion mode persists across the approach toggle', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.hostV2.gotoPath('/host/linux');
      await pageObjects.hostV2.ingestionSelector().waitFor({ state: 'visible' });

      await test.step('select Wired Streams ingestion', async () => {
        await pageObjects.onboarding.selectWiredStreams();
        await pageObjects.onboarding.confirmEnableWiredStreamsModalIfPresent();
        await expect(page).toHaveURL(/ingestion=wired/);
      });

      await test.step('switch approach to Elastic Agent', async () => {
        await pageObjects.hostV2.approachCard('auto-detect').click();
        await expect(page).toHaveURL(/\/host\/linux\/auto-detect.*ingestion=wired/);
      });

      await test.step('ingestion mode survives the approach switch', async () => {
        await expect(pageObjects.onboarding.wiredStreamsOption).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });
    });

    test('macOS landing has the OTel approach selected', async ({ pageObjects, page }) => {
      await pageObjects.hostV2.gotoPath('/host/macos');
      await expect(pageObjects.hostV2.layout('mac')).toBeVisible();
      await expect(page).toHaveURL(/\/host\/macos/);
      await expect(pageObjects.hostV2.approachSelector()).toBeVisible();
      await expect(pageObjects.hostV2.approachCard('otel')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });

    test('macOS tile navigates to /host/macos with the OTel approach selected', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.hostV2.gotoLanding();
      await pageObjects.hostV2.clickHostTile('macos');

      await expect(pageObjects.hostV2.layout('mac')).toBeVisible();
      await expect(page).toHaveURL(/\/host\/macos/);
      await expect(pageObjects.hostV2.approachSelector()).toBeVisible();
      await expect(pageObjects.hostV2.approachCard('otel')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });

    test('Windows install step renders the PowerShell collector command', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.hostV2.gotoPath('/host/windows');
      await expect(pageObjects.hostV2.layout('windows')).toBeVisible();
      await expect(page).toHaveURL(/\/host\/windows/);
      await expect(pageObjects.hostV2.approachSelector()).toHaveCount(0);

      const codeBlock = pageObjects.hostV2.otelInstallCodeBlock();
      await expect(codeBlock).toBeVisible();
      await expect(codeBlock).toContainText(/Invoke-WebRequest|otelcol\.ps1/);
    });

    test('setup failure keeps the V2 chrome visible with an inline error and a working retry', async ({
      pageObjects,
    }) => {
      await pageObjects.hostV2.stubOtelHostSetupAsFailing();
      await pageObjects.hostV2.gotoPath('/host/linux');

      await expect(pageObjects.hostV2.layout('linux')).toBeVisible();
      await expect(pageObjects.hostV2.returnLink()).toBeVisible();
      await expect(pageObjects.hostV2.approachSelector()).toBeVisible();
      await expect(pageObjects.hostV2.emptyPrompt()).toBeVisible();

      const retry = pageObjects.hostV2.emptyPromptRetryButton();
      await expect(retry).toBeVisible();
      await retry.click();

      await expect(pageObjects.hostV2.otelInstallCodeBlock()).toBeVisible({ timeout: 30_000 });
      await expect(pageObjects.hostV2.emptyPrompt()).toHaveCount(0);
    });

    test('pre-existing data activates the visualize step get-started panel', async ({
      pageObjects,
    }) => {
      // Stub before navigation so usePreExistingDataCheck sees true on first render.
      await pageObjects.hostV2.stubHasDataAsPreExisting();
      await pageObjects.hostV2.gotoPath('/host/linux');
      await expect(pageObjects.hostV2.layout('linux')).toBeVisible();
      await expect(pageObjects.hostV2.visualizeActionLink('logs')).toBeVisible({
        timeout: 30_000,
      });
    });

    test('navigating to /host/linux falls back to the V1 landing on the same path when V2 is disabled', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [V2_FF_ID]: false },
      });
      await pageObjects.hostV2.gotoPath('/host/linux');
      await pageObjects.onboarding.useCaseGridByTestId.waitFor({ state: 'visible' });
      await expect(pageObjects.hostV2.v2LandingWrapper).toHaveCount(0);
      await expect(pageObjects.hostV2.layout('linux')).toHaveCount(0);
      await expect(page).toHaveURL(/\/host\/linux/);
    });
  }
);
