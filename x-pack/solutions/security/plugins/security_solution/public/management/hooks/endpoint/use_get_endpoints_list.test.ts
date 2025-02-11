/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetEndpointsList, PAGING_PARAMS } from './use_get_endpoints_list';
import { HOST_METADATA_LIST_ROUTE } from '../../../../common/endpoint/constants';
import { useQuery as _useQuery } from '@tanstack/react-query';
import { endpointMetadataHttpMocks } from '../../pages/endpoint_hosts/mocks';
import { EndpointStatus, HostStatus } from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetEndpointsList hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointsList>,
    ReturnType<typeof useGetEndpointsList>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof endpointMetadataHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = endpointMetadataHttpMocks(http);
  });

  it('should call the API with kuery set to look for all hostnames when no search string given', async () => {
    await renderReactQueryHook(() => useGetEndpointsList({ searchString: '' }));

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: { page: 0, pageSize: 50, kuery: 'united.endpoint.host.hostname:*' },
      version: '2023-10-31',
    });
  });

  it('should call the API with kuery set to look for all matching hostnames', async () => {
    await renderReactQueryHook(() => useGetEndpointsList({ searchString: 'xyz' }));

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: { page: 0, pageSize: 50, kuery: 'united.endpoint.host.hostname:*xyz*' },
      version: '2023-10-31',
    });
  });

  it('should call the API with kuery set to look for all matching agentIds if present', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointsList({ searchString: '', selectedAgentIds: ['agent-a', 'agent-b'] })
    );

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: {
        page: 0,
        pageSize: 10000,
        kuery:
          'united.endpoint.agent.id:"agent-a" or united.endpoint.agent.id:"agent-b" or united.endpoint.host.hostname:*',
      },
      version: '2023-10-31',
    });
  });

  it('should call the API with kuery set to look for all matching agentIds and hostnames', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointsList({ searchString: 'xyz', selectedAgentIds: ['agent-a', 'agent-b'] })
    );

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: {
        page: 0,
        pageSize: 10000,
        kuery:
          'united.endpoint.agent.id:"agent-a" or united.endpoint.agent.id:"agent-b" or united.endpoint.host.hostname:*xyz*',
      },
      version: '2023-10-31',
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () =>
        useGetEndpointsList({
          searchString: 'pqr',
          options: { queryKey: ['m', 'n'], enabled: false },
        }),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['m', 'n'],
        enabled: false,
      })
    );
  });

  it('should also list inactive agents', async () => {
    const getApiResponse = apiMocks.responseProvider.metadataList.getMockImplementation();

    const inActiveIndex = [0, 1, 3];

    // set a few of the agents as inactive/unenrolled
    apiMocks.responseProvider.metadataList.mockImplementation(() => {
      if (getApiResponse) {
        return {
          ...getApiResponse(),
          data: getApiResponse().data.map((item, i) => {
            const isInactiveIndex = inActiveIndex.includes(i);
            return {
              ...item,
              host_status: isInactiveIndex ? HostStatus.INACTIVE : item.host_status,
              metadata: {
                ...item.metadata,
                host: {
                  ...item.metadata.host,
                  hostname: isInactiveIndex
                    ? `${item.metadata.host.hostname}-inactive`
                    : item.metadata.host.hostname,
                },
                Endpoint: {
                  ...item.metadata.Endpoint,
                  status: isInactiveIndex
                    ? EndpointStatus.unenrolled
                    : item.metadata.Endpoint.status,
                },
              },
              last_checkin: item.last_checkin,
            };
          }),
        };
      }
      throw new Error('some error');
    });

    // verify useGetEndpointsList hook returns the same inactive agents
    const res = await renderReactQueryHook(() => useGetEndpointsList({ searchString: 'inactive' }));
    expect(
      res.data?.map((host) => host.name.split('-')[2]).filter((name) => name === 'inactive').length
    ).toEqual(inActiveIndex.length);
  });

  it('should only list 50 agents when more than 50 in the metadata list API', async () => {
    const getApiResponse = apiMocks.responseProvider.metadataList.getMockImplementation();

    apiMocks.responseProvider.metadataList.mockImplementation(() => {
      if (getApiResponse) {
        const generator = new EndpointDocGenerator('seed');
        const total = 60;
        const data = Array.from({ length: total }, () => {
          const newDate = new Date();
          const endpoint = {
            metadata: generator.generateHostMetadata(newDate.getTime()),
            host_status: HostStatus.UNHEALTHY,
            last_checkin: newDate.toISOString(),
          };

          generator.updateCommonInfo();

          return endpoint;
        });

        return {
          ...getApiResponse(),
          data,
          page: 0,
          // this page size is not used by the hook (it uses the default of 50)
          // this is only for the test
          pageSize: 80,
          total,
        };
      }
      throw new Error('some error');
    });

    // verify useGetEndpointsList hook returns all 50 agents in the list
    const res = await renderReactQueryHook(() => useGetEndpointsList({ searchString: '' }));
    expect(res.data?.length).toEqual(PAGING_PARAMS.default);
  });

  it('should only list 10 more agents when 50 or more agents are already selected', async () => {
    const getApiResponse = apiMocks.responseProvider.metadataList.getMockImplementation();

    apiMocks.responseProvider.metadataList.mockImplementation(() => {
      if (getApiResponse) {
        const generator = new EndpointDocGenerator('seed');
        const total = 61;
        const data = Array.from({ length: total }, () => {
          const newDate = new Date();
          const endpoint = {
            metadata: generator.generateHostMetadata(newDate.getTime()),
            host_status: HostStatus.UNHEALTHY,
            last_checkin: newDate.toISOString(),
          };

          generator.updateCommonInfo();

          return endpoint;
        });

        return {
          ...getApiResponse(),
          data,
          page: 0,
          // since we're mocking that all 50 agents are selected
          // page size is set to max allowed
          pageSize: 10000,
          total,
        };
      }
      throw new Error('some error');
    });

    // get the first 50 agents to select
    const agentIdsToSelect = apiMocks.responseProvider
      .metadataList()
      .data.map((d) => d.metadata.agent.id)
      .slice(0, PAGING_PARAMS.default);

    // call useGetEndpointsList with all 50 agents selected
    const res = await renderReactQueryHook(() =>
      useGetEndpointsList({ searchString: '', selectedAgentIds: agentIdsToSelect })
    );
    // verify useGetEndpointsList hook returns 60 agents
    expect(res.data?.length).toEqual(60);
  });
});
