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

    test('Kubernetes tile navigates to /kubernetes with OTel as the selected collection method', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.kubernetesV2.gotoLanding();
      await pageObjects.kubernetesV2.kubernetesTile().click();

      await expect(pageObjects.kubernetesV2.layout('otel')).toBeVisible();
      await expect(page).toHaveURL(/\/kubernetes(\?|$|#)/);
      await expect(pageObjects.kubernetesV2.collectionMethodSelector()).toBeVisible();
      await expect(pageObjects.kubernetesV2.collectionMethodCard('otel')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });

    test('Kubernetes collection method selector toggles between OTel and Elastic Agent', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.kubernetesV2.gotoPath('/kubernetes');

      await pageObjects.kubernetesV2.collectionMethodCard('elastic-agent').click();
      await expect(page).toHaveURL(/\/kubernetes\/elastic-agent/);

      await pageObjects.kubernetesV2.collectionMethodCard('otel').click();
      // Anchored so /kubernetes/elastic-agent and /kubernetes/foo do not match.
      await expect(page).toHaveURL(/\/kubernetes(\?|$|#)/);
    });

    test('Kubernetes ingestion mode persists across the collection method toggle', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.kubernetesV2.gotoPath('/kubernetes');
      await pageObjects.kubernetesV2.ingestionSelector().waitFor({ state: 'visible' });

      await test.step('select Wired Streams ingestion', async () => {
        await pageObjects.onboarding.selectWiredStreams();
        await pageObjects.onboarding.confirmEnableWiredStreamsModalIfPresent();
        await expect(page).toHaveURL(/ingestion=wired/);
      });

      await test.step('switch collection method to Elastic Agent', async () => {
        await pageObjects.kubernetesV2.collectionMethodCard('elastic-agent').click();
        await expect(page).toHaveURL(/\/kubernetes\/elastic-agent.*ingestion=wired/);
      });

      await test.step('ingestion mode survives the collection method switch', async () => {
        await expect(pageObjects.onboarding.wiredStreamsOption).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });
    });

    test('navigating to /otel-kubernetes?ingestion=wired redirects to /kubernetes?ingestion=wired', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.kubernetesV2.gotoPath('otel-kubernetes?ingestion=wired');

      await expect(page).toHaveURL(/\/kubernetes\?ingestion=wired/);
      await expect(pageObjects.kubernetesV2.layout('otel')).toBeVisible();
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
      await expect(pageObjects.kubernetesV2.layout('elastic-agent')).toHaveCount(0);
      await expect(pageObjects.kubernetesV2.collectionMethodSelector()).toHaveCount(0);
      await expect(page).toHaveURL(/\/kubernetes/);
      await expect(pageObjects.onboarding.kubernetesCodeSnippet).toBeVisible();
    });
  }
);
