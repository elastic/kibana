/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { RequestHandlerContext } from '@kbn/core/server';
import {
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { FAVORITES_LIMIT } from '@kbn/content-management-favorites-common';
import { STARRED_DASHBOARDS_COUNT_PATH } from '../../common/constants';
import { countExistingDashboards } from '../lib/dashboards';
import { registerStarredDashboardsCountRoute } from './starred_dashboards_count';

jest.mock('../lib/dashboards');

const mockCountExistingDashboards = countExistingDashboards as jest.MockedFunction<
  typeof countExistingDashboards
>;

describe('registerStarredDashboardsCountRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    logger = loggingSystemMock.createLogger();
    soClient = savedObjectsClientMock.create();

    registerStarredDashboardsCountRoute(router, logger);
  });

  const getHandler = () => router.post.mock.calls[0][1];

  const createContext = (coreOverride?: Promise<never>) =>
    ({
      core: coreOverride ?? Promise.resolve({ savedObjects: { getClient: () => soClient } }),
    } as unknown as RequestHandlerContext);

  it('registers a POST route with authz delegated to the saved objects client', () => {
    const [config] = router.post.mock.calls[0];
    expect(config.path).toBe(STARRED_DASHBOARDS_COUNT_PATH);
    expect(config.security?.authz).toBeDefined();
  });

  describe('body validation', () => {
    const validateBody = (body: unknown) => {
      const [config] = router.post.mock.calls[0];
      const { body: bodySchema } = config.validate as { body: ObjectType };
      return () => bodySchema.validate(body);
    };

    it('accepts a list of dashboard IDs', () => {
      expect(validateBody({ dashboardIds: ['one', 'two'] })()).toEqual({
        dashboardIds: ['one', 'two'],
      });
    });

    it('accepts an empty list', () => {
      expect(validateBody({ dashboardIds: [] })()).toEqual({ dashboardIds: [] });
    });

    it('rejects an empty dashboard ID', () => {
      expect(validateBody({ dashboardIds: [''] })).toThrow(/minimum length/);
    });

    it('rejects a dashboard ID longer than the saved object ID limit', () => {
      expect(validateBody({ dashboardIds: ['a'.repeat(257)] })).toThrow(/maximum length/);
    });

    it('rejects more dashboard IDs than a user can favorite', () => {
      const tooMany = Array.from({ length: FAVORITES_LIMIT + 1 }, (_, i) => `dashboard-${i}`);

      expect(validateBody({ dashboardIds: tooMany })).toThrow(
        `array size is [${FAVORITES_LIMIT + 1}], but cannot be greater than [${FAVORITES_LIMIT}]`
      );
    });
  });

  it('counts the starred dashboards that still exist', async () => {
    mockCountExistingDashboards.mockResolvedValue(1);

    const request = httpServerMock.createKibanaRequest({
      body: { dashboardIds: ['kept', 'deleted'] },
    });
    const response = httpServerMock.createResponseFactory();

    await getHandler()(createContext(), request, response);

    expect(mockCountExistingDashboards).toHaveBeenCalledWith(soClient, ['kept', 'deleted'], logger);
    expect(response.ok).toHaveBeenCalledWith({ body: { count: 1 } });
  });

  it('surfaces an unavailable count without failing the response', async () => {
    mockCountExistingDashboards.mockResolvedValue(null);

    const request = httpServerMock.createKibanaRequest({ body: { dashboardIds: ['starred'] } });
    const response = httpServerMock.createResponseFactory();

    await getHandler()(createContext(), request, response);

    expect(response.ok).toHaveBeenCalledWith({ body: { count: null } });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('returns a custom error when resolving the core context throws', async () => {
    const request = httpServerMock.createKibanaRequest({ body: { dashboardIds: [] } });
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
