/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { tags } from '@kbn/scout-oblt';
import { test } from '../fixtures';

// Cold mount after a full-page `gotoApp` reload can exceed the default 10s
// `expect` timeout under CI load, so post-reload render waits get a larger budget.
const APP_BOOT_TIMEOUT = 30_000;

test.describe.serial(
  'Kubernetes Onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('Kubernetes tile navigates directly to the OTel Kubernetes flow', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.onboarding.goto();
      await pageObjects.onboarding.selectKubernetesUseCase();

      await expect(page).toHaveURL(/\/kubernetes(\?|$|#)/);
      await expect(pageObjects.kubernetes.layout('otel')).toBeVisible();
      await expect(pageObjects.kubernetes.collectionMethodSelector()).toHaveCount(0);
    });

    test('navigating to /otel-kubernetes redirects to /kubernetes without deprecated ingestion param', async ({
      pageObjects,
      page,
    }) => {
      await pageObjects.kubernetes.gotoPath('otel-kubernetes?ingestion=wired&foo=bar');

      // Wait for the redirected page to render first (absorbs SPA cold-boot latency),
      // then assert the URL, which has already settled by then.
      await expect(pageObjects.kubernetes.layout('otel')).toBeVisible({
        timeout: APP_BOOT_TIMEOUT,
      });
      await expect(page).toHaveURL(/\/kubernetes\?foo=bar/);
    });

    test('Kubernetes step controls expose expected branch UI', async ({ pageObjects }) => {
      await pageObjects.kubernetes.gotoPath('/kubernetes');
      await expect(pageObjects.kubernetes.layout('otel')).toBeVisible({
        timeout: APP_BOOT_TIMEOUT,
      });

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
  }
);
