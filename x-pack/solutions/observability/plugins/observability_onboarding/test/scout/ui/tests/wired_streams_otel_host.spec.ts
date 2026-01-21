/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';
import {
  setupWiredStreamsOnce,
  setupWiredStreamsBeforeEach,
} from '../fixtures/helpers/wired_streams_setup';

test.describe('Wired Streams - OTel Host Flow', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await setupWiredStreamsOnce({ apiServices });
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await setupWiredStreamsBeforeEach({ pageObjects, browserAuth });
  });

  test('shows ingestion selector with correct options', async ({ pageObjects }) => {
    await test.step('navigate to OTel Host flow', async () => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.clickIntegrationCard('integration-card:otel-logs');
    });

    await test.step('ingestion selector is visible', async () => {
      await expect(pageObjects.onboarding.ingestionModeSelector).toBeVisible();
    });

    await test.step('Classic ingestion option is visible and selected by default', async () => {
      await expect(pageObjects.onboarding.classicIngestionOption).toBeVisible();
      await expect(pageObjects.onboarding.classicIngestionOption).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    await test.step('Wired Streams option is visible with Tech Preview badge', async () => {
      await expect(pageObjects.onboarding.wiredStreamsOption).toBeVisible();
      await expect(pageObjects.onboarding.techPreviewBadge).toBeVisible();
    });
  });

  test('can switch between ingestion modes', async ({ pageObjects }) => {
    await pageObjects.onboarding.selectHostUseCase();
    await pageObjects.onboarding.clickIntegrationCard('integration-card:otel-logs');

    await test.step('select Wired Streams', async () => {
      await pageObjects.onboarding.selectWiredStreams();
      await expect(pageObjects.onboarding.wiredStreamsOption).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await expect(pageObjects.onboarding.classicIngestionOption).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });

    await test.step('switch back to Classic ingestion', async () => {
      await pageObjects.onboarding.selectClassicIngestion();
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
});
