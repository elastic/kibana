/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ReactQuery from '@tanstack/react-query';
import type { HttpSetup } from '@kbn/core/public';
import React from 'react';

import {
  API_VERSIONS,
  ATTACK_DISCOVERY_FIND,
  ATTACK_DISCOVERY_INTERNAL_FIND,
  transformAttackDiscoveryAlertFromApi,
} from '@kbn/elastic-assistant-common';
import type {
  AttackDiscoveryFindInternalResponse,
  AttackDiscoveryFindResponse,
} from '@kbn/elastic-assistant-common';

import { useFindAttackDiscoveries, useInvalidateFindAttackDiscoveries } from '.';
import { getMockAttackDiscoveryAlerts } from '../mock/mock_attack_discovery_alerts';
import { ERROR_FINDING_ATTACK_DISCOVERIES } from './translations';

const mockAddError = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
    remove: jest.fn(),
  }),
  get mockAddError() {
    return mockAddError;
  },
}));

const mockHttp: HttpSetup = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

const mockUseKibanaFeatureFlags = jest.fn().mockReturnValue({
  attackDiscoveryPublicApiEnabled: false,
});
jest.mock('../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: () => mockUseKibanaFeatureFlags(),
}));

let queryClient: QueryClient;
const defaultProps = {
  http: mockHttp,
  isAssistantEnabled: true,
};

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useFindAttackDiscoveries', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient();
  });

  it('calls addError with the expected title', async () => {
    const errorBody = { message: 'Server error message' };
    const error = { body: errorBody };
    (mockHttp.fetch as jest.Mock).mockRejectedValueOnce(error);

    renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      const callArgs = mockAddError.mock.calls[0];
      expect(callArgs[1]?.title).toBe(ERROR_FINDING_ATTACK_DISCOVERIES);
    });
  });

  it('returns an error when a server error body is present', async () => {
    const errorBody = { message: 'Server error message' };
    const error = { body: errorBody };
    (mockHttp.fetch as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('returns data when the request succeeds', async () => {
    const mockData = {
      connector_names: ['GPT-4o'],
      data: getMockAttackDiscoveryAlerts(),
      total: getMockAttackDiscoveryAlerts().length,
      page: 1,
      per_page: 10,
      unique_alert_ids_count: getMockAttackDiscoveryAlerts().length,
    };
    (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('when attackDiscoveryPublicApiEnabled is false', () => {
    beforeEach(() => {
      // default stub; individual tests will override with specific responses
      (mockHttp.fetch as jest.Mock).mockResolvedValue({});
    });

    it('calls GET with the internal API route', async () => {
      renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          ATTACK_DISCOVERY_INTERNAL_FIND,
          expect.any(Object)
        );
      });
    });

    it('calls GET with the internal API version', async () => {
      renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            version: API_VERSIONS.internal.v1,
          })
        );
      });
    });

    it('returns the internal-shaped data unmodified when using the internal API', async () => {
      const expected: AttackDiscoveryFindInternalResponse = {
        connector_names: ['GPT-4o'],
        data: getMockAttackDiscoveryAlerts(),
        total: getMockAttackDiscoveryAlerts().length,
        page: 1,
        per_page: 10,
        unique_alert_ids_count: getMockAttackDiscoveryAlerts().length,
      };

      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(expected);

      const { result } = renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(expected);
      });
    });

    it('does NOT include the with_replacements parameter in the request query when using the internal API', async () => {
      renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        // internal API should NOT receive a `with_replacements` parameter at all
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.not.objectContaining({ with_replacements: expect.anything() }),
          })
        );
      });
    });

    it('does NOT include the enable_field_rendering parameter in the request query when using the internal API', async () => {
      renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        // internal API should NOT receive an `enable_field_rendering` parameter at all
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.not.objectContaining({ enable_field_rendering: expect.anything() }),
          })
        );
      });
    });
  });

  describe('when attackDiscoveryPublicApiEnabled is true', () => {
    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({
        attackDiscoveryPublicApiEnabled: true,
      });
      (mockHttp.fetch as jest.Mock).mockResolvedValue({});
    });

    it('calls GET with the public API route', async () => {
      renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          ATTACK_DISCOVERY_FIND,
          expect.objectContaining({
            version: API_VERSIONS.public.v1,
          })
        );
      });
    });

    it('calls GET with the public API version', async () => {
      renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            version: API_VERSIONS.public.v1,
          })
        );
      });
    });

    it('returns transformed, UI-shaped data when using the public API', async () => {
      const timestamp = '2025-01-02T03:04:05.678Z';

      const apiResponse: AttackDiscoveryFindResponse = {
        connector_names: ['GPT-4o'],
        data: [
          // minimal API-shaped item; transform will determine the internal shape
          {
            id: '1',
            timestamp,
            title: 'T',
            alert_ids: [],
            connector_id: 'c',
            connector_name: 'GPT-4o',
            details_markdown: 'd',
            generation_uuid: 'g',
            summary_markdown: 's',
          },
        ],
        total: 1,
        page: 1,
        per_page: 10,
        unique_alert_ids_count: 1,
      };

      (mockHttp.fetch as jest.Mock).mockResolvedValueOnce(apiResponse);

      const expected: AttackDiscoveryFindInternalResponse = {
        connector_names: apiResponse.connector_names,
        data: apiResponse.data.map((d) => transformAttackDiscoveryAlertFromApi(d)),
        page: apiResponse.page,
        per_page: apiResponse.per_page,
        total: apiResponse.total,
        unique_alert_ids_count: apiResponse.unique_alert_ids_count,
        unique_alert_ids: apiResponse.unique_alert_ids ?? undefined,
      };

      const { result } = renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(expected);
      });
    });

    it('includes `with_replacements: false` in the request query when using the public API', async () => {
      renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.objectContaining({ with_replacements: false }),
          })
        );
      });
    });

    it('includes `enable_field_rendering: true` in the request query when using the public API', async () => {
      renderHook(() => useFindAttackDiscoveries({ ...defaultProps }), {
        wrapper,
      });

      await waitFor(() => {
        expect(mockHttp.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: expect.objectContaining({ enable_field_rendering: true }),
          })
        );
      });
    });
  });
});

describe('useInvalidateFindAttackDiscoveries', () => {
  it('calls invalidateQueries with the internal generations route when the feature flag is false', () => {
    const invalidateQueries = jest.fn();
    jest
      .spyOn(ReactQuery, 'useQueryClient')
      .mockReturnValue({ invalidateQueries } as unknown as ReturnType<
        typeof ReactQuery.useQueryClient
      >);

    mockUseKibanaFeatureFlags.mockReturnValue({ attackDiscoveryPublicApiEnabled: false }); // <-- feature flag disabled

    const { result } = renderHook(() => useInvalidateFindAttackDiscoveries());
    result.current();

    expect(invalidateQueries).toHaveBeenCalledWith(['GET', ATTACK_DISCOVERY_INTERNAL_FIND], {
      refetchType: 'all',
    });
  });

  it('calls invalidateQueries with the public generations route when the feature flag is true', () => {
    const invalidateQueries = jest.fn();
    jest
      .spyOn(ReactQuery, 'useQueryClient')
      .mockReturnValue({ invalidateQueries } as unknown as ReturnType<
        typeof ReactQuery.useQueryClient
      >);

    mockUseKibanaFeatureFlags.mockReturnValue({ attackDiscoveryPublicApiEnabled: true }); // <-- feature flag

    const { result } = renderHook(() => useInvalidateFindAttackDiscoveries());
    result.current();

    expect(invalidateQueries).toHaveBeenCalledWith(['GET', ATTACK_DISCOVERY_FIND], {
      refetchType: 'all',
    });
  });
});
