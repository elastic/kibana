/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import {
  getEmptyFindResult,
  getRuleMock,
  getCreateRequest,
  getFindResultWithSingleHit,
  createMlRuleRequest,
  getBasicEmptySearchResponse,
} from '../../../../routes/__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../../../../routes/__mocks__';
import { createRuleRoute } from './route';
import {
  getCreateEqlRuleSchemaMock,
  getCreateEsqlRulesSchemaMock,
  getCreateNewTermsRulesSchemaMock,
  getCreateRulesSchemaMock,
} from '../../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { HttpAuthzError } from '../../../../../machine_learning/validation';
import { getRulesSchemaMock } from '../../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
import type {
  MockClients,
  SecuritySolutionRequestHandlerContextMock,
} from '../../../../routes/__mocks__/request_context';
import { createMockEndpointAppContextService } from '../../../../../../endpoint/mocks';

describe('Create rule route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let clients: MockClients;
  let context: SecuritySolutionRequestHandlerContextMock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult()); // no current rules
    clients.rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams())); // creation succeeds
    clients.detectionRulesClient.createCustomRule.mockResolvedValue(getRulesSchemaMock());

    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    context.securitySolution.getEndpointService.mockReturnValue(
      createMockEndpointAppContextService()
    );

    createRuleRoute(server.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('status codes', () => {
    test('returns 200 with a rule created via RulesClient', async () => {
      const response = await server.inject(
        getCreateRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 200 if license is not platinum', async () => {
      (context.licensing.license.hasAtLeast as jest.Mock).mockReturnValue(false);

      const response = await server.inject(
        getCreateRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });
  });

  describe('creating an ML Rule', () => {
    test('is successful', async () => {
      const response = await server.inject(
        createMlRuleRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns a 403 if ML Authz fails', async () => {
      clients.detectionRulesClient.createCustomRule.mockImplementation(async () => {
        throw new HttpAuthzError('mocked validation message');
      });

      const response = await server.inject(
        createMlRuleRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });
  });

  describe('unhappy paths', () => {
    test('returns a duplicate error if rule_id already exists', async () => {
      clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
      const response = await server.inject(
        getCreateRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(409);
      expect(response.body).toEqual({
        message: expect.stringContaining('already exists'),
        status_code: 409,
      });
    });

    test('catches error if creation throws', async () => {
      clients.detectionRulesClient.createCustomRule.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getCreateRequest(),
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
    test('allows rule type of query', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          type: 'query',
        },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows unknown rule type', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          type: 'unexpected_type',
        },
      });
      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: { from: 'now-7m', interval: '5m', ...getCreateRulesSchemaMock() },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getCreateRulesSchemaMock(),
        },
      });
      const result = server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith('from: Failed to parse date-math expression');
    });
  });
  describe('rule containing response actions', () => {
    const getResponseAction = (command: string = 'isolate', config?: object) => ({
      action_type_id: '.endpoint',
      params: {
        command,
        comment: '',
        ...(config ? { config } : {}),
      },
    });
    const defaultAction = getResponseAction();
    const ruleTypes: Array<[string, () => object]> = [
      ['query', getCreateRulesSchemaMock],
      ['esql', getCreateEsqlRulesSchemaMock],
      ['eql', getCreateEqlRuleSchemaMock],
      ['new_terms', getCreateNewTermsRulesSchemaMock],
    ];

    test.each(ruleTypes)(
      'is successful for %s rule',
      async (ruleType: string, schemaMock: (ruleId: string) => object) => {
        const request = requestMock.create({
          method: 'post',
          path: DETECTION_ENGINE_RULES_URL,
          body: {
            ...schemaMock(`rule-${ruleType}`),
            response_actions: [defaultAction],
          },
        });

        const response = await server.inject(request, requestContextMock.convertContext(context));
        expect(response.status).toEqual(200);
      }
    );

    test('fails when isolate rbac is set to false', async () => {
      (context.securitySolution.getEndpointAuthz as jest.Mock).mockReturnValue(() => ({
        canIsolateHost: jest.fn().mockReturnValue(false),
      }));

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          response_actions: [defaultAction],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(403);
      expect(response.body.message).toEqual(
        'User is not authorized to create/update isolate response action'
      );
    });
    test('pass when provided with process action', async () => {
      const processAction = getResponseAction('kill-process', { overwrite: true, field: '' });

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          response_actions: [processAction],
        },
      });
      const result = await server.validate(request);
      expect(result.badRequest).not.toHaveBeenCalled();
    });
    test('fails when provided with an unsupported command', async () => {
      const wrongAction = getResponseAction('execute');

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          response_actions: [wrongAction],
        },
      });
      const result = await server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        `response_actions.0.action_type_id: Invalid literal value, expected \".osquery\", response_actions.0.params.command: Invalid literal value, expected \"isolate\", response_actions.0.params.command: Invalid enum value. Expected 'kill-process' | 'suspend-process', received 'execute', response_actions.0.params.config: Required`
      );
    });
    test('fails when provided with payload missing data', async () => {
      const wrongAction = getResponseAction('kill-process', { overwrite: true });

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          response_actions: [wrongAction],
        },
      });
      const result = await server.validate(request);
      expect(result.badRequest).toHaveBeenCalledWith(
        `response_actions.0.action_type_id: Invalid literal value, expected \".osquery\", response_actions.0.params.command: Invalid literal value, expected \"isolate\", response_actions.0.params.config.field: Required`
      );
    });
  });
});
