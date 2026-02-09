/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import type { RuleDataClientMock } from '@kbn/rule-registry-plugin/server/rule_data_client/rule_data_client.mock';

import { DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL } from '../../../../../common/constants';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import type { SecuritySolutionRequestHandlerContextMock } from '../__mocks__/request_context';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { setUnifiedAlertsTagsRoute } from './set_alert_tags_route';

describe('set unified alerts tags', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;
  let ruleDataClient: RuleDataClientMock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
      getSuccessfulSignalUpdateResponse()
    );
    ruleDataClient = ruleRegistryMocks.createRuleDataClient('.alerts-security.alerts');

    setUnifiedAlertsTagsRoute(server.router, ruleDataClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('tags on unified alerts', () => {
    test('returns 200 when setting tags on alerts by ids', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1', 'somefakeid2'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });

    test('updates on an index pattern with both detection and attack alerts', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: [
            '.alerts-security.alerts-default',
            '.alerts-security.attack.discovery.alerts-default',
          ],
        })
      );
    });

    test('calls "esClient.updateByQuery" with ids when ids are defined', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1', 'somefakeid2'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));

      expect(context.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: { terms: { _id: ['somefakeid1', 'somefakeid2'] } } } },
        })
      );
    });

    test('catches error if updateByQuery throws error', async () => {
      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('allows ids and tags', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1'],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects if ids but no tags', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: ['somefakeid1'],
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('rejects if tags but no ids', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('rejects empty ids array', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
        body: {
          ids: [],
          tags: {
            tags_to_add: ['tag1'],
            tags_to_remove: [],
          },
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });
  });
});
