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

test.describe('Wired Streams - OTel Kubernetes Flow', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await setupWiredStreamsOnce({ apiServices });
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await setupWiredStreamsBeforeEach({ pageObjects, browserAuth });
  });

  test('shows ingestion selector with correct options', async ({ pageObjects }) => {
    await test.step('navigate to OTel Kubernetes flow', async () => {
      await pageObjects.onboarding.selectKubernetesUseCase();
      await pageObjects.onboarding.clickIntegrationCard('integration-card:otel-kubernetes');
    });

    await test.step('ingestion selector is visible with both options', async () => {
      await expect(pageObjects.onboarding.ingestionModeSelector).toBeVisible();
      await expect(pageObjects.onboarding.classicIngestionOption).toBeVisible();
      await expect(pageObjects.onboarding.wiredStreamsOption).toBeVisible();
      await expect(pageObjects.onboarding.techPreviewBadge).toBeVisible();
    });

    await test.step('Classic ingestion is selected by default', async () => {
      await expect(pageObjects.onboarding.classicIngestionOption).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });
  });
});
