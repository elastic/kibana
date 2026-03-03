/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { RuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';

import { DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL } from '../../../../../common/constants';
import {
  getSignalsQueryRequest,
  getSignalsAggsQueryRequest,
  typicalSignalsQuery,
  typicalSignalsQueryAggs,
  getSignalsAggsAndQueryRequest,
  getEmptySignalsResponse,
} from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { searchUnifiedAlertsRoute } from './search_route';

describe('search for unified alerts', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;
  let ruleDataClient: RuleDataClientMock;

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
    ruleDataClient = ruleRegistryMocks.createRuleDataClient('.alerts-security.alerts');

    searchUnifiedAlertsRoute(server.router, ruleDataClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('search and agg on signals index', () => {
    test('returns 200 when using single search', async () => {
      const response = await server.inject(
        getSignalsQueryRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining(typicalSignalsQuery())
      );
    });

    test('search on an index pattern without wildcard added', async () => {
      const response = await server.inject(
        getSignalsQueryRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: [
            '.alerts-security.alerts-default',
            '.alerts-security.attack.discovery.alerts-default',
          ],
        })
      );
    });

    test('returns 200 when using single agg', async () => {
      const response = await server.inject(
        getSignalsAggsQueryRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({ ...typicalSignalsQueryAggs(), ignore_unavailable: true })
      );
    });

    test('returns 200 when using aggs and search together', async () => {
      const response = await server.inject(
        getSignalsAggsAndQueryRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(context.core.elasticsearch.client.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          ...typicalSignalsQuery(),
          ...typicalSignalsQueryAggs(),
        })
      );
    });

    test('catches error if search throws error', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockRejectedValue(
        new Error('Test error')
      );
      const response = await server.inject(
        getSignalsAggsQueryRequest(),
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
    test('allows when search present', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
        body: typicalSignalsQuery(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('allows when aggregates are present', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
        body: typicalSignalsQueryAggs(),
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('allows when aggs and search present', async () => {
      const body = { ...typicalSignalsQueryAggs(), ...typicalSignalsQuery() };
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
        body,
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects when missing aggs and search', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
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
});
