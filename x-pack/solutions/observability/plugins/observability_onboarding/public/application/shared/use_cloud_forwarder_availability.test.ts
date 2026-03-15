/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCloudForwarderAvailability } from './use_cloud_forwarder_availability';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

describe('useCloudForwarderAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when running in Serverless context regardless of feature flag', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: () => false,
        },
        context: { isServerless: true, isCloud: true },
      },
    });

    const { result } = renderHook(() => useCloudForwarderAvailability());

    expect(result.current).toBe(true);
  });

  it('returns true when running in Cloud context and feature flag is enabled', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: () => true,
        },
        context: { isServerless: false, isCloud: true },
      },
    });

    const { result } = renderHook(() => useCloudForwarderAvailability());

    expect(result.current).toBe(true);
  });

  it('returns false when running in Cloud context and feature flag is disabled', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: () => false,
        },
        context: { isServerless: false, isCloud: true },
      },
    });

    const { result } = renderHook(() => useCloudForwarderAvailability());

    expect(result.current).toBe(false);
  });

  it('returns false when running on-premise (not Cloud, not Serverless)', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: () => true, // Even if flag would be true
        },
        context: { isServerless: false, isCloud: false },
      },
    });

    const { result } = renderHook(() => useCloudForwarderAvailability());

    expect(result.current).toBe(false);
  });
});
