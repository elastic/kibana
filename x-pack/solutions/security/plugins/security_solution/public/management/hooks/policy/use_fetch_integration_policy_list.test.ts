/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery as _useQuery } from '@tanstack/react-query';
import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type { Mutable } from 'utility-types';
import type { GetPackagePoliciesRequest } from '@kbn/fleet-plugin/common/types';
import { allFleetHttpMocks } from '../../mocks';
import { useFetchIntegrationPolicyList } from './use_fetch_integration_policy_list';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useFetchIntegrationPolicyList() hook', () => {
  type HookRenderer = ReactQueryHookRenderer<
    Parameters<typeof useFetchIntegrationPolicyList>,
    ReturnType<typeof useFetchIntegrationPolicyList>
  >;

  let queryOptions: Mutable<GetPackagePoliciesRequest['query']>;
  let options: NonNullable<Parameters<typeof useFetchIntegrationPolicyList>[1]>;
  let http: AppContextTestRender['coreStart']['http'];
  let renderHook: () => ReturnType<HookRenderer>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    queryOptions = {};
    options = {};
    http = testContext.coreStart.http;
    allFleetHttpMocks(http);
    renderHook = () => {
      return (testContext.renderReactQueryHook as HookRenderer)(() =>
        useFetchIntegrationPolicyList(queryOptions, options)
      );
    };
  });

  afterEach(() => {
    useQueryMock.mockClear();
  });

  it('should call the correct fleet api with the query data provided', async () => {
    const { data } = await renderHook();

    expect(http.get).toHaveBeenCalledWith(
      packagePolicyRouteService.getListPath(),
      expect.objectContaining({
        query: {},
      })
    );
    expect(data).toEqual(expect.objectContaining({ items: expect.any(Array) }));
  });

  it('should pass defined query options to the fleet api', async () => {
    queryOptions = {
      withAgentCount: true,
      sortOrder: 'asc',
      sortField: 'name',
      kuery: 'somevalue',
      perPage: 100,
      page: 5,
    };
    await renderHook();

    expect(http.get).toHaveBeenCalledWith(
      packagePolicyRouteService.getListPath(),
      expect.objectContaining({
        query: queryOptions,
      })
    );
  });

  it('should allow useQuery options overrides', async () => {
    options.queryKey = ['a', 'b'];
    options.retry = false;
    options.refetchInterval = 5;
    await renderHook();

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining(queryOptions));
  });
});
