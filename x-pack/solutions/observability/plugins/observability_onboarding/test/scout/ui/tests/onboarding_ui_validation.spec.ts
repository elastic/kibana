/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

const TEST_TIMEOUT = 3 * 60 * 1000;

test.describe('Onboarding UI Validation', () => {
  test.describe.configure({ 
    timeout: TEST_TIMEOUT,
    retries: 2
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.onboarding.goto();
    await pageObjects.onboarding.waitForMainTilesToLoad();
  });

  test.describe('Main Tiles Visibility - Feature Flag Dependent', { tag: ['@ess', '@svlOblt'] }, () => {
    test('should always show Host, Kubernetes, and Cloud tiles', async ({ pageObjects }) => {
      await expect(pageObjects.onboarding.hostUseCaseTile).toBeVisible();
      await expect(pageObjects.onboarding.kubernetesUseCaseTile).toBeVisible();
      await expect(pageObjects.onboarding.cloudUseCaseTile).toBeVisible();
    });

    test('should show Application tile only in complete deployment mode', async ({ pageObjects }) => {
      const isApplicationTileVisible = await pageObjects.onboarding.applicationUseCaseTile.isVisible();
      console.log('pageObjects.onboarding', pageObjects.onboarding);
      const hostDescription = await pageObjects.onboarding.getTileDescription('host');
      const kubernetesDescription = await pageObjects.onboarding.getTileDescription('kubernetes');
      
      if (isApplicationTileVisible) {
        // Complete
        expect(hostDescription).toContain('Monitor your host');
        expect(kubernetesDescription).toContain('metrics');
        await expect(pageObjects.onboarding.applicationUseCaseTile).toBeVisible();
      } else {
        // Logs-essentials
        expect(hostDescription).toContain('logs');
        expect(kubernetesDescription).toContain('logs');
        await expect(pageObjects.onboarding.applicationUseCaseTile).not.toBeVisible();
      }
    });

    test('should show appropriate copy based on deployment mode', async ({ pageObjects }) => {
      const hostDescription = await pageObjects.onboarding.getTileDescription('host');
      const kubernetesDescription = await pageObjects.onboarding.getTileDescription('kubernetes');
      const isApplicationTileVisible = await pageObjects.onboarding.applicationUseCaseTile.isVisible();
      
      if (isApplicationTileVisible) {
        // Complete
        expect(hostDescription).toContain('Monitor your host');
        expect(kubernetesDescription).toContain('metrics');
        expect(kubernetesDescription).toContain('traces');
      } else {
        // Logs-essentials
        expect(hostDescription).toContain('logs');
        expect(kubernetesDescription).toContain('logs');
        expect(kubernetesDescription).not.toContain('traces');
      }
    });
  });

  test.describe('Sub-section Tiles Visibility', { tag: ['@ess', '@svlOblt'] }, () => {
    test('should show Host sub-section tiles when Host tile is selected', async ({ pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await expect(pageObjects.onboarding.autoDetectLogsCard).toBeVisible();
      await expect(pageObjects.onboarding.otelLogsCard).toBeVisible();
    });

    test('should show Kubernetes sub-section tiles when Kubernetes tile is selected', async ({ pageObjects }) => {
      await pageObjects.onboarding.selectKubernetesUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await expect(pageObjects.onboarding.kubernetesQuickStartCard).toBeVisible();
      await expect(pageObjects.onboarding.otelKubernetesCard).toBeVisible();
    });

    test('should show Cloud sub-section tiles when Cloud tile is selected', async ({ pageObjects }) => {
      await pageObjects.onboarding.selectCloudUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await expect(pageObjects.onboarding.awsLogsVirtualCard).toBeVisible();
      
      const azureVisible = await pageObjects.onboarding.azureLogsVirtualCard.isVisible();
      const gcpVisible = await pageObjects.onboarding.gcpLogsVirtualCard.isVisible();
      
      expect(azureVisible || gcpVisible).toBeTruthy();
    });

    test('should show Application sub-section tiles when Application tile is selected (complete mode only)', async ({ pageObjects }) => {
      const isApplicationTileVisible = await pageObjects.onboarding.applicationUseCaseTile.isVisible();
      
      if (isApplicationTileVisible) {
        // Complete
        await pageObjects.onboarding.selectApplicationUseCase();
        await pageObjects.onboarding.waitForIntegrationCards();

        await expect(pageObjects.onboarding.apmVirtualCard).toBeVisible();
        await expect(pageObjects.onboarding.otelVirtualCard).toBeVisible();
        await expect(pageObjects.onboarding.syntheticsVirtualCard).toBeVisible();
      } else {
        // Logs-essentials
        test.skip();
      }
    });
  });

  test.describe('Navigation Validation', { tag: ['@ess', '@svlOblt'] }, () => {
    test('should navigate correctly when Host integration cards are clicked', async ({ page, pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await pageObjects.onboarding.clickIntegrationCard('integration-card:auto-detect-logs');
      
      await expect(page).toHaveURL(/.*\/auto-detect/);
    });

    test('should navigate correctly when Kubernetes integration cards are clicked', async ({ page, pageObjects }) => {
      await pageObjects.onboarding.selectKubernetesUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await pageObjects.onboarding.clickIntegrationCard('integration-card:kubernetes-quick-start');
      
      await expect(page).toHaveURL(/.*\/kubernetes/);
    });

    test('should navigate correctly when OTel integration cards are clicked', async ({ page, pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await pageObjects.onboarding.clickIntegrationCard('integration-card:otel-logs');
      
      await expect(page).toHaveURL(/.*\/otel-logs/);
    });

    test('should maintain proper URL state when switching between use cases', async ({ page, pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await expect(page).toHaveURL(/.*category=host/);

      await pageObjects.onboarding.selectKubernetesUseCase();
      await expect(page).toHaveURL(/.*category=kubernetes/);

      await pageObjects.onboarding.selectCloudUseCase();
      await expect(page).toHaveURL(/.*category=cloud/);
    });
  });

  test.describe('UI Stability - External Component Changes Protection', { tag: ['@ess', '@svlOblt'] }, () => {
    test('should maintain consistent tile layout structure', async ({ pageObjects }) => {
      const gridContainer = pageObjects.onboarding.useCaseGrid;
      await expect(gridContainer).toBeVisible();
      
      await expect(pageObjects.onboarding.hostUseCaseTile.locator('label')).toBeVisible();
      await expect(pageObjects.onboarding.kubernetesUseCaseTile.locator('label')).toBeVisible();
      await expect(pageObjects.onboarding.cloudUseCaseTile.locator('label')).toBeVisible();
    });

    test('should maintain consistent integration card structure after selection', async ({ pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      const autoDetectCard = pageObjects.onboarding.autoDetectLogsCard;
      await expect(autoDetectCard).toBeVisible();
      await expect(autoDetectCard).toContainText('Elastic Agent');

      const otelCard = pageObjects.onboarding.otelLogsCard;
      await expect(otelCard).toBeVisible();
      await expect(otelCard).toContainText('OpenTelemetry');
    });

    test('should handle feature flag changes gracefully', async ({ pageObjects }) => {
      //just to be sure that core functionality works
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();
      
      await expect(pageObjects.onboarding.autoDetectLogsCard).toBeVisible();
      await expect(pageObjects.onboarding.otelLogsCard).toBeVisible();
      
      await pageObjects.onboarding.selectKubernetesUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();
      
      await expect(pageObjects.onboarding.kubernetesQuickStartCard).toBeVisible();
      await expect(pageObjects.onboarding.otelKubernetesCard).toBeVisible();
    });
  });
});