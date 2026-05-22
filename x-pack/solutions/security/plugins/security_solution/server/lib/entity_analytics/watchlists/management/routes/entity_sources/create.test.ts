/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../../../detection_engine/routes/__mocks__';
import { WATCHLISTS_DATA_SOURCE_URL } from '../../../../../../../common/constants';

const mockWatchlistClientCreate = jest.fn();
const mockAddEntitySourceReference = jest.fn();
const mockSyncWatchlist = jest.fn();

jest.mock('../../watchlist_config', () => ({
  WatchlistConfigClient: jest.fn().mockImplementation(() => ({
    addEntitySourceReference: mockAddEntitySourceReference,
  })),
}));

jest.mock('../../../entity_sources/infra', () => ({
  WatchlistEntitySourceClient: jest.fn().mockImplementation(() => ({
    create: mockWatchlistClientCreate,
  })),
  getStreamPatternFor: jest.fn((integration: string) => `stream-${integration}`),
  INTEGRATION_TYPES: ['entityanalytics_ad', 'okta'],
  integrationsSourceIndex: jest.fn((ns: string, integration: string) =>
    `integration-${ns}-${integration}`
  ),
  oktaLastFullSyncMarkersIndex: jest.fn((ns: string) => `okta-markers-${ns}`),
}));

jest.mock('../../../shared/utils', () => ({
  getRequestSavedObjectClient: jest.fn(() => 'mock-so-client'),
}));

jest.mock('../../../entity_sources/entity_sources_service', () => ({
  createEntitySourcesService: jest.fn(() => ({
    syncWatchlist: mockSyncWatchlist,
  })),
}));

// Import after mocks are set up
import { createEntitySourceRoute } from './create';

describe('POST /api/entity_analytics/watchlists/:watchlist_id/data_sources - createEntitySourceRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    const { context: ctx } = requestContextMock.createTools();
    context = requestContextMock.convertContext(ctx);

    mockWatchlistClientCreate.mockReset();
    mockAddEntitySourceReference.mockReset();
    mockSyncWatchlist.mockReset();

    createEntitySourceRoute(server.router, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (watchlistId: string, body: object = {}) =>
    requestMock.create({
      method: 'post',
      path: `${WATCHLISTS_DATA_SOURCE_URL}/${watchlistId}`,
      params: { watchlist_id: watchlistId },
      body: {
        type: 'index',
        name: 'test-source',
        indexPattern: 'logs-*',
        enabled: true,
        ...body,
      },
    });

  describe('entity source creation', () => {
    it('creates an entity source and links it to watchlist', async () => {
      const sourceResult = {
        id: 'es-1',
        type: 'index',
        name: 'test-source',
        indexPattern: 'logs-*',
        enabled: true,
      };

      mockWatchlistClientCreate.mockResolvedValue(sourceResult);
      mockAddEntitySourceReference.mockResolvedValue(undefined);
      mockSyncWatchlist.mockResolvedValue(undefined);

      const request = buildRequest('wl-1');
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(sourceResult);
      expect(mockWatchlistClientCreate).toHaveBeenCalledWith({
        type: 'index',
        name: 'test-source',
        indexPattern: 'logs-*',
        enabled: true,
      });
      expect(mockAddEntitySourceReference).toHaveBeenCalledWith('wl-1', 'es-1');
    });

    it('triggers background sync after linking entity source', async () => {
      const sourceResult = {
        id: 'es-1',
        type: 'index',
        name: 'test-source',
        indexPattern: 'logs-*',
        enabled: true,
      };

      mockWatchlistClientCreate.mockResolvedValue(sourceResult);
      mockAddEntitySourceReference.mockResolvedValue(undefined);
      mockSyncWatchlist.mockResolvedValue(undefined);

      const request = buildRequest('wl-1');
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      // Give the fire-and-forget async operation a moment to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockSyncWatchlist).toHaveBeenCalledWith('wl-1');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Background sync completed for watchlist wl-1')
      );
    });

    it('logs warning when background sync fails', async () => {
      const sourceResult = {
        id: 'es-1',
        type: 'index',
        name: 'test-source',
        indexPattern: 'logs-*',
        enabled: true,
      };

      mockWatchlistClientCreate.mockResolvedValue(sourceResult);
      mockAddEntitySourceReference.mockResolvedValue(undefined);
      mockSyncWatchlist.mockRejectedValue(new Error('sync error'));

      const request = buildRequest('wl-1');
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      // Give the fire-and-forget async operation a moment to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockSyncWatchlist).toHaveBeenCalledWith('wl-1');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Background sync failed for watchlist wl-1')
      );
    });

    it('still returns 200 when sync fails', async () => {
      const sourceResult = {
        id: 'es-1',
        type: 'index',
        name: 'test-source',
        indexPattern: 'logs-*',
        enabled: true,
      };

      mockWatchlistClientCreate.mockResolvedValue(sourceResult);
      mockAddEntitySourceReference.mockResolvedValue(undefined);
      mockSyncWatchlist.mockRejectedValue(new Error('sync error'));

      const request = buildRequest('wl-1');
      const response = await server.inject(request, context);

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(sourceResult);
    });
  });

  describe('error handling', () => {
    it('returns error when entity source creation fails', async () => {
      mockWatchlistClientCreate.mockRejectedValue(new Error('source creation failed'));

      const request = buildRequest('wl-1');
      const response = await server.inject(request, context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'source creation failed',
        status_code: 500,
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating watchlist entity source sync config')
      );
    });

    it('returns error when linking source fails', async () => {
      const sourceResult = {
        id: 'es-1',
        type: 'index',
        name: 'test-source',
        indexPattern: 'logs-*',
        enabled: true,
      };

      mockWatchlistClientCreate.mockResolvedValue(sourceResult);
      mockAddEntitySourceReference.mockRejectedValue(new Error('linking failed'));

      const request = buildRequest('wl-1');
      const response = await server.inject(request, context);

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'linking failed',
        status_code: 500,
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating watchlist entity source sync config')
      );
    });
  });
});
