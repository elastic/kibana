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

  describe('without entitySource', () => {
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

  describe('with entitySource', () => {
    const entitySourceInput = {
      type: 'index' as const,
      name: 'my-source',
      indexPattern: 'logs-*',
      enabled: true,
    };

    it('creates the watchlist and entity source, then links them', async () => {
      const watchlistResult = {
        id: 'wl-1',
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      };
      const entitySourceResult = { id: 'es-1', ...entitySourceInput };

      mockWatchlistCreate.mockResolvedValue(watchlistResult);
      mockCreateEntitySource.mockResolvedValue(entitySourceResult);
      mockAddEntitySourceReference.mockResolvedValue(undefined);

      const request = buildRequest({ entitySource: entitySourceInput });
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ ...watchlistResult, entitySource: entitySourceResult });
      expect(mockWatchlistCreate).toHaveBeenCalledWith({
        name: 'test-watchlist',
        description: 'A test watchlist',
        riskModifier: 10,
      });
      expect(mockCreateEntitySource).toHaveBeenCalledWith(entitySourceInput);
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

      const request = buildRequest({ entitySource: entitySourceInput });
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
      const entitySourceResult = { id: 'es-1', ...entitySourceInput };

      mockWatchlistCreate.mockResolvedValue(watchlistResult);
      mockCreateEntitySource.mockResolvedValue(entitySourceResult);
      mockAddEntitySourceReference.mockRejectedValue(new Error('linking failed'));
      mockWatchlistDelete.mockResolvedValue(undefined);

      const request = buildRequest({ entitySource: entitySourceInput });
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

      const request = buildRequest({ entitySource: entitySourceInput });
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
