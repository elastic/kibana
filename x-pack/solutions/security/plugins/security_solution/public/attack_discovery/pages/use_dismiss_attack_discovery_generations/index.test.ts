/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PostAttackDiscoveryGenerationsDismissResponse } from '@kbn/elastic-assistant-common';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useDismissAttackDiscoveryGeneration } from '.';
import { TestProviders } from '../../../common/mock/test_providers';

const mockHttpFetch = jest.fn();
const mockAddSuccessToast = jest.fn();
const mockAddError = jest.fn();
const mockInvalidateGenerations = jest.fn();
const mockUseKibanaFeatureFlags = jest.fn();

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn((key, { defaultMessage }) => defaultMessage),
    getIsInitialized: jest.fn(() => true),
    getTranslation: jest.fn(() => ({
      messages: {},
      formats: {},
      locale: 'en',
      defaultLocale: 'en',
      defaultFormats: {},
    })),
  },
}));

interface MockHttp {
  post: (...args: unknown[]) => unknown;
  fetch: (...args: unknown[]) => unknown;
}

interface MockKibanaServices {
  get: jest.Mock<
    {
      http: MockHttp;
    },
    []
  >;
}

interface MockUseKibanaReturn {
  services: {
    http: MockHttp;
    upselling: Record<string, unknown>;
  };
}

jest.mock(
  '../../../common/lib/kibana',
  (): {
    KibanaServices: MockKibanaServices;
    useKibana: jest.Mock<MockUseKibanaReturn, []>;
  } => ({
    KibanaServices: {
      get: jest.fn().mockReturnValue({
        http: {
          post: (...args: unknown[]) => mockHttpFetch(...args),
          fetch: (...args: unknown[]) => mockHttpFetch(...args),
        },
      }),
    },
    useKibana: jest.fn().mockReturnValue({
      services: {
        http: {
          post: (...args: unknown[]) => mockHttpFetch(...args),
          fetch: (...args: unknown[]) => mockHttpFetch(...args),
        },
        upselling: {}, // Add any other required services here
      },
    }),
  })
);

interface MockUseAppToasts {
  addSuccessToast: (...args: unknown[]) => unknown;
  addError: (...args: unknown[]) => unknown;
}

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: (): MockUseAppToasts => ({
    addSuccessToast: (...args: unknown[]) => mockAddSuccessToast(...args),
    addError: (...args: unknown[]) => mockAddError(...args),
  }),
}));

jest.mock('../use_get_attack_discovery_generations', () => ({
  useInvalidateGetAttackDiscoveryGenerations: () => mockInvalidateGenerations,
}));

jest.mock('../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: () => mockUseKibanaFeatureFlags(),
}));

describe('useDismissAttackDiscoveryGeneration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockHttpFetch.mockReset();
    mockAddSuccessToast.mockReset();
    mockAddError.mockReset();
    mockInvalidateGenerations.mockReset();
    mockUseKibanaFeatureFlags.mockReset();

    // Default mock implementations
    mockUseKibanaFeatureFlags.mockReturnValue({
      attackDiscoveryAlertsEnabled: true, // Default to true
    });
    // Default successful response for http.fetch
    mockHttpFetch.mockResolvedValue({} as PostAttackDiscoveryGenerationsDismissResponse);
  });

  describe('when attackDiscoveryAlertsEnabled is false', () => {
    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({
        attackDiscoveryAlertsEnabled: false,
      });
    });

    it('returns isLoading as false', () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('returns isSuccess as false', () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });
      expect(result.current.isSuccess).toBe(false);
    });

    it('returns isError as false', () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });
      expect(result.current.isError).toBe(false);
    });

    it('returns error as null', () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('when mutate is called and feature flag is true and mutation succeeds', () => {
    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({
        attackDiscoveryAlertsEnabled: true,
      });
    });

    it('sets isSuccess to true', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('calls the API', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(mockHttpFetch).toHaveBeenCalled());
    });

    it('calls invalidateGenerations', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(mockInvalidateGenerations).toHaveBeenCalled());
    });

    it('does not call addError', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(mockAddError).not.toHaveBeenCalled());
    });

    it('sets isLoading to false after success', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('sets isError to false after success', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it('sets error to null after success', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(result.current.error).toBeNull());
    });
  });

  describe('when mutate is called and feature flag is true and mutation fails', () => {
    const error = new Error('Mutation failed');
    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({
        attackDiscoveryAlertsEnabled: true,
      });
      mockHttpFetch.mockRejectedValue(error);
    });

    it('returns isError as true after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('calls addError after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(mockAddError).toHaveBeenCalled());
    });

    it('returns isLoading as false after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('returns isSuccess as false after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(false));
    });
    it('returns error as the thrown error after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1', attackDiscoveryAlertsEnabled: true });
      });

      await waitFor(() => expect(result.current.error).toBe(error));
    });
  });
});
