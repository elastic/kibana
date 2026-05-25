/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertCompositeSloEnabled } from './assert_composite_slo_enabled';

describe('assertCompositeSloEnabled', () => {
  it('does not throw when the composite SLO feature flag is enabled', async () => {
    await expect(
      assertCompositeSloEnabled({
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
      })
    ).resolves.not.toThrow();
  });

  it('throws notFound when the composite SLO feature flag is disabled', async () => {
    await expect(
      assertCompositeSloEnabled({
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(false),
        },
      })
    ).rejects.toMatchObject({ output: { statusCode: 404 } });
  });
});
