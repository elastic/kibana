/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

test.describe(
  'Wired Streams - Enable Modal Confirmation Flow',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects, apiServices }) => {
      await browserAuth.loginAsAdmin();

      try {
        await apiServices.onboarding.disableWiredStreams();
      } catch {
        // Already disabled, that's fine
      }

      await pageObjects.onboarding.goto();
      await pageObjects.onboarding.waitForMainTilesToLoad();
    });

    test.afterAll(async ({ apiServices }) => {
      try {
        await apiServices.onboarding.enableWiredStreams();
      } catch {
        // Already enabled
      }
    });

    test('shows confirmation modal when selecting Wired Streams for the first time', async ({
      pageObjects,
    }) => {
      await test.step('navigate to Auto-detect flow', async () => {
        await pageObjects.onboarding.selectHostUseCase();
        await pageObjects.onboarding.clickIntegrationCard('integration-card:auto-detect-logs');
      });

      await test.step('Classic ingestion is selected by default', async () => {
        await expect(pageObjects.onboarding.classicIngestionOption).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });

      await test.step('clicking Wired Streams shows confirmation modal', async () => {
        await pageObjects.onboarding.selectWiredStreams();
        await expect(pageObjects.onboarding.enableWiredStreamsModal).toBeVisible();
        await expect(pageObjects.onboarding.enableWiredStreamsCancelButton).toBeVisible();
        await expect(pageObjects.onboarding.enableWiredStreamsConfirmButton).toBeVisible();
      });
    });

    test('canceling the modal keeps Classic ingestion selected', async ({ pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.clickIntegrationCard('integration-card:auto-detect-logs');

      await test.step('open modal and cancel', async () => {
        await pageObjects.onboarding.selectWiredStreams();
        await expect(pageObjects.onboarding.enableWiredStreamsModal).toBeVisible();
        await pageObjects.onboarding.cancelEnableWiredStreamsModal();
      });

      await test.step('modal is closed and Classic ingestion remains selected', async () => {
        await expect(pageObjects.onboarding.enableWiredStreamsModal).toBeHidden();
        await expect(pageObjects.onboarding.classicIngestionOption).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        await expect(pageObjects.onboarding.wiredStreamsOption).toHaveAttribute(
          'aria-pressed',
          'false'
        );
      });
    });

    test('confirming the modal enables Wired Streams and switches ingestion mode', async ({
      pageObjects,
    }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.clickIntegrationCard('integration-card:auto-detect-logs');

      await test.step('open modal and confirm', async () => {
        await pageObjects.onboarding.selectWiredStreams();
        await expect(pageObjects.onboarding.enableWiredStreamsModal).toBeVisible();
        await pageObjects.onboarding.confirmEnableWiredStreamsModal();
      });

      await test.step('modal closes and Wired Streams is now selected', async () => {
        await expect(pageObjects.onboarding.enableWiredStreamsModal).toBeHidden();
        await expect(pageObjects.onboarding.wiredStreamsOption).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        await expect(pageObjects.onboarding.classicIngestionOption).toHaveAttribute(
          'aria-pressed',
          'false'
        );
      });

      await test.step('command includes wired streams flag', async () => {
        const command = await pageObjects.onboarding.getAutoDetectCommandContent();
        expect(command).toContain('--write-to-logs-streams=true');
      });
    });

    test('modal does not appear if Wired Streams is already enabled', async ({
      pageObjects,
      apiServices,
    }) => {
      await apiServices.onboarding.enableWiredStreams();

      await pageObjects.onboarding.goto();
      await pageObjects.onboarding.waitForMainTilesToLoad();

      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.clickIntegrationCard('integration-card:auto-detect-logs');

      await test.step('clicking Wired Streams switches directly without modal', async () => {
        await pageObjects.onboarding.selectWiredStreams();

        await expect(pageObjects.onboarding.enableWiredStreamsModal).toBeHidden();

        await expect(pageObjects.onboarding.wiredStreamsOption).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });
    });
  }
);
