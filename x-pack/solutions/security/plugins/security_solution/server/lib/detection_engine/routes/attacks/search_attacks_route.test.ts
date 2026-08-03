/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { DETECTION_ENGINE_ATTACKS_SEARCH_URL } from '../../../../../common/constants';
import {
  getEmptySignalsResponse,
  typicalSignalsQuery,
  typicalSignalsQueryAggs,
} from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { ATTACKS_API_CALL_EVENT } from '../../../telemetry/event_based/events';
import { createMockTelemetryEventsSender } from '../../../telemetry/__mocks__';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { searchAttacksRoute } from './search_attacks_route';

const getAttacksSearchQueryRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
    body: typicalSignalsQuery(),
  });

const getAttacksSearchAggsRequest = () =>
  requestMock.create({
    method: 'post',
    path: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
    body: typicalSignalsQueryAggs(),
  });

describe('search for attacks', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;
  let telemetrySenderMock: ITelemetryEventsSender;
  let reportEBT: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getEmptySignalsResponse())
    );
    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getEmptySignalsResponse() as any
    );

    reportEBT = jest.fn();
    telemetrySenderMock = {
      ...createMockTelemetryEventsSender(),
      reportEBT,
    } as unknown as ITelemetryEventsSender;

    searchAttacksRoute(server.router, telemetrySenderMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('search and agg on attack indices only', () => {
    test('returns 200 when using single search', async () => {
      const response = await server.inject(
        getAttacksSearchQueryRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining(typicalSignalsQuery())
      );
    });

    test('searches scheduled and adhoc attack indices for the active space', async () => {
      const response = await server.inject(
        getAttacksSearchQueryRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: [
            `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-default`,
            `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-default`,
          ],
          ignore_unavailable: true,
        })
      );
    });

    test('uses attack index names suffixed with the active Kibana space', async () => {
      context.securitySolution.getSpaceId.mockReturnValue('custom-space');

      const response = await server.inject(
        getAttacksSearchQueryRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: [
            `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-custom-space`,
            `${ATTACK_DISCOVERY_ADHOC_ALERTS_COMMON_INDEX_PREFIX}-custom-space`,
          ],
        })
      );
    });

    test('returns 200 when using aggregations only', async () => {
      const response = await server.inject(
        getAttacksSearchAggsRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({ ...typicalSignalsQueryAggs(), ignore_unavailable: true })
      );
    });

    test('returns 200 when searching by ids', async () => {
      const attackId = '40980216-cf98-4447-af57-894c0e7c39b4';
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
        body: { query: { ids: { values: [attackId] } } },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { ids: { values: [attackId] } },
        })
      );
    });

    test('catches error if search throws error', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockRejectedValue(
        new Error('Test error')
      );
      const response = await server.inject(
        getAttacksSearchAggsRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('rejects when missing aggs and search', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
        body: {},
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: '"value" must have at least 1 children',
        status_code: 400,
      });
    });
  });

  describe('telemetry', () => {
    test('reports success telemetry on search', async () => {
      await server.inject(
        getAttacksSearchQueryRequest(),
        requestContextMock.convertContext(context)
      );

      expect(reportEBT).toHaveBeenCalledTimes(1);
      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          endpoint: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
          operation: 'search',
          has_aggregations: false,
          has_ids_filter: false,
        })
      );
    });

    test('reports aggregations and ids filter in telemetry', async () => {
      const attackId = '40980216-cf98-4447-af57-894c0e7c39b4';
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
        body: {
          query: { ids: { values: [attackId] } },
          aggs: { status: { terms: { field: 'status' } } },
        },
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          operation: 'search',
          has_aggregations: true,
          has_ids_filter: true,
        })
      );
    });

    test('does not count empty aggs object as aggregations', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
        body: { aggs: {}, query: { match_all: {} } },
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          operation: 'search',
          has_aggregations: false,
        })
      );
    });

    test('reports error telemetry on validation failure', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
        body: {},
      });

      await server.inject(request, requestContextMock.convertContext(context));

      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          operation: 'search',
          error: expect.any(String),
        })
      );
    });

    test('reports error telemetry on ES failure', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockRejectedValue(
        new Error('Test error')
      );

      await server.inject(
        getAttacksSearchAggsRequest(),
        requestContextMock.convertContext(context)
      );

      expect(reportEBT).toHaveBeenCalledWith(
        ATTACKS_API_CALL_EVENT,
        expect.objectContaining({
          operation: 'search',
          error: 'Test error',
        })
      );
    });
  });
});
