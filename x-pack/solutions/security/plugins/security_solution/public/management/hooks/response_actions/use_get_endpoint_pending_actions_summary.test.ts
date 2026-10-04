/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, useQuery as _useQuery } from '@kbn/react-query';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetEndpointPendingActionsSummary } from './use_get_endpoint_pending_actions_summary';
import { ACTION_STATUS_ROUTE } from '../../../../common/endpoint/constants';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetEndpointPendingActionsSummary hook', () => {
  let wrapper: React.FC<PropsWithChildren>;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();
    const { queryClient } = testContext;

    http = testContext.coreStart.http;
    apiMocks = responseActionsHttpMocks(http);

    // Bare QueryClientProvider instead of the full `AppRootProvider`, whose mount starved the event loop under parallel CI load.
    wrapper = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  });

  it('should call the proper API', async () => {
    const { result } = renderHook(() => useGetEndpointPendingActionsSummary(['123', '456']), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalledWith({
      path: `${ACTION_STATUS_ROUTE}`,
      query: { agent_ids: ['123', '456'] },
      version: '2023-10-31',
    });
  });

  it('should allow custom options to be used', () => {
    renderHook(
      () =>
        useGetEndpointPendingActionsSummary(['123', '456'], {
          queryKey: ['1', '2'],
          enabled: false,
        }),
      { wrapper }
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['1', '2'],
        enabled: false,
      })
    );
  });
});
