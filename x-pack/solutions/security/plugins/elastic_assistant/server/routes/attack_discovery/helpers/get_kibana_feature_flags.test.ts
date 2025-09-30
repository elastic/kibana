/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKibanaFeatureFlags } from './get_kibana_feature_flags';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';

describe('getKibanaFeatureFlags', () => {
  let featureFlagsMock: { getBooleanValue: jest.Mock };
  let contextMock: ElasticAssistantRequestHandlerContext;

  beforeEach(() => {
    featureFlagsMock = {
      getBooleanValue: jest.fn(),
    };
    contextMock = {
      core: Promise.resolve({
        featureFlags: featureFlagsMock,
      }),
    } as unknown as ElasticAssistantRequestHandlerContext;
  });

  describe('attackDiscoveryPublicApiEnabled', () => {
    it('returns true when the feature flag is enabled', async () => {
      featureFlagsMock.getBooleanValue.mockResolvedValue(true);

      const result = await getKibanaFeatureFlags(contextMock);

      expect(result.attackDiscoveryPublicApiEnabled).toBe(true);
    });

    it('returns false when the feature flag is disabled', async () => {
      featureFlagsMock.getBooleanValue.mockResolvedValue(false);

      const result = await getKibanaFeatureFlags(contextMock);

      expect(result.attackDiscoveryPublicApiEnabled).toBe(false);
    });
  });
});
