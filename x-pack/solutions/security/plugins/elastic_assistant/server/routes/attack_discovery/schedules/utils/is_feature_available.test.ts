/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AwaitedProperties } from '@kbn/utility-types';
import { ElasticAssistantRequestHandlerContext } from '../../../../types';
import { isFeatureAvailable } from './is_feature_available';

const getBooleanValueMock = jest.fn();
const mockContext = {
  core: {
    featureFlags: {
      getBooleanValue: getBooleanValueMock,
    },
  },
} as unknown as AwaitedProperties<ElasticAssistantRequestHandlerContext>;

describe('isFeatureAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call feature flags service with the correct attributes', async () => {
    void isFeatureAvailable(mockContext);

    expect(getBooleanValueMock).toHaveBeenCalledWith(
      'securitySolution.assistantAttackDiscoverySchedulingEnabled',
      false
    );
  });
});
