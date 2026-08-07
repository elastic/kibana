/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { DEPLOYMENT_STATS_PATH } from '../../common/constants';
import { fetchDashboardsCount, fetchIndexStats } from '../lib/deployment_stats';
import { registerDeploymentStatsRoute } from './deployment_stats';

jest.mock('../lib/deployment_stats');

const mockFetchIndexStats = fetchIndexStats as jest.MockedFunction<typeof fetchIndexStats>;
const mockFetchDashboardsCount = fetchDashboardsCount as jest.MockedFunction<
  typeof fetchDashboardsCount
>;

describe('registerDeploymentStatsRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    logger = loggingSystemMock.createLogger();
    esClient = elasticsearchServiceMock.createScopedClusterClient();
    soClient = savedObjectsClientMock.create();

    registerDeploymentStatsRoute(router, logger);
  });

  const getHandler = () => router.get.mock.calls[0][1];

  const createContext = (coreOverride?: Promise<never>) =>
    ({
      core:
        coreOverride ??
        Promise.resolve({
          elasticsearch: { client: esClient },
          savedObjects: { getClient: () => soClient },
        }),
    } as unknown as RequestHandlerContext);

  it('registers a GET route at the deployment stats path with ES-delegated authz', () => {
    const [config] = router.get.mock.calls[0];
    expect(config.path).toBe(DEPLOYMENT_STATS_PATH);
    expect(config.security?.authz).toBeDefined();
  });

  it('returns index stats and dashboard count combined in a single body', async () => {
    mockFetchIndexStats.mockResolvedValue({
      indicesCount: 3,
      storeSizeBytes: 1024,
      vectorDocsCount: 5,
    });
    mockFetchDashboardsCount.mockResolvedValue(2);

    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await getHandler()(createContext(), request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        indicesCount: 3,
        storeSizeBytes: 1024,
        vectorDocsCount: 5,
        dashboardsCount: 2,
      },
    });
  });

  it('passes the scoped ES and saved objects clients to the respective lib helpers', async () => {
    mockFetchIndexStats.mockResolvedValue({
      indicesCount: 0,
      storeSizeBytes: 0,
      vectorDocsCount: 0,
    });
    mockFetchDashboardsCount.mockResolvedValue(0);

    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await getHandler()(createContext(), request, response);

    expect(mockFetchIndexStats).toHaveBeenCalledWith(esClient, logger);
    expect(mockFetchDashboardsCount).toHaveBeenCalledWith(soClient, logger);
  });

  it('surfaces null values (unavailable) without failing the response', async () => {
    mockFetchIndexStats.mockResolvedValue({
      indicesCount: null,
      storeSizeBytes: null,
      vectorDocsCount: null,
    });
    mockFetchDashboardsCount.mockResolvedValue(null);

    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await getHandler()(createContext(), request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        indicesCount: null,
        storeSizeBytes: null,
        vectorDocsCount: null,
        dashboardsCount: null,
      },
    });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('returns a custom error when resolving the core context throws', async () => {
    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await getHandler()(
      createContext(Promise.reject(new Error('core unavailable')) as Promise<never>),
      request,
      response
    );

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(logger.warn).toHaveBeenCalled();
  });
});
