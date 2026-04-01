/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext, KibanaResponseFactory } from '@kbn/core/server';

import { ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG, assertFeatureFlagEnabled } from '.';

describe('assertFeatureFlagEnabled', () => {
  const mockGetBooleanValue = jest.fn();

  const coreContext = {
    featureFlags: {
      getBooleanValue: mockGetBooleanValue,
    },
  } as unknown as CoreRequestHandlerContext;

  const mockNotFound = jest.fn().mockReturnValue('not-found-response');

  const response = {
    notFound: mockNotFound,
  } as unknown as KibanaResponseFactory;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the feature flag is enabled', async () => {
    mockGetBooleanValue.mockResolvedValue(true);

    const result = await assertFeatureFlagEnabled({ coreContext, response });

    expect(result).toBeNull();
    expect(mockGetBooleanValue).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG,
      false
    );
  });

  it('returns a 404 response when the feature flag is disabled', async () => {
    mockGetBooleanValue.mockResolvedValue(false);

    const result = await assertFeatureFlagEnabled({ coreContext, response });

    expect(result).toBe('not-found-response');
    expect(mockNotFound).toHaveBeenCalledWith({
      body: { message: 'Attack Discovery workflows are not enabled' },
    });
  });

  it('defaults to false when the feature flag value is not set', async () => {
    mockGetBooleanValue.mockResolvedValue(false);

    const result = await assertFeatureFlagEnabled({ coreContext, response });

    expect(result).toBe('not-found-response');
    expect(mockGetBooleanValue).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG,
      false
    );
  });
});
