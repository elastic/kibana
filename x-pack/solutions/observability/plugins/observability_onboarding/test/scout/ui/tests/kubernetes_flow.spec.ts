/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { tags } from '@kbn/scout-oblt';
import { test } from '../fixtures';

const V2_FF_ID = 'observability.addDataPageV2Enabled';

test.describe.serial(
  'Kubernetes Onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
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

    test('Kubernetes tile navigates to the OTel Kubernetes flow', async ({ pageObjects, page }) => {
      await pageObjects.kubernetes.gotoLanding();
      await pageObjects.kubernetes.kubernetesTile().click();

      await expect(pageObjects.kubernetes.layout('otel')).toBeVisible();
      await expect(page).toHaveURL(/\/kubernetes(\?|$|#)/);
      await expect(pageObjects.kubernetes.collectionMethodSelector()).toHaveCount(0);
    });

    test('navigating to /otel-kubernetes redirects to /kubernetes without deprecated ingestion param', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.kubernetes.gotoPath('otel-kubernetes?ingestion=wired&foo=bar');

      await expect(page).toHaveURL(/\/kubernetes\?foo=bar/);
      await expect(pageObjects.kubernetes.layout('otel')).toBeVisible();
    });

    test('Kubernetes step controls expose expected branch UI', async ({ pageObjects }) => {
      await pageObjects.kubernetes.gotoPath('/kubernetes');
      await expect(pageObjects.kubernetes.layout('otel')).toBeVisible();

      await test.step('select existing collector tab', async () => {
        await pageObjects.kubernetes.collectorTab('existing').click();
        await expect(pageObjects.kubernetes.existingCollectorTitle()).toBeVisible();
        await expect(pageObjects.kubernetes.existingCollectorDescription()).toBeVisible();
      });

      await test.step('enable OTel instrumentation and select namespace annotations', async () => {
        await pageObjects.kubernetes.otelInstrumentationSwitch().waitFor({ state: 'visible' });
        await pageObjects.kubernetes.otelInstrumentationSwitch().click();
        await pageObjects.kubernetes.clickOtelAnnotationCard('namespace');

        await expect(pageObjects.kubernetes.otelAnnotationCard('namespace')).toHaveAttribute(
          'data-selected',
          'true'
        );
        await expect(pageObjects.kubernetes.otelAnnotationCard('pods')).toHaveAttribute(
          'data-selected',
          'false'
        );
        await expect(pageObjects.kubernetes.otelInstrumentationNamespaceSnippet()).toBeVisible();
        await expect(pageObjects.kubernetes.otelInstrumentationPodsSnippet()).toHaveCount(0);
      });
    });

    test('navigating to /kubernetes renders the V1 experience when V2 is disabled', async ({
      apiServices,
      page,
      pageObjects,
    }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [V2_FF_ID]: false },
      });
      await pageObjects.kubernetes.gotoPath('/kubernetes');

      await expect(pageObjects.kubernetes.layout('otel')).toHaveCount(0);
      await expect(pageObjects.kubernetes.collectionMethodSelector()).toHaveCount(0);
      await expect(page).toHaveURL(/\/kubernetes/);
      await expect(pageObjects.onboarding.kubernetesCodeSnippet).toBeVisible();
    });
  }
);
