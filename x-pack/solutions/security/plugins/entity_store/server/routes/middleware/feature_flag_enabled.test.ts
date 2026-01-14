/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { featureFlagEnabledMiddleware } from './feature_flag_enabled';
import { loggerMock } from '@kbn/logging-mocks';

describe('featureFlagEnabledMiddleware', () => {
  let mockCtx: any;
  let mockReq: any;
  let mockRes: any;
  let mockEntityStoreCtx: any;
  let mockFeatureFlags: any;

  beforeEach(() => {
    mockFeatureFlags = {
      isEntityStoreV2Enabled: jest.fn(),
    };
    mockEntityStoreCtx = {
      logger: loggerMock.create(),
      featureFlags: mockFeatureFlags,
    };
    mockCtx = {
      entityStore: Promise.resolve(mockEntityStoreCtx),
    };
    mockReq = {};
    mockRes = {
      customError: jest.fn(({ statusCode, body }) => ({
        status: statusCode,
        payload: body,
      })),
    };
  });

  it('should return nothing if Entity Store V2 is enabled', async () => {
    mockFeatureFlags.isEntityStoreV2Enabled.mockResolvedValue(true);
    const result = await featureFlagEnabledMiddleware(mockCtx, mockReq, mockRes);
    expect(result).toBeUndefined();
  });

  it('should return 403 if Entity Store V2 is not enabled', async () => {
    mockFeatureFlags.isEntityStoreV2Enabled.mockResolvedValue(false);
    const result = await featureFlagEnabledMiddleware(mockCtx, mockReq, mockRes);

    expect(mockRes.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: {
        message: 'Entity store v2 not enabled (feature flag not enabled)',
      },
    });

    expect(result).toEqual({
      status: 403,
      payload: {
        message: 'Entity store v2 not enabled (feature flag not enabled)',
      },
    });
  });
});
