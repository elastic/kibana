/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { WATCHLISTS_URL } from '../../../../../../common/entity_analytics/watchlists/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../../detection_engine/routes/__mocks__';

const mockWatchlistCreate = jest.fn();
const mockWatchlistDelete = jest.fn();
const mockAddEntitySourceReference = jest.fn();

jest.mock('../watchlist_config', () => ({
  WatchlistConfigClient: jest.fn().mockImplementation(() => ({
    create: mockWatchlistCreate,
    delete: mockWatchlistDelete,
    addEntitySourceReference: mockAddEntitySourceReference,
  })),
}));

jest.mock('../../entity_sources/infra/entity_source_client');
jest.mock('../../shared/utils', () => ({
  getRequestSavedObjectClient: jest.fn(() => 'mock-so-client'),
}));

const { mockCreateEntitySource } = jest.requireMock(
  '../../entity_sources/infra/entity_source_client'
) as {
  mockCreateEntitySource: jest.Mock;
};

// Import after mocks are set up
import { createWatchlistRoute } from './create';

describe('POST /api/entity_analytics/watchlists - createWatchlistRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    const { context: ctx } = requestContextMock.createTools();
    context = requestContextMock.convertContext(ctx);

    mockWatchlistCreate.mockReset();
    mockWatchlistDelete.mockReset();
    mockAddEntitySourceReference.mockReset();
    mockCreateEntitySource.mockReset();

    createWatchlistRoute(server.router, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (body: object = {}) =>
    requestMock.create({
      method: 'post',
      path: WATCHLISTS_URL,
      body: {
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
        ...body,
      },
    });

  describe('without entitySources', () => {
    it('creates a watchlist and returns 200', async () => {
      const watchlistResult = {
        id: 'wl-1',
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      };
      mockWatchlistCreate.mockResolvedValue(watchlistResult);

      const request = buildRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(watchlistResult);
      expect(mockWatchlistCreate).toHaveBeenCalledWith({
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      });
      expect(mockCreateEntitySource).not.toHaveBeenCalled();
      expect(mockAddEntitySourceReference).not.toHaveBeenCalled();
    });
  });

  describe('with entitySources', () => {
    const entitySourceInputA = {
      type: 'index' as const,
      name: 'my-source-a',
      indexPattern: 'logs-*',
      enabled: true,
    };

    const entitySourceInputB = {
      type: 'index' as const,
      name: 'my-source-b',
      indexPattern: 'metrics-*',
      enabled: true,
    };

    it('creates the watchlist and entity sources, then links them', async () => {
      const watchlistResult = {
        id: 'wl-1',
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      };
      const entitySourceResultA = { id: 'es-1', ...entitySourceInputA };
      const entitySourceResultB = { id: 'es-2', ...entitySourceInputB };

      mockWatchlistCreate.mockResolvedValue(watchlistResult);
      mockCreateEntitySource
        .mockResolvedValueOnce(entitySourceResultA)
        .mockResolvedValueOnce(entitySourceResultB);
      mockAddEntitySourceReference.mockResolvedValue(undefined);

      const request = buildRequest({
        entitySources: [entitySourceInputA, entitySourceInputB],
      });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        ...watchlistResult,
        entitySources: [entitySourceResultA, entitySourceResultB],
      });
      expect(mockWatchlistCreate).toHaveBeenCalledWith({
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      });
      expect(mockCreateEntitySource).toHaveBeenCalledTimes(2);
      expect(mockCreateEntitySource).toHaveBeenCalledWith(entitySourceInputA);
      expect(mockCreateEntitySource).toHaveBeenCalledWith(entitySourceInputB);
      expect(mockAddEntitySourceReference).toHaveBeenCalledTimes(2);
      expect(mockAddEntitySourceReference).toHaveBeenCalledWith('wl-1', 'es-1');
      expect(mockAddEntitySourceReference).toHaveBeenCalledWith('wl-1', 'es-2');
    });

    it('creates the watchlist and a single entity source', async () => {
      const watchlistResult = {
        id: 'wl-1',
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      };
      const entitySourceResult = { id: 'es-1', ...entitySourceInputA };

      mockWatchlistCreate.mockResolvedValue(watchlistResult);
      mockCreateEntitySource.mockResolvedValue(entitySourceResult);
      mockAddEntitySourceReference.mockResolvedValue(undefined);

      const request = buildRequest({ entitySources: [entitySourceInputA] });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        ...watchlistResult,
        entitySources: [entitySourceResult],
      });
      expect(mockCreateEntitySource).toHaveBeenCalledTimes(1);
      expect(mockCreateEntitySource).toHaveBeenCalledWith(entitySourceInputA);
      expect(mockAddEntitySourceReference).toHaveBeenCalledWith('wl-1', 'es-1');
    });

    it('rolls back the watchlist when entity source creation fails', async () => {
      const watchlistResult = {
        id: 'wl-1',
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      };

      mockWatchlistCreate.mockResolvedValue(watchlistResult);
      mockCreateEntitySource.mockRejectedValue(new Error('source creation failed'));
      mockWatchlistDelete.mockResolvedValue(undefined);

      const request = buildRequest({ entitySources: [entitySourceInputA] });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(500);
      expect(mockWatchlistDelete).toHaveBeenCalledWith('wl-1');
      expect(logger.error).toHaveBeenCalledWith(
        'Entity source creation failed, rolling back watchlist wl-1'
      );
    });

    it('rolls back the watchlist when addEntitySourceReference fails', async () => {
      const watchlistResult = {
        id: 'wl-1',
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      };
      const entitySourceResult = { id: 'es-1', ...entitySourceInputA };

      mockWatchlistCreate.mockResolvedValue(watchlistResult);
      mockCreateEntitySource.mockResolvedValue(entitySourceResult);
      mockAddEntitySourceReference.mockRejectedValue(new Error('linking failed'));
      mockWatchlistDelete.mockResolvedValue(undefined);

      const request = buildRequest({ entitySources: [entitySourceInputA] });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(500);
      expect(mockWatchlistDelete).toHaveBeenCalledWith('wl-1');
    });

    it('throws when watchlist creation returns no id', async () => {
      const watchlistResult = {
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      };

      mockWatchlistCreate.mockResolvedValue(watchlistResult);

      const request = buildRequest({ entitySources: [entitySourceInputA] });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Watchlist creation succeeded but no ID was returned',
        status_code: 500,
      });
      expect(mockCreateEntitySource).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns an error response when watchlist creation fails', async () => {
      mockWatchlistCreate.mockRejectedValue(new Error('something went wrong'));

      const request = buildRequest();
      const response = await server.inject(request, context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'something went wrong',
        status_code: 500,
      });
      expect(logger.error).toHaveBeenCalledWith('Failed to create watchlist: something went wrong');
    });
  });
});
