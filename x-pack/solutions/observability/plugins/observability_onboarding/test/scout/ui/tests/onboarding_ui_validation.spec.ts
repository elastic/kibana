/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

test.describe('Onboarding UI Validation', () => {
  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.onboarding.goto();
    await pageObjects.onboarding.waitForMainTilesToLoad();
    await pageObjects.onboarding.useCaseGrid.waitFor({ state: 'visible' });
    await pageObjects.onboarding.hostUseCaseTile.waitFor({ state: 'visible' });
  });

  test(
    'validates main page structure and navigation',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await test.step('shows core use case tiles', async () => {
        await expect(pageObjects.onboarding.hostUseCaseTile).toBeVisible();
        await expect(pageObjects.onboarding.kubernetesUseCaseTile).toBeVisible();
        await expect(pageObjects.onboarding.cloudUseCaseTile).toBeVisible();
      });

      await test.step('maintains consistent tile layout structure', async () => {
        const gridContainer = pageObjects.onboarding.useCaseGrid;
        await expect(gridContainer).toBeVisible();

        await expect(pageObjects.onboarding.hostUseCaseTile.locator('label')).toBeVisible();
        await expect(pageObjects.onboarding.kubernetesUseCaseTile.locator('label')).toBeVisible();
        await expect(pageObjects.onboarding.cloudUseCaseTile.locator('label')).toBeVisible();
      });

      await test.step('maintains proper URL state when switching between use cases', async () => {
        await pageObjects.onboarding.selectHostUseCase();
        expect(page.url()).toContain('category=host');

        await pageObjects.onboarding.selectKubernetesUseCase();
        expect(page.url()).toContain('category=kubernetes');

        await pageObjects.onboarding.selectCloudUseCase();
        expect(page.url()).toContain('category=cloud');
      });
    }
  );

  test(
    'completes Host onboarding flow',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await test.step('selects Host use case and shows integration cards', async () => {
        await pageObjects.onboarding.selectHostUseCase();

        await expect(pageObjects.onboarding.autoDetectLogsCard).toBeVisible();
        await expect(pageObjects.onboarding.otelLogsCard).toBeVisible();
      });

      await test.step('maintains consistent integration card structure', async () => {
        const autoDetectCard = pageObjects.onboarding.autoDetectLogsCard;
        await expect(autoDetectCard).toBeVisible();

        const otelCard = pageObjects.onboarding.otelLogsCard;
        await expect(otelCard).toBeVisible();

        await expect(autoDetectCard.locator('button, a, [role="button"]')).toBeVisible();
        await expect(otelCard.locator('button, a, [role="button"]')).toBeVisible();
      });

      await test.step('navigates correctly when auto-detect logs card is clicked', async () => {
        await pageObjects.onboarding.clickIntegrationCard('integration-card:auto-detect-logs');
        expect(page.url()).toContain('/auto-detect');
      });
    }
  );

  test(
    'completes Host OTel integration navigation',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await test.step('selects Host use case and shows integration cards', async () => {
        await pageObjects.onboarding.selectHostUseCase();
      });

      await test.step('navigates correctly when OTel logs card is clicked', async () => {
        await pageObjects.onboarding.clickIntegrationCard('integration-card:otel-logs');
        expect(page.url()).toContain('/otel-logs');
      });

      await test.step('supports deep-linking to host category', async () => {
        await pageObjects.onboarding.openWithCategory('host');
      });
    }
  );

  test(
    'completes Kubernetes onboarding flow',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await test.step('selects Kubernetes use case and shows integration cards', async () => {
        await pageObjects.onboarding.selectKubernetesUseCase();

        await expect(pageObjects.onboarding.kubernetesQuickStartCard).toBeVisible();
        await expect(pageObjects.onboarding.otelKubernetesCard).toBeVisible();
      });

      await test.step('navigates correctly when Kubernetes quick-start card is clicked', async () => {
        await pageObjects.onboarding.clickIntegrationCard(
          'integration-card:kubernetes-quick-start'
        );
        expect(page.url()).toContain('/kubernetes');
      });

      await test.step('supports deep-linking to kubernetes category', async () => {
        await pageObjects.onboarding.openWithCategory('kubernetes');
      });
    }
  );

  test(
    'completes Kubernetes onboarding flow with the keyboard only',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await test.step('selects Kubernetes use case and shows integration cards', async () => {
        // tab to first item onboarding case card (radio group)
        await page.keyTo('[data-test-subj="observabilityOnboardingUseCaseCard-host"] input', 'Tab');

        // press arrow key until the kubernetes use case is selected (radio group)
        await page.keyTo(
          '[data-test-subj="observabilityOnboardingUseCaseCard-kubernetes"] input',
          'ArrowRight'
        );

        await expect(pageObjects.onboarding.kubernetesQuickStartCard).toBeVisible();
        await expect(pageObjects.onboarding.otelKubernetesCard).toBeVisible();
      });

      await test.step('navigates correctly when Kubernetes quick-start card is tabbed to and enter is pressed', async () => {
        await page.keyTo(
          '[data-test-subj="integration-card:kubernetes-quick-start"] button',
          'Tab'
        );
        await page.keyboard.press('Enter');
        expect(page.url()).toContain('/kubernetes');
      });

      await test.step('supports deep-linking to kubernetes category', async () => {
        await pageObjects.onboarding.openWithCategory('kubernetes');
      });
    }
  );

  test(
    'completes Cloud onboarding flow',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await test.step('selects Cloud use case and shows integration cards', async () => {
        await pageObjects.onboarding.selectCloudUseCase();

        await expect(pageObjects.onboarding.awsLogsVirtualCard).toBeVisible();
        await expect.soft(pageObjects.onboarding.azureLogsVirtualCard).toBeVisible();
        await expect.soft(pageObjects.onboarding.gcpLogsVirtualCard).toBeVisible();
      });

      await test.step('navigates correctly when AWS logs card is clicked', async () => {
        await pageObjects.onboarding.clickIntegrationCard('integration-card:aws-logs-virtual');
        expect(page.url()).toContain('category=cloud');
      });

      await test.step('supports deep-linking to cloud category', async () => {
        await pageObjects.onboarding.openWithCategory('cloud');
      });
    }
  );

  test(
    'completes Application onboarding flow in complete tier',
    { tag: ['@ess', '@svlOblt'] },
    async ({ pageObjects }) => {
      await test.step('shows Application tile in complete tier', async () => {
        await expect(pageObjects.onboarding.applicationUseCaseTile).toBeVisible();
      });

      await test.step('selects Application use case and shows integration cards', async () => {
        await pageObjects.onboarding.selectApplicationUseCase();

        await expect(pageObjects.onboarding.apmVirtualCard).toBeVisible();
        await expect(pageObjects.onboarding.otelVirtualCard).toBeVisible();
        await expect(pageObjects.onboarding.syntheticsVirtualCard).toBeVisible();
      });

      await test.step('supports deep-linking to application category', async () => {
        await pageObjects.onboarding.openWithCategory('application');
      });
    }
  );

  test(
    'validates logs-essentials tier restrictions',
    { tag: ['@svlLogsEssentials'] },
    async ({ pageObjects }) => {
      await test.step('hides Application tile in logs-essentials tier', async () => {
        await expect(pageObjects.onboarding.applicationUseCaseTile).not.toBeVisible();
      });
    }
  );
});
