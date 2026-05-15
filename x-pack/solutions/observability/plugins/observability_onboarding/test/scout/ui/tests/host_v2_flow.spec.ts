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
      expect(page.url()).toContain('/host/linux');
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
      await expect.poll(() => page.url()).toContain('/host/linux/auto-detect');

      await pageObjects.hostV2.approachCard('otel').click();
      await expect.poll(() => page.url()).toMatch(/\/host\/linux(?!\/auto-detect)/);
    });

    test('Linux ingestion mode persists across the approach toggle', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.hostV2.gotoPath('/host/linux');
      await pageObjects.hostV2.ingestionSelector().waitFor({ state: 'visible' });

      await pageObjects.onboarding.selectWiredStreams();
      try {
        await pageObjects.onboarding.enableWiredStreamsModal.waitFor({
          state: 'visible',
          timeout: 2_000,
        });
        await pageObjects.onboarding.confirmEnableWiredStreamsModal();
      } catch {
        /* Modal omitted when Wired Streams is already enabled */
      }
      await expect.poll(() => page.url()).toContain('ingestion=wired');

      await pageObjects.hostV2.approachCard('auto-detect').click();
      await expect.poll(() => page.url()).toMatch(/\/host\/linux\/auto-detect.*ingestion=wired/);
      await expect(pageObjects.onboarding.wiredStreamsOption).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    test('macOS landing has the OTel approach selected', async ({ pageObjects, page }) => {
      await pageObjects.hostV2.gotoPath('/host/macos');
      await expect(pageObjects.hostV2.layout('mac')).toBeVisible();
      expect(page.url()).toContain('/host/macos');
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
      expect(page.url()).toContain('/host/macos');
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
      expect(page.url()).toContain('/host/windows');
      await expect(pageObjects.hostV2.approachSelector()).toHaveCount(0);

      const codeBlock = pageObjects.hostV2.otelInstallCodeBlock();
      await expect(codeBlock).toBeVisible();
      // PowerShell install commands include Invoke-WebRequest and a .ps1 entry point.
      const command = (await codeBlock.textContent()) ?? '';
      expect(command).toMatch(/Invoke-WebRequest|otelcol\.ps1/);
    });

    test('setup failure keeps the V2 chrome visible with an inline error and a working retry', async ({
      pageObjects,
    }) => {
      // Spec requires V2 to render the return link + approach selector even when
      // the initial setup call fails, with an inline EmptyPrompt offering retry.
      // The page object stubs the first /setup call to fail and lets retries
      // pass through, so clicking Retry recovers the flow on a real backend.
      await pageObjects.hostV2.stubOtelHostSetupAsFailing();
      await pageObjects.hostV2.gotoPath('/host/linux');

      await expect(pageObjects.hostV2.layout('linux')).toBeVisible();
      await expect(pageObjects.hostV2.returnLink()).toBeVisible();
      await expect(pageObjects.hostV2.approachSelector()).toBeVisible();
      await expect(pageObjects.hostV2.emptyPrompt()).toBeVisible();

      const retry = pageObjects.hostV2.emptyPromptRetryButton();
      await expect(retry).toBeVisible();
      await retry.click();

      // After retry the second /setup call passes through and the install step
      // appears in place of the EmptyPrompt.
      await expect(pageObjects.hostV2.otelInstallCodeBlock()).toBeVisible({ timeout: 30_000 });
      await expect(pageObjects.hostV2.emptyPrompt()).toHaveCount(0);
    });

    test('pre-existing data activates the visualize step get-started panel', async ({
      pageObjects,
    }) => {
      // Stub the OTel /has-data endpoint before navigation so usePreExistingDataCheck
      // sees hasPreExistingData:true on the first render and flips isMonitoringStepActive.
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
      // Spec requires the original /host/* path to survive when FF is off so
      // deep links and analytics keep their pathname.
      expect(page.url()).toContain('/host/linux');
    });
  }
);
