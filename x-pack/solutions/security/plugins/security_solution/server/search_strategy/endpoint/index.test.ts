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
import { NotFoundError } from '../../endpoint/errors';
import { fetchActionRequestById } from '../../endpoint/services/actions/utils/fetch_action_request_by_id';
import { endpointFactory } from './factory';
import { endpointSearchStrategyProvider } from '.';

jest.mock('../../endpoint/services/actions/utils/fetch_action_request_by_id');

const fetchActionRequestByIdMock = fetchActionRequestById as jest.Mock;

describe('endpointSearchStrategyProvider', () => {
  type SearchArgs = Parameters<ReturnType<typeof endpointSearchStrategyProvider>['search']>;

  const buildProvider = (
    authzOverrides: Partial<EndpointAuthz> = {},
    { cpsActive = false, ccsEnabled = false }: { cpsActive?: boolean; ccsEnabled?: boolean } = {}
  ) => {
    const searchResponse = of({ rawResponse: { hits: { total: 0, hits: [] } } });
    const search = jest.fn().mockReturnValue(searchResponse);
    const scopedSearch = jest.fn().mockReturnValue(searchResponse);
    const data = {
      search: { searchAsInternalUser: { search } },
    } as unknown as PluginStart;
    const getEndpointAuthz = jest
      .fn()
      .mockResolvedValue(getEndpointAuthzInitialStateMock(authzOverrides));
    const isCcsEnabled = jest.fn().mockResolvedValue(ccsEnabled);
    const endpointContext = {
      service: {
        getEndpointAuthz,
        isCcsEnabled,
        isCpsActive: jest.fn().mockResolvedValue(cpsActive),
        isCpsRead: jest.fn(async (req) => cpsActive && req != null),
        getActiveSpaceId: jest.fn().mockReturnValue('default'),
        getScopedSearchClient: jest.fn().mockResolvedValue({ search: scopedSearch }),
        asScoped: jest.fn(async (req) => ({
          isCpsRead: () => cpsActive && req != null,
          getEsClient: () => {
            throw new Error('not used in search strategy tests');
          },
          getSearchClient: () => ({ search: scopedSearch }),
          getSpaceId: () => 'default',
        })),
      },
    } as unknown as EndpointAppContext;

    return {
      provider: endpointSearchStrategyProvider(data, endpointContext),
      search,
      scopedSearch,
    };
  };

  beforeEach(() => {
    fetchActionRequestByIdMock.mockReset();
    fetchActionRequestByIdMock.mockResolvedValue({ EndpointActions: { action_id: 'action-1' } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  describe('and CPS is enabled', () => {
    it('dispatches Defend-owned queries through the scoped search client', async () => {
      const { provider, search, scopedSearch } = buildProvider(
        { canAccessEndpointActionsLogManagement: true },
        { cpsActive: true }
      );

      await lastValueFrom(provider.search(request, options, deps));

      expect(search).not.toHaveBeenCalled();
      expect(scopedSearch).toHaveBeenCalledTimes(1);
    });

    it('overrides the strategy name so the scoped client does not recurse into this strategy', async () => {
      const { provider, scopedSearch } = buildProvider(
        { canAccessEndpointActionsLogManagement: true },
        { cpsActive: true }
      );

      await lastValueFrom(
        provider.search(request, { strategy: 'endpointResponseActions' } as SearchArgs[1], deps)
      );

      expect(scopedSearch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ strategy: 'ese' })
      );
    });

    it('drops a caller-supplied projectRouting so the routing stays the one derived here', async () => {
      const { provider, scopedSearch } = buildProvider(
        { canAccessEndpointActionsLogManagement: true },
        { cpsActive: true }
      );

      await lastValueFrom(
        provider.search(
          request,
          { projectRouting: '_alias: "somewhere-else"' } as SearchArgs[1],
          deps
        )
      );

      expect(scopedSearch.mock.calls[0][1]).not.toHaveProperty('projectRouting');
    });

    it('bounds the alert-driven actions query to the active space', async () => {
      const { provider, scopedSearch } = buildProvider(
        { canAccessEndpointActionsLogManagement: true },
        { cpsActive: true }
      );

      await lastValueFrom(provider.search(request, options, deps));

      expect(scopedSearch.mock.calls[0][0].params.query.bool.filter).toEqual([
        {
          bool: {
            should: [{ term: { originSpaceId: 'default' } }, { term: { space_id: 'default' } }],
            minimum_should_match: 1,
          },
        },
      ]);
    });

    it('leaves the actions query unbounded when the flag is off', async () => {
      const { provider, search } = buildProvider({ canAccessEndpointActionsLogManagement: true });

      await lastValueFrom(provider.search(request, options, deps));

      expect(search.mock.calls[0][0].params.query.bool).not.toHaveProperty('filter');
    });

    it('does not add the CCS remote patterns to a query that fans out', async () => {
      const { provider, scopedSearch } = buildProvider(
        { canAccessEndpointActionsLogManagement: true },
        { cpsActive: true, ccsEnabled: true }
      );

      await lastValueFrom(provider.search(request, options, deps));

      expect(scopedSearch.mock.calls[0][0].params.index).toEqual(
        expect.not.arrayContaining([expect.stringMatching(/^\*:/)])
      );
    });

    it('still adds the CCS remote patterns when the flag is off', async () => {
      const { provider, search } = buildProvider(
        { canAccessEndpointActionsLogManagement: true },
        { ccsEnabled: true }
      );

      await lastValueFrom(provider.search(request, options, deps));

      expect(search.mock.calls[0][0].params.index).toEqual(
        expect.arrayContaining([expect.stringMatching(/^\*:/)])
      );
    });

    it('keeps a query that reads a Fleet-owned index on the internal user', async () => {
      jest
        .spyOn(endpointFactory[ResponseActionsQueries.actions], 'buildDsl')
        .mockReturnValue({ index: ['.fleet-actions-results', '.logs-endpoint.actions-default'] });
      const { provider, search, scopedSearch } = buildProvider(
        { canAccessEndpointActionsLogManagement: true },
        { cpsActive: true }
      );

      await lastValueFrom(provider.search(request, options, deps));

      expect(search).toHaveBeenCalledTimes(1);
      expect(scopedSearch).not.toHaveBeenCalled();
    });

    it('cancels through the client that issued the search', async () => {
      const cancel = jest.fn();
      const service = {
        isCpsRead: jest.fn().mockReturnValue(true),
        getScopedSearchClient: jest.fn().mockReturnValue({ cancel }),
        asScoped: jest.fn(async () => ({
          isCpsRead: () => true,
          getEsClient: () => {
            throw new Error('not used');
          },
          getSearchClient: () => ({ cancel }),
          getSpaceId: () => 'default',
        })),
      };
      const provider = endpointSearchStrategyProvider(
        {
          search: { searchAsInternalUser: { search: jest.fn(), cancel: jest.fn() } },
        } as unknown as PluginStart,
        { service } as unknown as EndpointAppContext
      );

      await provider.cancel?.('search-id', options, deps);

      expect(cancel).toHaveBeenCalledWith('search-id', { strategy: 'ese' });
    });

    it('overrides the strategy name and drops projectRouting when cancelling through the scoped client', async () => {
      const cancel = jest.fn();
      const service = {
        isCpsRead: jest.fn().mockReturnValue(true),
        getScopedSearchClient: jest.fn().mockReturnValue({ cancel }),
        asScoped: jest.fn(async () => ({
          isCpsRead: () => true,
          getEsClient: () => {
            throw new Error('not used');
          },
          getSearchClient: () => ({ cancel }),
          getSpaceId: () => 'default',
        })),
      };
      const provider = endpointSearchStrategyProvider(
        {
          search: { searchAsInternalUser: { search: jest.fn(), cancel: jest.fn() } },
        } as unknown as PluginStart,
        { service } as unknown as EndpointAppContext
      );

      await provider.cancel?.(
        'search-id',
        {
          strategy: 'endpointResponseActions',
          projectRouting: 'something',
        } as unknown as SearchArgs[1],
        deps
      );

      expect(cancel).toHaveBeenCalledWith(
        'search-id',
        expect.objectContaining({ strategy: 'ese' })
      );
      expect(cancel.mock.calls[0][1]).not.toHaveProperty('projectRouting');
    });

    describe('and the query is keyed on a caller-supplied action id', () => {
      const resultsRequest = {
        factoryQueryType: ResponseActionsQueries.results,
        actionId: 'action-1',
        agents: 1,
        expiration: new Date(Date.now() + 60_000).toISOString(),
        sort: { field: '@timestamp', order: 'desc' as const },
      } as unknown as SearchArgs[0];

      it('resolves the action first, so the space check happens before the fan-out', async () => {
        const { provider, scopedSearch } = buildProvider(
          { canAccessEndpointActionsLogManagement: true },
          { cpsActive: true }
        );

        await lastValueFrom(provider.search(resultsRequest, options, deps));

        expect(fetchActionRequestByIdMock).toHaveBeenCalledWith(
          expect.anything(),
          'default',
          'action-1',
          { scoped: expect.anything() }
        );
        expect(scopedSearch).toHaveBeenCalledTimes(1);
      });

      it('does not add the CCS remote patterns to the results query either', async () => {
        const { provider, scopedSearch } = buildProvider(
          { canAccessEndpointActionsLogManagement: true },
          { cpsActive: true, ccsEnabled: true }
        );

        await lastValueFrom(provider.search(resultsRequest, options, deps));

        expect(scopedSearch.mock.calls[0][0].params.index).not.toContain('*:');
      });

      it('returns no results, rather than erroring, when the action is not visible in the active space', async () => {
        fetchActionRequestByIdMock.mockRejectedValue(new NotFoundError('Action not found'));
        const { provider, scopedSearch } = buildProvider(
          { canAccessEndpointActionsLogManagement: true },
          { cpsActive: true }
        );

        const response = await lastValueFrom(provider.search(resultsRequest, options, deps));

        // Nothing may reach Elasticsearch: the response counts live in a `global` aggregation, which
        // is built from the search context rather than from the query, so no query can suppress them
        expect(scopedSearch).not.toHaveBeenCalled();
        expect(response).toEqual(
          expect.objectContaining({
            edges: [],
            isCompleted: false,
            isExpired: false,
            wasSuccessful: true,
            status: 'pending',
          })
        );
        expect(response.rawResponse.aggregations).toBeUndefined();
      });

      it('propagates a failure that is not the action being invisible', async () => {
        fetchActionRequestByIdMock.mockRejectedValue(new Error('Elasticsearch is down'));
        const { provider, scopedSearch } = buildProvider(
          { canAccessEndpointActionsLogManagement: true },
          { cpsActive: true }
        );

        await expect(lastValueFrom(provider.search(resultsRequest, options, deps))).rejects.toThrow(
          'Elasticsearch is down'
        );
        expect(scopedSearch).not.toHaveBeenCalled();
      });

      it('does not resolve the action when the flag is off', async () => {
        const { provider, search } = buildProvider({ canAccessEndpointActionsLogManagement: true });

        await lastValueFrom(provider.search(resultsRequest, options, deps));

        expect(fetchActionRequestByIdMock).not.toHaveBeenCalled();
        expect(search).toHaveBeenCalledTimes(1);
      });
    });
  });
});
