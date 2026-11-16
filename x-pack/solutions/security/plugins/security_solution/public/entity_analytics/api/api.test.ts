/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/public';

import { API_VERSIONS } from '../../../common/constants';
import { useEntityAnalyticsRoutes } from './api';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

jest.mock('../../common/lib/kibana/kibana_react', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockFetch = jest.fn();
const useKibanaMock = useKibana as jest.Mock;
const useExperimentalMock = useIsExperimentalFeatureEnabled as jest.Mock;

describe('useEntityAnalyticsRoutes — executionContext propagation on v2 branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({ services: { http: { fetch: mockFetch } } });
  });

  it('threads context into the maintainers request when fetchRiskEngineStatus is called on the v2 path', async () => {
    // Enable the entity-store v2 flag so fetchRiskEngineStatus takes the v2 branch
    // and delegates to fetchRiskScoreMaintainer -> fetchEntityMaintainers.
    useExperimentalMock.mockReturnValue(true);
    // fetchEntityMaintainers returns { maintainers: [...] }; empty array is fine here.
    mockFetch.mockResolvedValue({ maintainers: [] });

    const { result } = renderHook(() => useEntityAnalyticsRoutes());

    const context = { name: 'risk-engine-status', id: 'panel-1' };
    await result.current.fetchRiskEngineStatus({ context });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledWith(
      ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET,
      expect.objectContaining({ context })
    );
  });

  it('uses the maintainer status request when the entity store v2 flag is disabled', async () => {
    useExperimentalMock.mockReturnValue(false);
    mockFetch.mockResolvedValue({ maintainers: [] });

    const { result } = renderHook(() => useEntityAnalyticsRoutes());

    const context = { name: 'risk-engine-status', id: 'panel-1' };
    await result.current.fetchRiskEngineStatus({ context });

    expect(mockFetch).toHaveBeenCalledWith(
      ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET,
      expect.objectContaining({ context })
    );
  });
});

describe('useEntityAnalyticsRoutes — executionContext propagation on entity details flyout endpoints', () => {
  const context = {
    child: {
      type: 'security_solution',
      name: 'entity_analytics:entity_details_flyout',
      id: 'test-panel',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({ services: { http: { fetch: mockFetch } } });
    mockFetch.mockResolvedValue({});
  });

  it('forwards context to http.fetch in fetchEntityDetailsHighlights', async () => {
    const { result } = renderHook(() => useEntityAnalyticsRoutes());
    const signal = new AbortController().signal;

    await result.current.fetchEntityDetailsHighlights({
      params: {
        entityType: 'user',
        entityIdentifier: 'alice',
        anonymizationFields: [],
        from: 1,
        to: 2,
        connectorId: 'connector-1',
      },
      signal,
      context,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', signal, context })
    );
  });

  it('forwards context to http.fetch in saveEntityAiSummary', async () => {
    const { result } = renderHook(() => useEntityAnalyticsRoutes());

    await result.current.saveEntityAiSummary({
      params: {
        entityId: 'alice',
        entityType: 'user',
        summary: {
          highlights: [],
          recommended_actions: [],
          generated_at: 1,
          staleness: { enabled_signals: [], snapshot: {} },
        },
        modelOutputCounts: { highlights: 0, recommendedActions: 0 },
      },
      context,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', context })
    );
  });

  it('forwards context and query to http.fetch in fetchPersistedAiSummary', async () => {
    const { result } = renderHook(() => useEntityAnalyticsRoutes());
    const signal = new AbortController().signal;

    await result.current.fetchPersistedAiSummary({
      params: { entityType: 'user', entityIdentifier: 'alice' },
      signal,
      context,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        query: { entityId: 'alice', entityType: 'user' },
        signal,
        context,
      })
    );
  });

  it('passes mode as a query param in fetchPersistedAiSummary when provided', async () => {
    const { result } = renderHook(() => useEntityAnalyticsRoutes());

    await result.current.fetchPersistedAiSummary({
      params: { entityType: 'user', entityIdentifier: 'alice', mode: 'resolved' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        query: { entityId: 'alice', entityType: 'user', mode: 'resolved' },
      })
    );
  });
});

describe('useEntityAnalyticsRoutes — executionContext propagation on feature-scoped requests', () => {
  type Routes = ReturnType<typeof useEntityAnalyticsRoutes>;

  const context = {
    child: {
      type: 'security_solution',
      name: 'entity_analytics:risk_score_management',
      id: 'test-request',
    },
  };
  const watchlistSource = { watchlistId: 'watchlist-1', entitySourceId: 'source-1' };

  const requests: Array<[string, (routes: Routes, ctx: KibanaExecutionContext) => unknown]> = [
    [
      'calculateEntityRiskScoreV2',
      (routes, ctx) =>
        routes.calculateEntityRiskScoreV2({ identifier_type: 'user', identifier: 'alice' }, ctx),
    ],
    [
      'fetchRiskEnginePrivileges',
      (routes, ctx) => routes.fetchRiskEnginePrivileges({ context: ctx }),
    ],
    [
      'fetchEntityStorePrivileges',
      (routes, ctx) => routes.fetchEntityStorePrivileges({ context: ctx }),
    ],
    [
      'fetchEntityStoreV2Privileges',
      (routes, ctx) => routes.fetchEntityStoreV2Privileges({ context: ctx }),
    ],
    [
      'createPrivMonImportIndex',
      (routes, ctx) =>
        routes.createPrivMonImportIndex({ name: 'my-index', mode: 'standard', context: ctx }),
    ],
    [
      'registerPrivMonMonitoredIndices',
      (routes, ctx) => routes.registerPrivMonMonitoredIndices('index-1', ctx),
    ],
    [
      'updatePrivMonMonitoredIndices',
      (routes, ctx) => routes.updatePrivMonMonitoredIndices('source-1', 'index-1', ctx),
    ],
    [
      'createAssetCriticality',
      (routes, ctx) =>
        routes.createAssetCriticality({
          idField: 'host.name',
          idValue: 'host-1',
          criticalityLevel: 'high_impact',
          context: ctx,
        }),
    ],
    [
      'deleteAssetCriticality',
      (routes, ctx) =>
        routes.deleteAssetCriticality({ idField: 'host.name', idValue: 'host-1', context: ctx }),
    ],
    [
      'initPrivilegedMonitoringEngine',
      (routes, ctx) => routes.initPrivilegedMonitoringEngine({ context: ctx }),
    ],
    [
      'fetchPrivilegeMonitoringPrivileges',
      (routes, ctx) => routes.fetchPrivilegeMonitoringPrivileges({ context: ctx }),
    ],
    [
      'fetchWatchlistsPrivileges',
      (routes, ctx) => routes.fetchWatchlistsPrivileges({ context: ctx }),
    ],
    ['fetchRiskEngineSettings', (routes, ctx) => routes.fetchRiskEngineSettings({ context: ctx })],
    [
      'updateSavedObjectConfiguration',
      (routes, ctx) => routes.updateSavedObjectConfiguration({ enable_reset_to_zero: true }, ctx),
    ],
    [
      'updateWatchlistEntitySource',
      (routes, ctx) =>
        routes.updateWatchlistEntitySource({ ...watchlistSource, body: { type: 'index' } }, ctx),
    ],
    [
      'createWatchlistEntitySource',
      (routes, ctx) =>
        routes.createWatchlistEntitySource(
          { watchlistId: 'watchlist-1', body: { type: 'index', name: 'source' } },
          ctx
        ),
    ],
    [
      'deleteWatchlistEntitySource',
      (routes, ctx) => routes.deleteWatchlistEntitySource(watchlistSource, ctx),
    ],
    [
      'searchWatchlistIndices',
      (routes, ctx) => routes.searchWatchlistIndices({ query: 'logs', context: ctx }),
    ],
    [
      'uploadWatchlistCsv',
      (routes, ctx) =>
        routes.uploadWatchlistCsv('watchlist-1', new File(['name'], 'entities.csv'), ctx),
    ],
    [
      'enableLeadGeneration',
      (routes, ctx) => routes.enableLeadGeneration({ connectorId: 'connector-1', context: ctx }),
    ],
    ['disableLeadGeneration', (routes, ctx) => routes.disableLeadGeneration({ context: ctx })],
    [
      'fetchLeadGenerationPrivileges',
      (routes, ctx) => routes.fetchLeadGenerationPrivileges({ context: ctx }),
    ],
    ['fetchAnomalyPrivileges', (routes, ctx) => routes.fetchAnomalyPrivileges({ context: ctx })],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({ services: { http: { fetch: mockFetch } } });
    mockFetch.mockResolvedValue({});
  });

  it.each(requests)('forwards context to http.fetch in %s', async (_name, request) => {
    const { result } = renderHook(() => useEntityAnalyticsRoutes());

    await request(result.current, context);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ context })
    );
  });

  it('ignores the react-query context a parameterless fetcher receives as a queryFn', async () => {
    const { result } = renderHook(() => useEntityAnalyticsRoutes());
    const queryFunctionContext = {
      queryKey: ['GET', 'FETCH_RISK_ENGINE_PRIVILEGES'],
      meta: undefined,
    };

    await result.current.fetchRiskEnginePrivileges(queryFunctionContext as never);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ context: undefined })
    );
  });
});

describe('useEntityAnalyticsRoutes — watchlist entity sources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({ services: { http: { fetch: mockFetch } } });
    mockFetch.mockResolvedValue({});
  });

  it('sends a versioned PUT to the entity source URL in updateWatchlistEntitySource', async () => {
    const { result } = renderHook(() => useEntityAnalyticsRoutes());

    await result.current.updateWatchlistEntitySource({
      watchlistId: 'watchlist-1',
      entitySourceId: 'source-1',
      body: { type: 'index' },
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/entity_analytics/watchlists/watchlist-1/entity_source/source-1',
      expect.objectContaining({
        method: 'PUT',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({ type: 'index' }),
      })
    );
  });
});
