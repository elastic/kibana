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

test.describe(
  'Wired Streams - Elastic Agent Kubernetes Flow',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await setupWiredStreamsOnce({ apiServices });
    });

    test.beforeEach(async ({ pageObjects, browserAuth }) => {
      await setupWiredStreamsBeforeEach({ pageObjects, browserAuth });
    });

    test('shows ingestion selector with correct options', async ({ pageObjects }) => {
      await test.step('navigate to Elastic Agent Kubernetes flow', async () => {
        await pageObjects.onboarding.selectKubernetesUseCase();
        await pageObjects.onboarding.clickIntegrationCard(
          'integration-card:kubernetes-quick-start'
        );
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

    test('command includes wired streams config when Wired Streams mode is selected', async ({
      pageObjects,
    }) => {
      await pageObjects.onboarding.selectKubernetesUseCase();
      await pageObjects.onboarding.clickIntegrationCard('integration-card:kubernetes-quick-start');

      await test.step('command does NOT include wired streams config in Classic mode', async () => {
        const classicCommand = await pageObjects.onboarding.getKubernetesCommandContent();
        expect(classicCommand).not.toContain('_write_to_logs_streams');
      });

      await test.step('command includes wired streams config after switching to Wired Streams', async () => {
        await pageObjects.onboarding.selectWiredStreams();
        const wiredCommand = await pageObjects.onboarding.getKubernetesCommandContent();
        expect(wiredCommand).toContain('_write_to_logs_streams=true');
      });
    });
  }
);
