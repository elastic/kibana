/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useFetchEndpointList } from './use_fetch_endpoint_list';
import { HOST_METADATA_LIST_ROUTE } from '../../../../common/endpoint/constants';
import { useQuery as _useQuery } from '@kbn/react-query';
import { endpointMetadataHttpMocks } from '../../pages/endpoint_hosts/mocks';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useFetchEndpointList hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useFetchEndpointList>,
    ReturnType<typeof useFetchEndpointList>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof endpointMetadataHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = endpointMetadataHttpMocks(http);
  });

  it('should call the metadata list API with the provided query', async () => {
    await renderReactQueryHook(() =>
      useFetchEndpointList({ page: 0, pageSize: 2, kuery: 'united.endpoint.agent.id:"agent-a"' })
    );

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: { page: 0, pageSize: 2, kuery: 'united.endpoint.agent.id:"agent-a"' },
      version: '2023-10-31',
    });
  });

  it('should call the metadata list API with no query params by default', async () => {
    await renderReactQueryHook(() => useFetchEndpointList());

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: {},
      version: '2023-10-31',
    });
  });

  it('should return the metadata list API response as-is', async () => {
    const apiResponse = apiMocks.responseProvider.metadataList();
    apiMocks.responseProvider.metadataList.mockReturnValue(apiResponse);

    const res = await renderReactQueryHook(() => useFetchEndpointList());

    expect(res.data).toEqual(apiResponse);
  });

  it('should allow custom react-query options to be used', async () => {
    await renderReactQueryHook(
      () => useFetchEndpointList({}, { queryKey: ['m', 'n'], enabled: false }),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['m', 'n'],
        enabled: false,
      })
    );
  });
});
