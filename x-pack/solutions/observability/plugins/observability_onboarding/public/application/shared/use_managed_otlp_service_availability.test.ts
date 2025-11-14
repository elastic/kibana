/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useManagedOtlpServiceAvailability } from './use_managed_otlp_service_availability';

jest.mock('@kbn/kibana-react-plugin/public', () => {
  return {
    useKibana: jest.fn(),
  };
});

describe('useManagedOtlpServiceAvailability', () => {
  it('returns true when running in Serverless context even if feature flag is disabled', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: () => false,
        },
        observability: { config: { managedOtlpServiceUrl: 'https://example.com' } },
        context: { isServerless: true },
      },
    });

    const { result } = renderHook(() => useManagedOtlpServiceAvailability());

    expect(result.current).toBe(true);
  });

  it('returns false when OTLP feature is disabled even when OTLP service URL is available', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: () => false,
        },
        observability: { config: { managedOtlpServiceUrl: 'https://example.com' } },
        context: { isServerless: false },
      },
    });

    const { result } = renderHook(() => useManagedOtlpServiceAvailability());

    expect(result.current).toBe(false);
  });

  it('returns false when OTLP feature is enabled but no OTLP service URL is available', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: () => true,
        },
        observability: { config: { managedOtlpServiceUrl: '' } },
        context: { isServerless: false },
      },
    });

    const { result } = renderHook(() => useManagedOtlpServiceAvailability());

    expect(result.current).toBe(false);
  });

  it('returns true when OTLP feature is enabled and OTLP service URL is available', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: () => true,
        },
        observability: { config: { managedOtlpServiceUrl: 'https://example.com' } },
        context: { isServerless: false },
      },
    });

    const { result } = renderHook(() => useManagedOtlpServiceAvailability());

    expect(result.current).toBe(true);
  });
});
