/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of } from 'rxjs';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import {
  DEPLOYMENT_STATS_PATH,
  STARRED_DASHBOARDS_COUNT_PATH,
  WORKFLOWS_STATS_PATH,
} from '../../common/constants';
import { useKibana } from './use_kibana';
import { useDeploymentStats } from './use_deployment_stats';

jest.mock('./use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const FAVORITES_PATH = '/internal/content_management/favorites/dashboard';

const esStats = {
  indicesCount: 3,
  vectorCount: 120,
  storeSizeBytes: 2048,
  documentsCount: 42,
  dashboardsCount: 5,
  apiKeysCount: 7,
  expiringApiKeysCount: 2,
  newIndex: null,
};

describe('useDeploymentStats', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let userProfile: ReturnType<typeof userProfileServiceMock.createStart>;

  /**
   * The hook fans out to several endpoints in parallel, so responses are keyed by path rather than
   * by call order. A `null` entry stands for an endpoint that rejects.
   */
  const mockResponses = ({
    deploymentStats = esStats as object | null,
    workflows = { workflows: { enabled: 2, disabled: 1 } } as object | null,
    favorites = { favoriteIds: [] } as object | null,
    starredCount = { count: 0 } as object | null,
  }) => {
    const resolveOrReject = (value: object | null) =>
      value === null ? Promise.reject(new Error('request failed')) : Promise.resolve(value);

    http.get.mockImplementation((pathOrOptions) => {
      const path = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;

      switch (path) {
        case DEPLOYMENT_STATS_PATH:
          return resolveOrReject(deploymentStats);
        case WORKFLOWS_STATS_PATH:
          return resolveOrReject(workflows);
        case FAVORITES_PATH:
          return resolveOrReject(favorites);
        default:
          throw new Error(`Unexpected GET ${path}`);
      }
    });
    http.post.mockImplementation(() => resolveOrReject(starredCount));
  };

  const renderStats = async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeploymentStats(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    return result;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    http = httpServiceMock.createStartContract();
    userProfile = userProfileServiceMock.createStart();
    userProfile.getEnabled$.mockReturnValue(of(true));
    mockUseKibana.mockReturnValue({ services: { http, userProfile } });
    mockResponses({});
  });

  it('reports every stat as unavailable while the requests are in flight', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeploymentStats(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toEqual({
      indicesCount: null,
      vectorCount: null,
      storeSizeBytes: null,
      workflowsCount: null,
      workflowsRunningCount: null,
      dashboardsCount: null,
      documentsCount: null,
      apiKeysCount: null,
      expiringApiKeysCount: null,
      starredDashboardsCount: null,
      newIndex: null,
    });
  });

  it('combines the deployment, workflow and favorites responses', async () => {
    mockResponses({ favorites: { favoriteIds: ['a', 'b'] }, starredCount: { count: 2 } });

    const result = await renderStats();

    expect(result.current.stats).toEqual({
      ...esStats,
      workflowsCount: 3,
      workflowsRunningCount: 2,
      starredDashboardsCount: 2,
    });
  });

  it('keeps the other stats when the deployment stats request fails', async () => {
    mockResponses({ deploymentStats: null });

    const result = await renderStats();

    expect(result.current.stats).toEqual(
      expect.objectContaining({
        indicesCount: null,
        vectorCount: null,
        storeSizeBytes: null,
        documentsCount: null,
        dashboardsCount: null,
        apiKeysCount: null,
        expiringApiKeysCount: null,
        newIndex: null,
        workflowsCount: 3,
        workflowsRunningCount: 2,
      })
    );
  });

  it('reports the vector count as unavailable when the caller may not see it', async () => {
    mockResponses({ deploymentStats: { ...esStats, vectorCount: null } });

    const result = await renderStats();

    expect(result.current.stats.vectorCount).toBeNull();
    expect(result.current.stats.indicesCount).toBe(3);
  });

  it('keeps the other stats when the workflows request fails', async () => {
    mockResponses({ workflows: null });

    const result = await renderStats();

    expect(result.current.stats).toEqual(
      expect.objectContaining({
        indicesCount: 3,
        workflowsCount: null,
        workflowsRunningCount: null,
      })
    );
  });

  describe('workflow counts', () => {
    it('sums the enabled and disabled workflows and reports the enabled ones as running', async () => {
      mockResponses({ workflows: { workflows: { enabled: 4, disabled: 6 } } });

      const result = await renderStats();

      expect(result.current.stats.workflowsCount).toBe(10);
      expect(result.current.stats.workflowsRunningCount).toBe(4);
    });

    it('treats a missing enabled bucket as zero', async () => {
      mockResponses({ workflows: { workflows: { disabled: 3 } } });

      const result = await renderStats();

      expect(result.current.stats.workflowsCount).toBe(3);
      expect(result.current.stats.workflowsRunningCount).toBeNull();
    });

    it('treats a missing disabled bucket as zero', async () => {
      mockResponses({ workflows: { workflows: { enabled: 5 } } });

      const result = await renderStats();

      expect(result.current.stats.workflowsCount).toBe(5);
      expect(result.current.stats.workflowsRunningCount).toBe(5);
    });

    it('reports unavailable (not zero) when the response carries no workflows', async () => {
      mockResponses({ workflows: {} });

      const result = await renderStats();

      expect(result.current.stats.workflowsCount).toBeNull();
      expect(result.current.stats.workflowsRunningCount).toBeNull();
    });
  });

  describe('starred dashboards', () => {
    it('resolves the favorited IDs against the dashboards that still exist', async () => {
      mockResponses({
        favorites: { favoriteIds: ['kept', 'deleted'] },
        starredCount: { count: 1 },
      });

      const result = await renderStats();

      expect(http.post).toHaveBeenCalledWith(STARRED_DASHBOARDS_COUNT_PATH, {
        body: JSON.stringify({ dashboardIds: ['kept', 'deleted'] }),
      });
      expect(result.current.stats.starredDashboardsCount).toBe(1);
    });

    it('reports zero without a lookup when nothing is favorited', async () => {
      mockResponses({ favorites: { favoriteIds: [] } });

      const result = await renderStats();

      expect(http.post).not.toHaveBeenCalled();
      expect(result.current.stats.starredDashboardsCount).toBe(0);
    });

    it('reports unavailable (not zero) when the favorites request fails', async () => {
      mockResponses({ favorites: null });

      const result = await renderStats();

      expect(http.post).not.toHaveBeenCalled();
      expect(result.current.stats.starredDashboardsCount).toBeNull();
    });

    it('reports unavailable (not zero) when the count lookup fails', async () => {
      mockResponses({ favorites: { favoriteIds: ['starred'] }, starredCount: null });

      const result = await renderStats();

      expect(result.current.stats.starredDashboardsCount).toBeNull();
    });

    it('passes an unavailable count through from the server', async () => {
      mockResponses({ favorites: { favoriteIds: ['starred'] }, starredCount: { count: null } });

      const result = await renderStats();

      expect(result.current.stats.starredDashboardsCount).toBeNull();
    });

    it('reports zero without asking the server when user profiles are disabled', async () => {
      userProfile.getEnabled$.mockReturnValue(of(false));

      const result = await renderStats();

      expect(http.get).not.toHaveBeenCalledWith(FAVORITES_PATH);
      expect(http.post).not.toHaveBeenCalled();
      expect(result.current.stats.starredDashboardsCount).toBe(0);
    });
  });
});
