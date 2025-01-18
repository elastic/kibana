/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_BULK_CREATE } from '../../../../../../../common/constants';
import {
  getReadBulkRequest,
  getFindResultWithSingleHit,
  getEmptyFindResult,
  getRuleMock,
  createBulkMlRuleRequest,
  getBasicEmptySearchResponse,
  getBasicNoShardsSearchResponse,
} from '../../../../routes/__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../../../../routes/__mocks__';
import { bulkCreateRulesRoute } from './route';
import { getCreateRulesSchemaMock } from '../../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { HttpAuthzError } from '../../../../../machine_learning/validation';
import { getRulesSchemaMock } from '../../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';

describe('Bulk create rules route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    const logger = loggingSystemMock.createLogger();

    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult()); // no existing rules
    clients.rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams())); // successful creation
    clients.detectionRulesClient.createCustomRule.mockResolvedValue(getRulesSchemaMock());
    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    bulkCreateRulesRoute(server.router, logger);
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getReadBulkRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });
  });

  describe('unhappy paths', () => {
    test('returns a 403 error object if ML Authz fails', async () => {
      clients.detectionRulesClient.createCustomRule.mockImplementationOnce(async () => {
        throw new HttpAuthzError('mocked validation message');
      });

      const response = await server.inject(
        createBulkMlRuleRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        {
          error: {
            message: 'mocked validation message',
            status_code: 403,
          },
          rule_id: 'rule-1',
        },
      ]);
    });

    test('returns an error object if the index does not exist when rule registry not enabled', async () => {
      context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValueOnce(
        elasticsearchClientMock.createSuccessTransportRequestPromise(
          getBasicNoShardsSearchResponse()
        )
      );
      const response = await server.inject(
        getReadBulkRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
    });

    test('returns a duplicate error if rule_id already exists', async () => {
      clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const response = await server.inject(
        getReadBulkRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          error: {
            message: expect.stringContaining('already exists'),
            status_code: 409,
          },
        }),
      ]);
    });

    test('catches error if creation throws', async () => {
      clients.detectionRulesClient.createCustomRule.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getReadBulkRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          error: {
            message: 'Test error',
            status_code: 500,
          },
        }),
      ]);
    });

    test('returns an error object if duplicate rule_ids found in request payload', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [getCreateRulesSchemaMock(), getCreateRulesSchemaMock()],
      });
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          error: {
            message: expect.stringContaining('already exists'),
            status_code: 409,
          },
        }),
      ]);
    });
  });

  describe('request validation', () => {
    test('allows rule type of query', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [{ ...getCreateRulesSchemaMock(), type: 'query' }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [{ from: 'now-7m', interval: '5m', ...getCreateRulesSchemaMock() }],
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [{ ...getCreateRulesSchemaMock(), type: 'unexpected_type' }],
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_BULK_CREATE,
        body: [
          {
            from: 'now-3755555555555555.67s',
            interval: '5m',
            ...getCreateRulesSchemaMock(),
          },
        ],
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        '0.from: Failed to parse date-math expression'
      );
    });
  });
});
