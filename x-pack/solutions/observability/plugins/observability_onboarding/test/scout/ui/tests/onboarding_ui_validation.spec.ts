/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const V2_FF_ID = 'observability.addDataPageV2Enabled';

test.describe('Onboarding UI Validation', () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings({
      'feature_flags.overrides': { [V2_FF_ID]: true },
    });
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.onboarding.goto();
  });

  test(
    'validates main page structure and navigation',
    {
      tag: [...tags.stateful.classic, ...tags.serverless.observability.complete],
    },
    async ({ pageObjects }) => {
      await test.step('shows the v2 landing and core tiles', async () => {
        await expect(pageObjects.onboarding.landingWrapper).toBeVisible();
        await expect(pageObjects.host.hostTile('linux')).toBeVisible();
        await expect(pageObjects.host.hostTile('macos')).toBeVisible();
        await expect(pageObjects.host.hostTile('windows')).toBeVisible();
        await expect(pageObjects.onboarding.integrationTile('kubernetes')).toBeVisible();
        await expect(pageObjects.onboarding.integrationTile('aws')).toBeVisible();
        await expect(pageObjects.onboarding.integrationTile('azure')).toBeVisible();
        await expect(pageObjects.onboarding.integrationTile('gcp')).toBeVisible();
      });
    }
  );

  // Test fails on MKI: https://github.com/elastic/kibana/issues/248276
  test(
    'navigates correctly within Host Auto-Detect flow',
    {
      tag: [
        '@local-stateful-classic',
        '@local-serverless-observability_complete',
        '@local-serverless-observability_logs_essentials',
      ],
    },
    async ({ page, pageObjects }) => {
      await pageObjects.host.clickHostTile('linux');
      await pageObjects.host.collectionMethodCard('auto-detect').click();
      await expect(page).toHaveURL(/\/host\/linux\/auto-detect/);
    }
  );

  // Test fails on MKI: https://github.com/elastic/kibana/issues/267179
  test(
    'navigates correctly within Host OTel flow',
    {
      tag: [
        '@local-stateful-classic',
        '@local-serverless-observability_complete',
        '@local-serverless-observability_logs_essentials',
      ],
    },
    async ({ page, pageObjects }) => {
      await test.step('Linux tile opens the host flow with OTel selected', async () => {
        await pageObjects.host.clickHostTile('linux');
        await expect(page).toHaveURL(/\/host\/linux(\?|$|#)/);
        await expect(pageObjects.host.collectionMethodCard('otel')).toHaveAttribute(
          'data-selected',
          'true'
        );
      });
    }
  );

  // Test fails on MKI: https://github.com/elastic/kibana/issues/287357
  test(
    'navigates to the Kubernetes OpenTelemetry flow from the landing tile',
    {
      tag: [
        '@local-stateful-classic',
        '@local-serverless-observability_complete',
        '@local-serverless-observability_logs_essentials',
      ],
    },
    async ({ page, pageObjects }) => {
      await pageObjects.onboarding.clickKubernetesTile();
      await expect(page).toHaveURL(/\/kubernetes(\?|$|#)/);
    }
  );

  // Test fails on MKI: https://github.com/elastic/kibana/issues/287358
  test(
    'validates logs-essentials tier restrictions',
    { tag: ['@local-serverless-observability_logs_essentials'] },
    async ({ pageObjects }) => {
      await test.step('keeps Applications off the landing and hides metrics-only More tiles', async () => {
        await expect(pageObjects.onboarding.integrationTile('apm')).toBeHidden();
        await expect(pageObjects.onboarding.integrationTile('synthetic_monitor')).toBeHidden();
        await expect(pageObjects.onboarding.miniTile('opentelemetry')).toBeVisible();
        await expect(pageObjects.onboarding.miniTile('prometheus')).toBeHidden();
        await expect(pageObjects.onboarding.miniTile('supabase')).toBeHidden();
      });
    }
  );
});
