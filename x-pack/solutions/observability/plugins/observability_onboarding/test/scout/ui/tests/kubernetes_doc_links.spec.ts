/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';

test.describe('Kubernetes onboarding doc links', () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test(
    'Elastic Agent Kubernetes flow shows quickstart docs link',
    { tag: ['@ess', '@svlOblt'] },
    async ({ pageObjects }) => {
      await pageObjects.onboarding.goto();
      await pageObjects.onboarding.waitForMainTilesToLoad();
      await pageObjects.onboarding.selectKubernetesUseCase();
      await pageObjects.onboarding.clickIntegrationCard('integration-card:kubernetes-quick-start');

      await expect(pageObjects.onboarding.kubernetesQuickstartDocsLink).toBeVisible();
      await expect(pageObjects.onboarding.kubernetesQuickstartDocsLink).toHaveAttribute(
        'href',
        'https://www.elastic.co/docs/solutions/observability/get-started/quickstart-monitor-kubernetes-cluster-with-elastic-agent'
      );
    }
  );

  test(
    'OpenTelemetry Kubernetes flow shows quickstart docs link',
    { tag: ['@ess', '@svlOblt'] },
    async ({ pageObjects }) => {
      await pageObjects.onboarding.goto();
      await pageObjects.onboarding.waitForMainTilesToLoad();
      await pageObjects.onboarding.selectKubernetesUseCase();
      await pageObjects.onboarding.clickIntegrationCard('integration-card:otel-kubernetes');

      await expect(pageObjects.onboarding.otelKubernetesQuickstartDocsLink).toBeVisible();
      await expect(pageObjects.onboarding.otelKubernetesQuickstartDocsLink).toHaveAttribute(
        'href',
        'https://www.elastic.co/docs/solutions/observability/get-started/quickstart-unified-kubernetes-observability-with-elastic-distributions-of-opentelemetry-edot'
      );
    }
  );
});
