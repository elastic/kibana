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

import { useFindAttackDiscoveries, useInvalidateFindAttackDiscoveries } from '.';
import { getMockAttackDiscoveryAlerts } from '../mock/mock_attack_discovery_alerts';
import { ERROR_FINDING_ATTACK_DISCOVERIES } from './translations';
import * as useKibanaFeatureFlagsModule from '../use_kibana_feature_flags';

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

jest.mock('../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: jest.fn(),
}));

const mockHttp: HttpSetup = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

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

    (useKibanaFeatureFlagsModule.useKibanaFeatureFlags as jest.Mock).mockReturnValue({
      attackDiscoveryAlertsEnabled: true,
    });
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
});

describe('useInvalidateFindAttackDiscoveries', () => {
  it('returns a function that calls invalidateQueries', () => {
    const invalidateQueries = jest.fn();
    jest
      .spyOn(ReactQuery, 'useQueryClient')
      .mockReturnValue({ invalidateQueries } as unknown as ReturnType<
        typeof ReactQuery.useQueryClient
      >);

    const { result } = renderHook(() => useInvalidateFindAttackDiscoveries());
    result.current();

    expect(invalidateQueries).toHaveBeenCalledWith(['GET', expect.anything()], {
      refetchType: 'all',
    });
  });
});
