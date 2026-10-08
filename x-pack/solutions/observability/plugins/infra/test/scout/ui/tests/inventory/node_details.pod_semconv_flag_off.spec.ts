/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { SEMCONV_PODS } from '../../fixtures/constants';

const SEMCONV_POD = SEMCONV_PODS[0];

test.describe(
  'Pod Metric Detail - schema selector flag off',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Sequential project so turning the pod schema flag off cannot leak into
    // parallel Inventory workers. This URL check does not need indexed pods.
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'observability.infra.podSchemaSelectorEnabled': false,
        },
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('ignores a leftover OpenTelemetry URL', async ({ page, kbnUrl }) => {
      const metadataRequest = page.waitForRequest(
        (request) => request.method() === 'POST' && request.url().includes('/api/infra/metadata')
      );

      await page.goto(
        `${kbnUrl.app('metrics')}/detail/pod/${
          SEMCONV_POD.uid
        }?assetDetails=(preferredSchema:semconv)`
      );

      const metadata = await metadataRequest;
      expect(metadata.postDataJSON().schema).toBeUndefined();
      expect(metadata.postDataJSON().nodeId).toBe(SEMCONV_POD.uid);
    });
  }
);
