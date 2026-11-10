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

jest.mock('../../watchlist_config');
jest.mock('../../../entity_sources/manual/service');

const { mockWatchlistGet } = jest.requireMock('../../watchlist_config');
const { mockListManualWatchlistEntities } = jest.requireMock(
  '../../../entity_sources/manual/service'
);

import { ListManualWatchlistEntitiesRequestQuery } from '../../../../../../../common/api/entity_analytics/watchlists/entities/list_manual.gen';
import { listManualWatchlistEntitiesRoute } from './list_manual';

describe('GET /internal/entity_analytics/watchlists/{watchlist_id}/entities/manual - listManualWatchlistEntitiesRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    const { context: ctx } = requestContextMock.createTools();
    context = requestContextMock.convertContext(ctx);

    mockWatchlistGet.mockReset();
    mockListManualWatchlistEntities.mockReset();

    listManualWatchlistEntitiesRoute(server.router, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (watchlistId: string, query: object = {}) =>
    requestMock.create({
      method: 'get',
      path: `/internal/entity_analytics/watchlists/${watchlistId}/entities/manual`,
      params: { watchlist_id: watchlistId },
      query,
    });

  const PAGE = {
    entities: [{ euid: 'user:jane', name: 'jane', type: 'user', sources: ['manual', 'index'] }],
    total: 1,
    page: 1,
    per_page: 10,
  };

  it('lists the first page of ten by default', async () => {
    mockWatchlistGet.mockResolvedValue({ name: 'test-watchlist', id: 'wl-1' });
    mockListManualWatchlistEntities.mockResolvedValue(PAGE);

    const response = await server.inject(buildRequest('wl-1'), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(PAGE);
    expect(mockWatchlistGet).toHaveBeenCalledWith('wl-1');
    expect(mockListManualWatchlistEntities).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'wl-1', index: '.entity_analytics.watchlists.default' },
      { page: 1, perPage: 10 }
    );
  });

  it('passes the page and the page size from the query', async () => {
    mockWatchlistGet.mockResolvedValue({ name: 'test-watchlist', id: 'wl-1' });
    mockListManualWatchlistEntities.mockResolvedValue({ ...PAGE, page: 3, per_page: 25 });

    await server.inject(buildRequest('wl-1', { page: 3, per_page: 25 }), context);

    expect(mockListManualWatchlistEntities).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { page: 3, perPage: 25 }
    );
  });

  it('returns an error and lists nothing when the watchlist cannot be read', async () => {
    mockWatchlistGet.mockRejectedValue(new Error('watchlist not found'));

    const response = await server.inject(buildRequest('wl-1'), context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({ message: 'watchlist not found', status_code: 500 });
    expect(mockListManualWatchlistEntities).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error listing manual entities: Error: watchlist not found')
    );
  });

  describe('the query schema, which Kibana applies before the route runs', () => {
    it('takes no query, and reads numbers from the strings of a URL', () => {
      expect(ListManualWatchlistEntitiesRequestQuery.safeParse({}).success).toBe(true);
      expect(
        ListManualWatchlistEntitiesRequestQuery.parse({ page: '100', per_page: '100' })
      ).toEqual({ page: 100, per_page: 100 });
    });

    it.each([
      ['a page below 1', { page: '0' }],
      ['a page above 100', { page: '101' }],
      ['a page size below 1', { per_page: '0' }],
      ['a page size above 100', { per_page: '101' }],
      ['a page that is not a number', { page: 'two' }],
    ])('rejects %s', (_, query) => {
      expect(ListManualWatchlistEntitiesRequestQuery.safeParse(query).success).toBe(false);
    });
  });
});
