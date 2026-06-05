/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { tags } from '@kbn/scout-oblt';
import { test } from '../fixtures';
import { setupWiredStreamsOnce } from '../fixtures/helpers/wired_streams_setup';

const V2_FF_ID = 'observability.addDataPageV2Enabled';

test.describe.serial(
  'V2 Kubernetes Onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await setupWiredStreamsOnce({ apiServices });
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
      await pageObjects.kubernetesV2.gotoLanding();
      await pageObjects.kubernetesV2.kubernetesTile().click();

      await expect(pageObjects.kubernetesV2.layout('otel')).toBeVisible();
      await expect(page).toHaveURL(/\/kubernetes(\?|$|#)/);
      await expect(pageObjects.kubernetesV2.collectionMethodSelector()).toHaveCount(0);
    });

    test('navigating to /otel-kubernetes?ingestion=wired redirects to /kubernetes?ingestion=wired', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.kubernetesV2.gotoPath('otel-kubernetes?ingestion=wired');

      await expect(page).toHaveURL(/\/kubernetes\?ingestion=wired/);
      await expect(pageObjects.kubernetesV2.layout('otel')).toBeVisible();
    });

    test('Kubernetes V2 step controls expose expected branch UI', async ({ pageObjects }) => {
      await pageObjects.kubernetesV2.gotoPath('/kubernetes');
      await expect(pageObjects.kubernetesV2.layout('otel')).toBeVisible();

      await test.step('select existing collector tab', async () => {
        await pageObjects.kubernetesV2.collectorTab('existing').click();
        await expect(pageObjects.kubernetesV2.existingCollectorTitle()).toBeVisible();
        await expect(pageObjects.kubernetesV2.existingCollectorDescription()).toBeVisible();
      });

      await test.step('enable OTel instrumentation and select namespace annotations', async () => {
        await pageObjects.kubernetesV2.otelInstrumentationSwitch().waitFor({ state: 'visible' });
        await pageObjects.kubernetesV2.otelInstrumentationSwitch().click();
        await pageObjects.kubernetesV2.clickOtelAnnotationCard('namespace');

        await expect(pageObjects.kubernetesV2.otelAnnotationCard('namespace')).toHaveAttribute(
          'data-selected',
          'true'
        );
        await expect(pageObjects.kubernetesV2.otelAnnotationCard('pods')).toHaveAttribute(
          'data-selected',
          'false'
        );
        await expect(pageObjects.kubernetesV2.otelInstrumentationNamespaceSnippet()).toBeVisible();
        await expect(pageObjects.kubernetesV2.otelInstrumentationPodsSnippet()).toHaveCount(0);
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
      await pageObjects.kubernetesV2.gotoPath('/kubernetes');

      await expect(pageObjects.kubernetesV2.layout('otel')).toHaveCount(0);
      await expect(pageObjects.kubernetesV2.collectionMethodSelector()).toHaveCount(0);
      await expect(page).toHaveURL(/\/kubernetes/);
      await expect(pageObjects.onboarding.kubernetesCodeSnippet).toBeVisible();
    });
  }
);
