/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS,
  ATTACK_DISCOVERY_INTERNAL_GENERATIONS_BY_ID_DISMISS,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import { type PostAttackDiscoveryGenerationsDismissResponse } from '@kbn/elastic-assistant-common';
import { replaceParams } from '@kbn/openapi-common/shared';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as ReactQuery from '@tanstack/react-query';

import { useDismissAttackDiscoveryGeneration } from '.';
import { TestProviders } from '../../../common/mock/test_providers';

const mockAddSuccessToast = jest.fn();
const mockAddError = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: (): MockUseAppToasts => ({
    addSuccessToast: (...args: unknown[]) => mockAddSuccessToast(...args),
    addError: (...args: unknown[]) => mockAddError(...args),
  }),
}));

const mockInvalidateGenerations = jest.fn();
jest.mock('../use_get_attack_discovery_generations', () => ({
  useInvalidateGetAttackDiscoveryGenerations: () => mockInvalidateGenerations,
}));

const mockUseKibanaFeatureFlags = jest.fn().mockReturnValue({
  attackDiscoveryPublicApiEnabled: true,
});
jest.mock('../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: () => mockUseKibanaFeatureFlags(),
}));

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

const mockHttpFetch = jest.fn();
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

describe('useDismissAttackDiscoveryGeneration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockHttpFetch.mockReset();
    mockAddSuccessToast.mockReset();
    mockAddError.mockReset();
    mockInvalidateGenerations.mockReset();

    // Default successful response for http.fetch
    mockHttpFetch.mockResolvedValue({} as PostAttackDiscoveryGenerationsDismissResponse);
  });

  describe('when attackDiscoveryPublicApiEnabled is false', () => {
    const spy = jest.spyOn(ReactQuery, 'useMutation');

    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({ attackDiscoveryPublicApiEnabled: false });
      mockHttpFetch.mockResolvedValue({});

      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });
    });

    afterEach(() => spy.mockClear());

    it('calls POST with the internal API route', async () => {
      const expectedInternalUrl = replaceParams(
        ATTACK_DISCOVERY_INTERNAL_GENERATIONS_BY_ID_DISMISS,
        {
          execution_uuid: 'gen1',
        }
      );

      await waitFor(() => {
        expect(mockHttpFetch).toHaveBeenCalledWith(expectedInternalUrl, expect.any(Object));
      });
    });

    it('calls POST with the internal API version', async () => {
      await waitFor(() => {
        expect(mockHttpFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            version: API_VERSIONS.internal.v1,
          })
        );
      });
    });

    it('uses the internal route in the mutation key', () => {
      const calledArgs = spy.mock.calls[0][1] as unknown;
      expect((calledArgs as { mutationKey: unknown }).mutationKey).toEqual([
        'POST',
        ATTACK_DISCOVERY_INTERNAL_GENERATIONS_BY_ID_DISMISS,
      ]);
    });
  });

  describe('when attackDiscoveryPublicApiEnabled is true', () => {
    const spy = jest.spyOn(ReactQuery, 'useMutation');

    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({ attackDiscoveryPublicApiEnabled: true });
      mockHttpFetch.mockResolvedValue({});

      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });
    });

    afterEach(() => spy.mockClear());

    it('calls POST with the public API route', async () => {
      const expectedPublicUrl = replaceParams(ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS, {
        execution_uuid: 'gen1',
      });

      await waitFor(() => {
        expect(mockHttpFetch).toHaveBeenCalledWith(expectedPublicUrl, expect.any(Object));
      });
    });

    it('calls POST with the public API version', async () => {
      await waitFor(() => {
        expect(mockHttpFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ version: API_VERSIONS.public.v1 })
        );
      });
    });

    it('uses the public route in the mutation key', () => {
      renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      const calledArgs = spy.mock.calls[0][1] as unknown;
      expect((calledArgs as { mutationKey: unknown }).mutationKey).toEqual([
        'POST',
        ATTACK_DISCOVERY_GENERATIONS_BY_ID_DISMISS,
      ]);
    });
  });

  describe('when mutate is called and mutation succeeds', () => {
    it('sets isSuccess to true', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('calls the API', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(mockHttpFetch).toHaveBeenCalled());
    });

    it('calls invalidateGenerations', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(mockInvalidateGenerations).toHaveBeenCalled());
    });

    it('does not call addError', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(mockAddError).not.toHaveBeenCalled());
    });

    it('sets isLoading to false after success', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('sets isError to false after success', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(result.current.isError).toBe(false));
    });

    it('sets error to null after success', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(result.current.error).toBeNull());
    });
  });

  describe('when mutate is called and mutation fails', () => {
    const error = new Error('Mutation failed');
    beforeEach(() => {
      mockHttpFetch.mockRejectedValue(error);
    });

    it('returns isError as true after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('calls addError after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(mockAddError).toHaveBeenCalled());
    });

    it('returns isLoading as false after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it('returns isSuccess as false after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(false));
    });

    it('returns error as the thrown error after failure', async () => {
      const { result } = renderHook(() => useDismissAttackDiscoveryGeneration(), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current.mutate({ executionUuid: 'gen1' });
      });

      await waitFor(() => expect(result.current.error).toBe(error));
    });
  });
});
