/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKibanaFeatureFlags } from './get_kibana_feature_flags';
import { throwIfPublicApiDisabled } from './throw_if_public_api_disabled';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';

jest.mock('./get_kibana_feature_flags');

const mockGetKibanaFeatureFlags = getKibanaFeatureFlags as jest.MockedFunction<
  typeof getKibanaFeatureFlags
>;

describe('throwIfPublicApiDisabled', () => {
  let contextMock: ElasticAssistantRequestHandlerContext;

  beforeEach(() => {
    contextMock = {
      core: Promise.resolve({
        featureFlags: {
          getBooleanValue: jest.fn(),
        },
      }),
    } as unknown as ElasticAssistantRequestHandlerContext;

    jest.clearAllMocks();
  });

  describe('when the attack discovery public API is enabled', () => {
    beforeEach(() => {
      mockGetKibanaFeatureFlags.mockResolvedValue({
        attackDiscoveryPublicApiEnabled: true,
      });
    });

    it('does NOT throw an error', async () => {
      await expect(throwIfPublicApiDisabled(contextMock)).resolves.not.toThrow();
    });
  });

  describe('when the attack discovery public API is disabled', () => {
    beforeEach(() => {
      mockGetKibanaFeatureFlags.mockResolvedValue({
        attackDiscoveryPublicApiEnabled: false,
      });
    });

    it('throws an error with the correct message', async () => {
      await expect(throwIfPublicApiDisabled(contextMock)).rejects.toThrow(
        'Attack discovery public API is disabled'
      );
    });

    it('throws an error with statusCode 403', async () => {
      try {
        await throwIfPublicApiDisabled(contextMock);
      } catch (error) {
        expect(error).toHaveProperty('statusCode', 403);
      }
    });

    it('throws an Error instance', async () => {
      try {
        await throwIfPublicApiDisabled(contextMock);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('error handling', () => {
    it('propagates errors from getKibanaFeatureFlags', async () => {
      const originalError = new Error('Feature flags service error');

      mockGetKibanaFeatureFlags.mockRejectedValue(originalError);

      await expect(throwIfPublicApiDisabled(contextMock)).rejects.toThrow(
        'Feature flags service error'
      );
    });
  });
});
