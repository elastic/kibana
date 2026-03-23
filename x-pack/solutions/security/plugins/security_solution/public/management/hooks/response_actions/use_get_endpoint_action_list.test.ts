/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactQueryHookRenderer, AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetEndpointActionList } from './use_get_endpoint_action_list';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../common/endpoint/constants';
import { useQuery as _useQuery } from '@kbn/react-query';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetEndpointActionList hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointActionList>,
    ReturnType<typeof useGetEndpointActionList>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = responseActionsHttpMocks(http);
  });

  it('should call the proper API', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointActionList({
        agentIds: ['123', '456'],
        userIds: ['elastic', 'citsale'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        endDate: 'now',
      })
    );

    expect(apiMocks.responseProvider.actionList).toHaveBeenCalledWith({
      path: BASE_ENDPOINT_ACTION_ROUTE,
      version: '2023-10-31',
      query: {
        agentIds: ['123', '456'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        endDate: 'now',
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        userIds: ['*elastic*', '*citsale*'],
      },
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () =>
        useGetEndpointActionList(
          {},
          {
            queryKey: ['1', '2'],
            enabled: false,
          }
        ),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['1', '2'],
        enabled: false,
      })
    );
  });

  it('should return an empty list if the API returns a 404', async () => {
    // @ts-ignore
    apiMocks.responseProvider.actionList.mockRejectedValueOnce({
      body: {
        statusCode: 404,
        message: 'Not Found',
      },
    });

    const result = await renderReactQueryHook(() =>
      useGetEndpointActionList({
        agentIds: ['123'],
        statuses: ['pending'],
        page: 1,
      })
    );

    expect(result.data).toEqual({ data: [], page: 1, pageSize: 10, total: 0 });
  });

  it('should return an empty list if the API returns an index not found exception', async () => {
    // @ts-ignore
    apiMocks.responseProvider.actionList.mockRejectedValue({
      body: {
        statusCode: 500,
        message: 'index_not_found_exception',
      },
    });

    const result = await renderReactQueryHook(() =>
      useGetEndpointActionList({
        agentIds: ['123'],
        statuses: ['pending'],
        page: 1,
        pageSize: 20,
      })
    );

    expect(result.data).toEqual({ data: [], page: 1, pageSize: 20, total: 0 });
  });
});
