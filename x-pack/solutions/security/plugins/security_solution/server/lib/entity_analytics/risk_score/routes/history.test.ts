/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { RISK_SCORE_HISTORY_URL } from '../../../../../common/entity_analytics/risk_score/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskScoreDataClientMock } from '../risk_score_data_client.mock';
import { riskScoreHistoryRoute } from './history';
import type { SecuritySolutionRequestHandlerContextMock } from '../../../detection_engine/routes/__mocks__/request_context';

describe('risk score history route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;
  let logger: ReturnType<typeof loggerMock.create>;
  let mockRiskScoreDataClient: ReturnType<typeof riskScoreDataClientMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    ({ context } = requestContextMock.createTools());
    mockRiskScoreDataClient = riskScoreDataClientMock.create();
    context.securitySolution.getRiskScoreDataClient.mockReturnValue(mockRiskScoreDataClient);

    // TimeBuckets reads these to derive the histogram interval from the range.
    context.core.uiSettings.client.get.mockImplementation((key: unknown) => {
      switch (key) {
        case 'histogram:maxBars':
          return Promise.resolve(100);
        case 'histogram:barTarget':
          return Promise.resolve(50);
        case 'dateFormat':
          return Promise.resolve('MMM D, YYYY @ HH:mm:ss.SSS');
        case 'dateFormat:scaled':
          return Promise.resolve([['', 'HH:mm:ss.SSS']]);
        default:
          return Promise.resolve(undefined);
      }
    });

    riskScoreHistoryRoute(server.router, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const buildRequest = (overrides: Record<string, unknown> = {}) => {
    const defaults = {
      entity_type: 'host',
      entity_id: 'test-entity-id',
    };

    return requestMock.create({
      method: 'get',
      path: RISK_SCORE_HISTORY_URL,
      query: { ...defaults, ...overrides },
    });
  };

  it('returns 200 with entries from the data client', async () => {
    const entries = [
      {
        '@timestamp': '2026-01-01T00:00:00.000Z',
        calculated_score_norm: 42,
        calculated_level: 'Low' as const,
      },
    ];
    mockRiskScoreDataClient.getRiskScoreHistory.mockResolvedValue(entries);

    const request = buildRequest();
    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      entity_id: 'test-entity-id',
      entity_type: 'host',
      // 90d range at barTarget 50 → daily buckets
      interval: '1d',
      entries,
    });
  });

  it('calls getRiskScoreHistory with the derived interval and range', async () => {
    const request = buildRequest({
      from: 'now-30d',
      to: 'now',
      score_type: 'base',
    });

    await server.inject(request, requestContextMock.convertContext(context));

    expect(mockRiskScoreDataClient.getRiskScoreHistory).toHaveBeenCalledWith({
      entityType: 'host',
      entityId: 'test-entity-id',
      range: { gte: 'now-30d', lte: 'now' },
      scoreType: 'base',
      // 30d range at barTarget 50 → 12h buckets
      interval: { value: 12, unit: 'h' },
      includeContributions: false,
    });
    expect(mockRiskScoreDataClient.getRiskScoreHistory).not.toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: expect.anything() })
    );
  });

  it('uses defaults when optional params are omitted', async () => {
    const request = buildRequest();

    await server.inject(request, requestContextMock.convertContext(context));

    expect(mockRiskScoreDataClient.getRiskScoreHistory).toHaveBeenCalledWith({
      entityType: 'host',
      entityId: 'test-entity-id',
      range: { gte: 'now-90d', lte: 'now' },
      scoreType: undefined,
      interval: { value: 1, unit: 'd' },
      includeContributions: false,
    });
  });

  it('floors sub-hour ranges (including the point-in-time from === to fetch) at 1h', async () => {
    const request = buildRequest({
      from: '2026-01-02T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
    });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body.interval).toEqual('1h');
    expect(mockRiskScoreDataClient.getRiskScoreHistory).toHaveBeenCalledWith(
      expect.objectContaining({ interval: { value: 1, unit: 'h' } })
    );
  });

  it('returns 400 when the time range cannot be parsed', async () => {
    const request = buildRequest({ from: 'not-a-real-date' });

    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(400);
    expect(mockRiskScoreDataClient.getRiskScoreHistory).not.toHaveBeenCalled();
  });

  it('threads include_contributions through to the data client', async () => {
    const request = buildRequest({ include_contributions: 'true' });

    await server.inject(request, requestContextMock.convertContext(context));

    expect(mockRiskScoreDataClient.getRiskScoreHistory).toHaveBeenCalledWith(
      expect.objectContaining({ includeContributions: true })
    );
  });

  it('returns 200 with empty entries when no data exists', async () => {
    mockRiskScoreDataClient.getRiskScoreHistory.mockResolvedValue([]);

    const request = buildRequest();
    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body.entries).toEqual([]);
  });

  it('returns 500 when data client throws', async () => {
    mockRiskScoreDataClient.getRiskScoreHistory.mockRejectedValue(new Error('ES failure'));

    const request = buildRequest();
    const response = await server.inject(request, requestContextMock.convertContext(context));

    expect(response.status).toEqual(500);
    expect(response.body).toEqual(expect.objectContaining({ message: 'ES failure' }));
  });

  describe('validation', () => {
    it('requires entity_type', async () => {
      const request = buildRequest({ entity_type: undefined });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    it('requires entity_id', async () => {
      const request = buildRequest({ entity_id: undefined });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    it('rejects invalid entity_type', async () => {
      const request = buildRequest({ entity_type: 'invalid' });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
