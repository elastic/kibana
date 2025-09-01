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
    retries: 2,
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.onboarding.goto();
    await pageObjects.onboarding.waitForMainTilesToLoad();
    await pageObjects.onboarding.useCaseGrid.waitFor({ state: 'visible' });
    await pageObjects.onboarding.hostUseCaseTile.waitFor({ state: 'visible' });
  });

  test(
    'should always show Host, Kubernetes, and Cloud tiles',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ pageObjects }) => {
      await expect(pageObjects.onboarding.hostUseCaseTile).toBeVisible();
      await expect(pageObjects.onboarding.kubernetesUseCaseTile).toBeVisible();
      await expect(pageObjects.onboarding.cloudUseCaseTile).toBeVisible();
    }
  );

  test(
    'should show Host sub-section tiles when Host tile is selected',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await expect(pageObjects.onboarding.autoDetectLogsCard).toBeVisible();
      await expect(pageObjects.onboarding.otelLogsCard).toBeVisible();
    }
  );

  test(
    'should show Kubernetes sub-section tiles when Kubernetes tile is selected',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ pageObjects }) => {
      await pageObjects.onboarding.selectKubernetesUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await expect(pageObjects.onboarding.kubernetesQuickStartCard).toBeVisible();
      await expect(pageObjects.onboarding.otelKubernetesCard).toBeVisible();
    }
  );

  test(
    'should show Cloud sub-section tiles when Cloud tile is selected',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ pageObjects }) => {
      await pageObjects.onboarding.selectCloudUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await expect(pageObjects.onboarding.awsLogsVirtualCard).toBeVisible();
      await expect.soft(pageObjects.onboarding.azureLogsVirtualCard).toBeVisible();
      await expect.soft(pageObjects.onboarding.gcpLogsVirtualCard).toBeVisible();
    }
  );

  test(
    'should navigate correctly when Host integration cards are clicked',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await pageObjects.onboarding.clickIntegrationCard('integration-card:auto-detect-logs');
      await expect(page).toHaveURL(/.*\/auto-detect/);
    }
  );

  test(
    'should navigate correctly when Kubernetes integration cards are clicked',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await pageObjects.onboarding.selectKubernetesUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await pageObjects.onboarding.clickIntegrationCard('integration-card:kubernetes-quick-start');
      await expect(page).toHaveURL(/.*\/kubernetes/);
    }
  );

  test(
    'should navigate correctly when OTel integration cards are clicked',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await pageObjects.onboarding.clickIntegrationCard('integration-card:otel-logs');
      await expect(page).toHaveURL(/.*\/otel-logs/);
    }
  );

  test(
    'should navigate correctly when Cloud integration cards are clicked',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await pageObjects.onboarding.selectCloudUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await pageObjects.onboarding.clickIntegrationCard('integration-card:aws-logs-virtual');
      await pageObjects.onboarding.waitForIntegrationCards();
      await expect(page).toHaveURL(/.*category=cloud/);
    }
  );

  test(
    'should maintain proper URL state when switching between use cases',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ page, pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await expect(page).toHaveURL(/.*category=host/);

      await pageObjects.onboarding.selectKubernetesUseCase();
      await expect(page).toHaveURL(/.*category=kubernetes/);

      await pageObjects.onboarding.selectCloudUseCase();
      await expect(page).toHaveURL(/.*category=cloud/);
    }
  );

  test(
    'should deep-link to sub-sections using category param',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ pageObjects }) => {
      await pageObjects.onboarding.openWithCategory('host');
      await pageObjects.onboarding.waitForIntegrationCards();

      await pageObjects.onboarding.openWithCategory('kubernetes');
      await pageObjects.onboarding.waitForIntegrationCards();

      await pageObjects.onboarding.openWithCategory('cloud');
      await pageObjects.onboarding.waitForIntegrationCards();
    }
  );

  test(
    'should maintain consistent tile layout structure',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ pageObjects }) => {
      const gridContainer = pageObjects.onboarding.useCaseGrid;
      await expect(gridContainer).toBeVisible();

      await expect(pageObjects.onboarding.hostUseCaseTile.locator('label')).toBeVisible();
      await expect(pageObjects.onboarding.kubernetesUseCaseTile.locator('label')).toBeVisible();
      await expect(pageObjects.onboarding.cloudUseCaseTile.locator('label')).toBeVisible();
    }
  );

  test(
    'should maintain consistent integration card structure after selection',
    { tag: ['@ess', '@svlOblt', '@svlLogsEssentials'] },
    async ({ pageObjects }) => {
      await pageObjects.onboarding.selectHostUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      const autoDetectCard = pageObjects.onboarding.autoDetectLogsCard;
      await expect(autoDetectCard).toBeVisible();
      
      const otelCard = pageObjects.onboarding.otelLogsCard;
      await expect(otelCard).toBeVisible();
      
      await expect(autoDetectCard.locator('button, a, [role="button"]')).toBeVisible();
      await expect(otelCard.locator('button, a, [role="button"]')).toBeVisible();
    }
  );

  test(
    'should show Application tile in complete tier',
    { tag: ['@ess', '@svlOblt'] },
    async ({ pageObjects }) => {
      await expect(pageObjects.onboarding.applicationUseCaseTile).toBeVisible();
    }
  );

  test(
    'should show Application sub-section tiles when Application tile is selected',
    { tag: ['@ess', '@svlOblt'] },
    async ({ pageObjects }) => {
      await pageObjects.onboarding.selectApplicationUseCase();
      await pageObjects.onboarding.waitForIntegrationCards();

      await expect(pageObjects.onboarding.apmVirtualCard).toBeVisible();
      await expect(pageObjects.onboarding.otelVirtualCard).toBeVisible();
      await expect(pageObjects.onboarding.syntheticsVirtualCard).toBeVisible();
    }
  );

  test(
    'should deep-link to application category in complete tier',
    { tag: ['@ess', '@svlOblt'] },
    async ({ pageObjects }) => {
      await pageObjects.onboarding.openWithCategory('application');
      await pageObjects.onboarding.waitForIntegrationCards();
    }
  );

  test(
    'should hide Application tile in logs-essentials tier',
    { tag: ['@svlLogsEssentials'] },
    async ({ pageObjects }) => {
      await expect(pageObjects.onboarding.applicationUseCaseTile).not.toBeVisible();
    }
  );
});