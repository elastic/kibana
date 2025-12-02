/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_INTERNAL_MISSING_PRIVILEGES,
} from '@kbn/elastic-assistant-common';

import { useGetMissingIndexPrivileges } from '.';
import * as i18n from './translations';

const mockAddError = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
  }),
}));

jest.mock('./translations', () => ({
  GET_ATTACK_DISCOVERY_MISSING_PRIVILEGES_FAILURE:
    'GET_ATTACK_DISCOVERY_MISSING_PRIVILEGES_FAILURE',
}));

const mockHttpGet = jest.fn();
jest.mock('../../../common/lib/kibana', () => ({
  KibanaServices: {
    get: () => ({
      http: {
        get: mockHttpGet,
      },
    }),
  },
}));

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useGetMissingIndexPrivileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
  });

  it('should invoke `getMissingIndexPrivileges` and return data on success', async () => {
    const mockResponse = [{ index_name: 'test-index', privileges: ['read'] }];
    mockHttpGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useGetMissingIndexPrivileges(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHttpGet).toHaveBeenCalledWith(ATTACK_DISCOVERY_INTERNAL_MISSING_PRIVILEGES, {
      version: API_VERSIONS.internal.v1,
      signal: expect.anything(),
    });
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should invoke `addError` on failure', async () => {
    const error = new Error('Test error');
    mockHttpGet.mockRejectedValue(error);

    const { result } = renderHook(() => useGetMissingIndexPrivileges(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockAddError).toHaveBeenCalledWith(error, {
      title: i18n.GET_ATTACK_DISCOVERY_MISSING_PRIVILEGES_FAILURE,
    });
  });
});
