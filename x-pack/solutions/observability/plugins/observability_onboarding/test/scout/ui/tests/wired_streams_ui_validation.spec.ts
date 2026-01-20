/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

// Failing: See https://github.com/elastic/kibana/issues/247685
test.describe.skip('Wired Streams Ingestion Selector', () => {
  test.beforeEach(async ({ pageObjects, browserAuth, apiServices }) => {
    await browserAuth.loginAsAdmin();

    try {
      await apiServices.onboarding.enableWiredStreams();
    } catch (error) {
      // Wired streams might already be enabled, continue with tests
    }

    await pageObjects.onboarding.goto();
    await pageObjects.onboarding.waitForMainTilesToLoad();
  });

  test.describe('OTel Host Flow', () => {
    test(
      'shows ingestion selector with correct options',
      { tag: ['@ess', '@svlOblt'] },
      async ({ pageObjects }) => {
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
      }
    );

    test(
      'can switch between ingestion modes',
      { tag: ['@ess', '@svlOblt'] },
      async ({ pageObjects }) => {
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
      }
    );
  });

  test.describe('OTel Kubernetes Flow', () => {
    test(
      'shows ingestion selector with correct options',
      { tag: ['@ess', '@svlOblt'] },
      async ({ pageObjects }) => {
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
      }
    );
  });

  test.describe('Elastic Agent Kubernetes Flow', () => {
    test(
      'shows ingestion selector with correct options',
      { tag: ['@ess', '@svlOblt'] },
      async ({ pageObjects }) => {
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
      }
    );
  });

  test.describe('Auto-detect Flow', () => {
    test(
      'shows ingestion selector with correct options',
      { tag: ['@ess', '@svlOblt'] },
      async ({ pageObjects }) => {
        await test.step('navigate to Auto-detect flow', async () => {
          await pageObjects.onboarding.selectHostUseCase();
          await pageObjects.onboarding.clickIntegrationCard('integration-card:auto-detect-logs');
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
      }
    );

    test(
      'can switch to Wired Streams mode',
      { tag: ['@ess', '@svlOblt'] },
      async ({ pageObjects }) => {
        await pageObjects.onboarding.selectHostUseCase();
        await pageObjects.onboarding.clickIntegrationCard('integration-card:auto-detect-logs');

        await pageObjects.onboarding.selectWiredStreams();

        await expect(pageObjects.onboarding.wiredStreamsOption).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      }
    );
  });
});
