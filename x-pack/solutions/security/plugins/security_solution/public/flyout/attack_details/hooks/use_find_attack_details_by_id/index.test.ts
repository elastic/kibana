/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFindAttackDetailsById } from '.';
import * as reactQuery from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibanaFeatureFlags } from '../../../../attack_discovery/pages/use_kibana_feature_flags';
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

jest.mock('@kbn/react-query');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../attack_discovery/pages/use_kibana_feature_flags');
jest.mock('@kbn/elastic-assistant-common');

describe('useFindAttackDetailsById', () => {
  // Strongly type all mocks (no `any`)
  const mockUseQuery = reactQuery.useQuery as unknown as jest.MockedFunction<
    typeof reactQuery.useQuery
  >;
  const mockUseAppToasts = useAppToasts as unknown as jest.MockedFunction<typeof useAppToasts>;
  const mockUseKibanaFeatureFlags = useKibanaFeatureFlags as unknown as jest.MockedFunction<
    typeof useKibanaFeatureFlags
  >;
  const mockTransform = transformAttackDiscoveryAlertFromApi as unknown as jest.MockedFunction<
    typeof transformAttackDiscoveryAlertFromApi
  >;

  const mockAddError = jest.fn();
  const mockRefetch = jest.fn();

  // Properly typed HttpSetup.fetch mock
  const mockHttpFetch = jest.fn() as unknown as HttpSetup['fetch'];
  const mockHttp: HttpSetup = {
    fetch: mockHttpFetch,
  } as HttpSetup;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppToasts.mockReturnValue({ addError: mockAddError } as unknown as ReturnType<
      typeof useAppToasts
    >);
  });

  it('exposes undefined when public API response has an empty data array', () => {
    mockUseKibanaFeatureFlags.mockReturnValue({ attackDiscoveryPublicApiEnabled: true });

    // Make useQuery return a "post-select" shaped value
    mockUseQuery.mockReturnValue({
      data: {
        connector_names: ['c1'],
        data: [],
        page: 1,
        per_page: 1,
        total: 0,
        unique_alert_ids_count: 0,
        unique_alert_ids: [],
      },
      error: undefined,
      isLoading: false,
      refetch: mockRefetch,
      status: 'success',
    } as unknown as ReturnType<typeof reactQuery.useQuery>);

    // Local http with typed fetch (unused here but typed)
    const localFetch = jest.fn() as unknown as HttpSetup['fetch'];
    const localHttp: HttpSetup = { fetch: localFetch } as HttpSetup;

    const { result } = renderHook(() =>
      useFindAttackDetailsById({
        id: 'doc-1',
        http: localHttp,
        isAssistantEnabled: true,
      })
    );

    expect(result.current.data).toBeUndefined();
  });

  describe('public API enabled', () => {
    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({
        attackDiscoveryPublicApiEnabled: true,
      });
    });

    it('uses public route and includes enable_field_rendering and with_replacements in query', async () => {
      const mockTransformed = {
        id: 'attack-1',
        timestamp: '2024-01-01T00:00:00Z',
        title: 'Test Attack',
        alertIds: ['alert-1'],
        connectorId: 'connector-1',
        connectorName: 'Test Connector',
        detailsMarkdown: '# Details',
        generationUuid: 'uuid-1',
        summaryMarkdown: '# Summary',
      };
      const mockTransformedResponse = {
        connector_names: ['connector1'],
        data: [mockTransformed],
        page: 1,
        per_page: 1,
        total: 1,
        unique_alert_ids_count: 1,
        unique_alert_ids: ['alert-1'],
      };

      // Resolve the fetch with API-shaped response
      (mockHttpFetch as unknown as jest.Mock).mockResolvedValue(
        mockTransformedResponse as AttackDiscoveryFindResponse
      );

      mockTransform.mockReturnValue(mockTransformed as unknown);

      let capturedQueryFn: (() => Promise<unknown>) | undefined;
      // Keep only what we need from options (no any)
      let capturedOptions:
        | {
            select?: (
              response: AttackDiscoveryFindResponse | AttackDiscoveryFindInternalResponse
            ) => unknown;
          }
        | undefined;

      mockUseQuery.mockImplementation((key, queryFn, options) => {
        capturedQueryFn = queryFn as (() => Promise<unknown>) | undefined;
        capturedOptions = options as typeof capturedOptions;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
          refetch: mockRefetch,
          status: 'idle',
        } as unknown as ReturnType<typeof reactQuery.useQuery>;
      });

      renderHook(() =>
        useFindAttackDetailsById({
          id: 'doc-1',
          http: mockHttp,
          isAssistantEnabled: true,
        })
      );

      expect(mockUseQuery).toHaveBeenCalled();

      // Execute the captured query function
      await capturedQueryFn?.();

      expect(mockHttpFetch as unknown as jest.Mock).toHaveBeenCalledWith(ATTACK_DISCOVERY_FIND, {
        method: 'GET',
        version: API_VERSIONS.public.v1,
        query: {
          ids: ['doc-1'],
          page: 1,
          per_page: 1,
          enable_field_rendering: true,
          with_replacements: false,
        },
        signal: expect.any(AbortSignal),
      });
    });

    it('exposes first item of transformed data array', () => {
      const mockTransformed = {
        id: 'attack-1',
        timestamp: '2024-01-01T00:00:00Z',
        title: 'Test Attack',
        alertIds: ['alert-1'],
        connectorId: 'connector-1',
        connectorName: 'Test Connector',
        detailsMarkdown: '# Details',
        generationUuid: 'uuid-1',
        summaryMarkdown: '# Summary',
      };

      mockTransform.mockReturnValue(mockTransformed);

      const mockTransformedResponse = {
        connector_names: ['connector1'],
        data: [mockTransformed],
        page: 1,
        per_page: 1,
        total: 1,
        unique_alert_ids_count: 1,
        unique_alert_ids: ['alert-1'],
      };

      mockUseQuery.mockReturnValue({
        data: mockTransformedResponse,
        error: undefined,
        isLoading: false,
        refetch: mockRefetch,
        status: 'success',
      } as unknown as ReturnType<typeof reactQuery.useQuery>);

      const { result } = renderHook(() =>
        useFindAttackDetailsById({
          id: 'doc-1',
          http: mockHttp,
          isAssistantEnabled: true,
        })
      );

      expect(result.current.data).toEqual(mockTransformed);
    });
  });

  describe('internal API enabled', () => {
    beforeEach(() => {
      mockUseKibanaFeatureFlags.mockReturnValue({
        attackDiscoveryPublicApiEnabled: false,
      });
    });

    it('uses internal route and does not include extra query flags', async () => {
      let capturedQueryFn: (() => Promise<unknown>) | undefined;

      mockUseQuery.mockImplementation((key, queryFn) => {
        capturedQueryFn = queryFn as (() => Promise<unknown>) | undefined;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
          refetch: mockRefetch,
          status: 'idle',
        } as unknown as ReturnType<typeof reactQuery.useQuery>;
      });

      (mockHttpFetch as unknown as jest.Mock).mockResolvedValue({
        some_internal_field: 'value',
      } as unknown as AttackDiscoveryFindInternalResponse);

      renderHook(() =>
        useFindAttackDetailsById({
          id: 'doc-2',
          http: mockHttp,
          isAssistantEnabled: true,
        })
      );

      await capturedQueryFn?.();

      expect(mockHttpFetch as unknown as jest.Mock).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_INTERNAL_FIND,
        {
          method: 'GET',
          version: API_VERSIONS.internal.v1,
          query: {
            ids: ['doc-2'],
            page: 1,
            per_page: 1,
          },
          signal: expect.any(AbortSignal),
        }
      );
    });

    it('returns raw response when internal API is used', () => {
      let capturedOptions:
        | {
            select?: (
              response: AttackDiscoveryFindResponse | AttackDiscoveryFindInternalResponse
            ) => unknown;
          }
        | undefined;

      mockUseQuery.mockImplementation((key, _queryFn, options) => {
        capturedOptions = options as typeof capturedOptions;
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
          refetch: mockRefetch,
          status: 'idle',
        } as unknown as ReturnType<typeof reactQuery.useQuery>;
      });

      renderHook(() =>
        useFindAttackDetailsById({
          id: 'doc-2',
          http: mockHttp,
          isAssistantEnabled: true,
        })
      );

      const mockInternalResponse = { some_internal_field: 'value' };

      const selected = capturedOptions?.select
        ? capturedOptions.select(
            mockInternalResponse as unknown as AttackDiscoveryFindInternalResponse
          )
        : undefined;

      expect(selected).toEqual(mockInternalResponse);
    });

    it('does not expose data when internal API is used', () => {
      mockUseQuery.mockReturnValue({
        data: { some_internal_field: 'value' },
        error: undefined,
        isLoading: false,
        refetch: mockRefetch,
        status: 'success',
      } as unknown as ReturnType<typeof reactQuery.useQuery>);

      const { result } = renderHook(() =>
        useFindAttackDetailsById({
          id: 'doc-2',
          http: mockHttp,
          isAssistantEnabled: true,
        })
      );

      expect(result.current.data).toBeUndefined();
    });
  });
});
