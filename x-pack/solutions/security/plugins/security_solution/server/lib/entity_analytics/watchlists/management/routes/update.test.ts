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
import { WATCHLIST_API_CALL_EVENT } from '../../../../telemetry/event_based/events';
import { createMockTelemetryEventsSender } from '../../../../telemetry/__mocks__';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';

const mockUpdateWatchlistWithSources = jest.fn();
jest.mock('../update_watchlist_with_sources', () => ({
  updateWatchlistWithSources: (...args: unknown[]) => mockUpdateWatchlistWithSources(...args),
}));

const mockSyncWatchlistInBackground = jest.fn();
jest.mock('../../entity_sources/entity_sources_service', () => ({
  syncWatchlistInBackground: (...args: unknown[]) => mockSyncWatchlistInBackground(...args),
}));

import { updateWatchlistRoute } from './update';

describe('PUT /api/entity_analytics/watchlists/{id} - updateWatchlistRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;
  let telemetrySenderMock: ITelemetryEventsSender;
  let reportEBT: jest.Mock;

  const watchlistId = 'wl-1';

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    const { context: ctx } = requestContextMock.createTools();
    context = requestContextMock.convertContext(ctx);

    mockUpdateWatchlistWithSources.mockReset();
    mockSyncWatchlistInBackground.mockReset().mockResolvedValue(undefined);

    reportEBT = jest.fn();
    telemetrySenderMock = {
      ...createMockTelemetryEventsSender(),
      reportEBT,
    } as unknown as ITelemetryEventsSender;

    updateWatchlistRoute(server.router, logger, telemetrySenderMock, jest.fn(), true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (id: string, body: object) =>
    requestMock.create({
      method: 'put',
      path: `${WATCHLISTS_URL}/${id}`,
      params: { id },
      body,
    });

  it('updates a watchlist and returns 200 with success telemetry', async () => {
    const body = {
      name: 'updated-name',
      description: 'Updated description',
      riskModifier: 1.5,
    };
    const updated = {
      id: watchlistId,
      ...body,
    };
    mockUpdateWatchlistWithSources.mockResolvedValue({ watchlist: updated, shouldSync: false });

    const request = buildRequest(watchlistId, body);
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(updated);
    expect(mockUpdateWatchlistWithSources).toHaveBeenCalledWith(
      expect.objectContaining({ watchlistId, watchlist: body, entitySources: undefined })
    );
    expect(mockSyncWatchlistInBackground).not.toHaveBeenCalled();
    expect(reportEBT).toHaveBeenCalledTimes(1);
    expect(reportEBT).toHaveBeenCalledWith(
      WATCHLIST_API_CALL_EVENT,
      expect.objectContaining({
        watchlist_id: watchlistId,
        watchlist_name: 'custom watchlist',
        risk_modifier: 1.5,
        is_managed: false,
        endpoint: expect.stringContaining('/api/entity_analytics/watchlists'),
      })
    );
  });

  it('uses the managed watchlist name in telemetry when managed is true', async () => {
    const body = {
      name: 'prebuilt-name',
      riskModifier: 1,
      managed: true,
    };
    const updated = { id: watchlistId, ...body };
    mockUpdateWatchlistWithSources.mockResolvedValue({ watchlist: updated, shouldSync: false });

    const request = buildRequest(watchlistId, body);
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(reportEBT).toHaveBeenCalledWith(
      WATCHLIST_API_CALL_EVENT,
      expect.objectContaining({
        watchlist_id: watchlistId,
        watchlist_name: 'prebuilt-name',
        is_managed: true,
      })
    );
  });

  describe('with entitySources', () => {
    const sources = [{ type: 'store', name: 'test-store', queryRule: 'entity.id: *' }];

    it('saves the data sources with the watchlist and syncs once when they were added or removed', async () => {
      const body = { name: 'test', riskModifier: 1, entitySources: sources };
      mockUpdateWatchlistWithSources.mockResolvedValue({
        watchlist: { id: watchlistId, name: 'test', riskModifier: 1 },
        shouldSync: true,
      });

      const response = await server.inject(buildRequest(watchlistId, body), context);

      expect(response.status).toEqual(200);
      expect(mockUpdateWatchlistWithSources).toHaveBeenCalledWith(
        expect.objectContaining({
          watchlistId,
          watchlist: { name: 'test', riskModifier: 1 },
          entitySources: sources,
        })
      );
      expect(mockSyncWatchlistInBackground).toHaveBeenCalledTimes(1);
    });

    it('rejects when data source is not a rule-based source', async () => {
      const response = await server.inject(
        buildRequest(watchlistId, {
          name: 'test',
          riskModifier: 1,
          entitySources: [{ type: 'entity_analytics_integration', name: 'okta' }],
        }),
        context
      );

      expect(response.status).toEqual(400);
      expect(mockUpdateWatchlistWithSources).not.toHaveBeenCalled();
    });
  });

  it('returns an error response and error telemetry when update fails', async () => {
    mockUpdateWatchlistWithSources.mockRejectedValue(new Error('update failed'));

    const request = buildRequest(watchlistId, {
      name: 'x',
      riskModifier: 1,
    });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'update failed',
      status_code: 500,
    });
    expect(logger.error).toHaveBeenCalledWith('Failed to update watchlist: update failed');
    expect(reportEBT).toHaveBeenCalledWith(
      WATCHLIST_API_CALL_EVENT,
      expect.objectContaining({
        endpoint: expect.stringContaining('/api/entity_analytics/watchlists'),
        error: 'update failed',
        watchlist_id: watchlistId,
      })
    );
    expect(mockSyncWatchlistInBackground).not.toHaveBeenCalled();
  });

  it('passes a conflict on with its status, without syncing, when the watchlist name is already in use', async () => {
    mockUpdateWatchlistWithSources.mockRejectedValue(
      Object.assign(new Error('A watchlist named "test" already exists'), { statusCode: 409 })
    );

    const response = await server.inject(
      buildRequest(watchlistId, { name: 'test', riskModifier: 1 }),
      context
    );

    expect(response.status).toEqual(409);
    expect(response.body).toEqual({
      message: 'A watchlist named "test" already exists',
      status_code: 409,
    });
    expect(mockSyncWatchlistInBackground).not.toHaveBeenCalled();
  });
});
