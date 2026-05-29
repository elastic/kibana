/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertCompositeSloEnabled } from './assert_composite_slo_enabled';
import type { FeatureFlagsRequestHandlerContext } from '@kbn/core-feature-flags-server';

describe('assertCompositeSloEnabled', () => {
  it('does not throw when the composite SLO feature flag is enabled', async () => {
    await expect(
      assertCompositeSloEnabled({
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
      } as unknown as { featureFlags: FeatureFlagsRequestHandlerContext })
    ).resolves.not.toThrow();
  });

  it('throws notFound when the composite SLO feature flag is disabled', async () => {
    await expect(
      assertCompositeSloEnabled({
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(false),
        },
      } as unknown as { featureFlags: FeatureFlagsRequestHandlerContext })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });
});
