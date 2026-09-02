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
import { fetchDashboardsCount } from '../lib/dashboards';
import {
  fetchApiKeysStats,
  fetchIndexStats,
  hasIndexMonitorPrivilege,
} from '../lib/deployment_stats';
import { registerDeploymentStatsRoute } from './deployment_stats';

jest.mock('../lib/dashboards');
jest.mock('../lib/deployment_stats');

const mockFetchIndexStats = fetchIndexStats as jest.MockedFunction<typeof fetchIndexStats>;
const mockFetchDashboardsCount = fetchDashboardsCount as jest.MockedFunction<
  typeof fetchDashboardsCount
>;
const mockFetchApiKeysStats = fetchApiKeysStats as jest.MockedFunction<typeof fetchApiKeysStats>;
const mockHasIndexMonitorPrivilege = hasIndexMonitorPrivilege as jest.MockedFunction<
  typeof hasIndexMonitorPrivilege
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
    mockHasIndexMonitorPrivilege.mockResolvedValue(true);
    mockFetchApiKeysStats.mockResolvedValue({ total: null, expiring: null });

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

  it('returns index stats, dashboard count and api key stats combined in a single body', async () => {
    mockFetchIndexStats.mockResolvedValue({
      indicesCount: 3,
      storeSizeBytes: 1024,
      vectorCount: 5,
      documentsCount: 4,
    });
    mockFetchDashboardsCount.mockResolvedValue(2);
    mockFetchApiKeysStats.mockResolvedValue({ total: 6, expiring: 1 });

    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await getHandler()(createContext(), request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        indicesCount: 3,
        storeSizeBytes: 1024,
        vectorCount: 5,
        documentsCount: 4,
        dashboardsCount: 2,
        apiKeysCount: 6,
        expiringApiKeysCount: 1,
      },
    });
  });

  it('surfaces null values (unavailable) without failing the response', async () => {
    mockFetchIndexStats.mockResolvedValue({
      indicesCount: null,
      storeSizeBytes: null,
      vectorCount: null,
      documentsCount: null,
    });
    mockFetchDashboardsCount.mockResolvedValue(null);

    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await getHandler()(createContext(), request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        indicesCount: null,
        storeSizeBytes: null,
        vectorCount: null,
        documentsCount: null,
        dashboardsCount: null,
        apiKeysCount: null,
        expiringApiKeysCount: null,
      },
    });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('withholds only the vector count from a caller without the `monitor` privilege', async () => {
    mockHasIndexMonitorPrivilege.mockResolvedValue(false);
    mockFetchIndexStats.mockResolvedValue({
      indicesCount: 3,
      storeSizeBytes: 1024,
      vectorCount: null,
      documentsCount: 4,
    });
    mockFetchDashboardsCount.mockResolvedValue(2);

    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await getHandler()(createContext(), request, response);

    expect(mockFetchIndexStats).toHaveBeenCalledWith(esClient, logger, {
      canMonitorAllIndices: false,
    });
    expect(response.forbidden).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        indicesCount: 3,
        storeSizeBytes: 1024,
        documentsCount: 4,
        dashboardsCount: 2,
        apiKeysCount: null,
        expiringApiKeysCount: null,
      },
    });
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
