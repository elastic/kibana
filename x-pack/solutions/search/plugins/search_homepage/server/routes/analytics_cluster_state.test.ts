/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { AnalyticsClusterState } from '../../common/analytics';
import { fetchAnalyticsClusterState } from '../lib/analytics_cluster_state';
import { registerAnalyticsClusterStateRoute } from './analytics_cluster_state';

jest.mock('../lib/analytics_cluster_state');

const mockFetch = fetchAnalyticsClusterState as jest.MockedFunction<
  typeof fetchAnalyticsClusterState
>;

const STATE: AnalyticsClusterState = {
  stage: 'hasData',
  journey: 'analytics',
  sources: [],
  totalSources: 1,
  documentsCount: 3,
  dashboardsCount: 0,
  recentDashboards: [],
};

describe('registerAnalyticsClusterStateRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const callHandler = () => {
    const core = coreMock.createRequestHandlerContext();
    const savedObjectsClient = savedObjectsClientMock.create();
    core.savedObjects.getClient = () => savedObjectsClient;
    const context = coreMock.createCustomRequestHandlerContext({ core: Promise.resolve(core) });
    const response = httpServerMock.createResponseFactory();

    return {
      core,
      savedObjectsClient,
      response,
      result: router.get.mock.calls[0][1](context, httpServerMock.createKibanaRequest(), response),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    logger = loggingSystemMock.createLogger();
    registerAnalyticsClusterStateRoute(router, logger, {
      getSampleDashboardIds: () => ['sample-dashboard'],
    });
  });

  it('registers an internal route that delegates authorization to the scoped clients', () => {
    expect(router.get.mock.calls[0][0]).toMatchObject({
      path: '/internal/search_homepage/analytics/cluster_state',
      validate: false,
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: expect.stringContaining('as the caller') } },
    });
  });

  it('returns the cluster state read with the scoped clients and registered sample dashboards', async () => {
    mockFetch.mockResolvedValue(STATE);

    const { core, savedObjectsClient, response, result } = callHandler();
    await result;

    expect(mockFetch).toHaveBeenCalledWith({
      client: core.elasticsearch.client,
      savedObjectsClient,
      logger,
      sampleDashboardIds: ['sample-dashboard'],
    });
    expect(response.ok).toHaveBeenCalledWith({ body: STATE });
  });

  it('answers 403 without logging an error when Elasticsearch refuses the caller', async () => {
    mockFetch.mockRejectedValue(Object.assign(new Error('unauthorized'), { statusCode: 403 }));

    const { response, result } = callHandler();
    await result;

    expect(response.forbidden).toHaveBeenCalledWith({
      body: { message: 'Insufficient privileges to read the analytics cluster state' },
    });
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('unauthorized'));
  });

  it('keeps the status code of other Elasticsearch failures and logs them', async () => {
    mockFetch.mockRejectedValue(Object.assign(new Error('shards failed'), { statusCode: 503 }));

    const { response, result } = callHandler();
    await result;

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: { message: 'Failed to fetch the analytics cluster state' },
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('shards failed'));
  });

  it('reads the status code of saved objects failures', async () => {
    mockFetch.mockRejectedValue(
      SavedObjectsErrorHelpers.decorateEsUnavailableError(new Error('unavailable'))
    );

    const { response, result } = callHandler();
    await result;

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('answers 500 and logs an unexpected error', async () => {
    mockFetch.mockRejectedValue(new Error('boom'));

    const { response, result } = callHandler();
    await result;

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to fetch the analytics cluster state' },
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
