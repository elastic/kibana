/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_PUBLIC_API_ENABLED_FEATURE_FLAG } from '@kbn/elastic-assistant-common';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock/test_providers';
import { useKibanaFeatureFlags } from '.';

const mockGetBooleanValueFn = jest.fn();

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn(() => ({
      services: {
        featureFlags: {
          getBooleanValue: mockGetBooleanValueFn,
        },
      },
    })),
  };
});

jest.mock('@kbn/core/public', () => ({
  HttpFetchError: class HttpFetchError extends Error {
    public statusCode: number;
    public body: unknown;
    constructor(message: string, statusCode: number, body: unknown) {
      super(message);
      this.statusCode = statusCode;
      this.body = body;
    }
  },
  uiSettings: {
    get: jest.fn((key, defaultValue) => defaultValue ?? null), // Simplified uiSettings
  },
}));

describe('useKibanaFeatureFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetBooleanValueFn.mockReturnValue(false);
  });

  it('returns false when the attack discovery public API feature flag is disabled', async () => {
    mockGetBooleanValueFn.mockReturnValue(false);

    const { result } = renderHook(() => useKibanaFeatureFlags(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await waitFor(() => {
      expect(result.current.attackDiscoveryPublicApiEnabled).toBe(false);
    });
  });

  it('returns true when the attack discovery public API feature flag is enabled', async () => {
    mockGetBooleanValueFn.mockReturnValue(true);

    const { result } = renderHook(() => useKibanaFeatureFlags(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await waitFor(() => {
      expect(result.current.attackDiscoveryPublicApiEnabled).toBe(true);
    });
  });

  it('calls getBooleanValue with the expected default value (false)', async () => {
    mockGetBooleanValueFn.mockReturnValue(false);

    renderHook(() => useKibanaFeatureFlags(), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await waitFor(() => {
      expect(mockGetBooleanValueFn).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_PUBLIC_API_ENABLED_FEATURE_FLAG,
        false // <-- expected default when the feature flag is not configured
      );
    });
  });
});
