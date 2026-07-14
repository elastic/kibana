/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of } from 'rxjs';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import type { PluginStart, SearchStrategyDependencies } from '@kbn/data-plugin/server';

import type { EndpointAuthz } from '../../../common/endpoint/types/authz';
import { getEndpointAuthzInitialStateMock } from '../../../common/endpoint/service/authz/mocks';
import { ResponseActionsQueries } from '../../../common/search_strategy/endpoint/response_actions';
import type { EndpointAppContext } from '../../endpoint/types';
import { endpointSearchStrategyProvider } from '.';

describe('endpointSearchStrategyProvider', () => {
  type SearchArgs = Parameters<ReturnType<typeof endpointSearchStrategyProvider>['search']>;

  const buildProvider = (authzOverrides: Partial<EndpointAuthz> = {}) => {
    const search = jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: 0, hits: [] } } }));
    const data = {
      search: { searchAsInternalUser: { search } },
    } as unknown as PluginStart;
    const getEndpointAuthz = jest
      .fn()
      .mockResolvedValue(getEndpointAuthzInitialStateMock(authzOverrides));
    const isCcsEnabled = jest.fn().mockResolvedValue(false);
    const endpointContext = {
      service: { getEndpointAuthz, isCcsEnabled },
    } as unknown as EndpointAppContext;

    return { provider: endpointSearchStrategyProvider(data, endpointContext), search };
  };

  const deps = {
    request: httpServerMock.createKibanaRequest(),
  } as unknown as SearchStrategyDependencies;
  const options = {} as unknown as SearchArgs[1];
  const request = {
    factoryQueryType: ResponseActionsQueries.actions,
    alertIds: ['alert-1'],
    sort: { field: '@timestamp', order: 'desc' as const },
  } as unknown as SearchArgs[0];

  it('rejects with a 403 when the caller cannot access endpoint actions log management', async () => {
    const { provider, search } = buildProvider({ canAccessEndpointActionsLogManagement: false });

    await expect(lastValueFrom(provider.search(request, options, deps))).rejects.toBeInstanceOf(
      KbnServerError
    );
    await expect(lastValueFrom(provider.search(request, options, deps))).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('runs the query when the caller can access endpoint actions log management', async () => {
    const { provider, search } = buildProvider({ canAccessEndpointActionsLogManagement: true });

    await lastValueFrom(provider.search(request, options, deps));

    expect(search).toHaveBeenCalledTimes(1);
  });
});
