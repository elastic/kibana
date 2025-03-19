/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery as _useQuery } from '@tanstack/react-query';
import { useBulkFetchFleetIntegrationPolicies } from './use_bulk_fetch_fleet_integration_policies';
import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { allFleetHttpMocks } from '../../mocks';
import type { BulkGetPackagePoliciesRequestBody } from '@kbn/fleet-plugin/common/types';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { Mutable } from 'utility-types';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useBulkFetchFleetIntegrationPolicies()', () => {
  type HookRenderer = ReactQueryHookRenderer<
    Parameters<typeof useBulkFetchFleetIntegrationPolicies>,
    ReturnType<typeof useBulkFetchFleetIntegrationPolicies>
  >;

  let reqOptions: Mutable<BulkGetPackagePoliciesRequestBody>;
  let queryOptions: NonNullable<Parameters<typeof useBulkFetchFleetIntegrationPolicies>[1]>;
  let http: AppContextTestRender['coreStart']['http'];
  let renderHook: () => ReturnType<HookRenderer>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    reqOptions = { ids: ['1'] };
    queryOptions = {};
    http = testContext.coreStart.http;
    allFleetHttpMocks(http);
    renderHook = () => {
      return (testContext.renderReactQueryHook as HookRenderer)(() =>
        useBulkFetchFleetIntegrationPolicies(reqOptions, queryOptions)
      );
    };
  });

  afterEach(() => {
    useQueryMock.mockClear();
  });

  it('should call the correct fleet api with the query data provided', async () => {
    const { data } = await renderHook();

    expect(http.post).toHaveBeenCalledWith(
      packagePolicyRouteService.getBulkGetPath(),
      expect.objectContaining({
        body: JSON.stringify({ ...reqOptions, ignoreMissing: true }),
      })
    );
    expect(data).toEqual(expect.objectContaining({ items: expect.any(Array) }));
  });

  it('should allow use of `ignoreMissing` request property', async () => {
    reqOptions.ignoreMissing = false;
    await renderHook();

    expect(http.post).toHaveBeenCalledWith(
      packagePolicyRouteService.getBulkGetPath(),
      expect.objectContaining({
        body: JSON.stringify(reqOptions),
      })
    );
  });

  it('should allow useQuery options overrides', async () => {
    queryOptions.queryKey = ['a', 'b'];
    queryOptions.retry = false;
    queryOptions.refetchInterval = 5;
    await renderHook();

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining(queryOptions));
  });
});
