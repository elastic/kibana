/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getEmptyFindResult,
  getRuleMock,
  getUpdateRequest,
  getFindResultWithSingleHit,
  nonRuleFindResult,
  typicalMlRulePayload,
} from '../../../../routes/__mocks__/request_responses';
import { requestContextMock, serverMock, requestMock } from '../../../../routes/__mocks__';
import { getRulesSchemaMock } from '../../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import { updateRuleRoute } from './route';
import {
  getCreateEqlRuleSchemaMock,
  getCreateEsqlRulesSchemaMock,
  getCreateNewTermsRulesSchemaMock,
  getCreateRulesSchemaMock,
  getUpdateRulesSchemaMock,
} from '../../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { ResponseActionTypesEnum } from '../../../../../../../common/api/detection_engine';
import { HttpAuthzError } from '../../../../../machine_learning/validation';
import type {
  MockClients,
  SecuritySolutionRequestHandlerContextMock,
} from '../../../../routes/__mocks__/request_context';
import { createMockEndpointAppContextService } from '../../../../../../endpoint/mocks';

describe('Update rule route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let clients: MockClients;
  let context: SecuritySolutionRequestHandlerContextMock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.rulesClient.get.mockResolvedValue(getRuleMock(getQueryRuleParams())); // existing rule
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // rule exists
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams())); // successful update
    clients.detectionRulesClient.updateRule.mockResolvedValue(getRulesSchemaMock());
    clients.appClient.getSignalsIndex.mockReturnValue('.siem-signals-test-index');

    context.securitySolution.getEndpointService.mockReturnValue(
      createMockEndpointAppContextService()
    );

    updateRuleRoute(server.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('status codes', () => {
    test('returns 200', async () => {
      const response = await server.inject(
        getUpdateRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('returns 404 when updating a single rule that does not exist', async () => {
      clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());

      const response = await server.inject(
        getUpdateRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('returns error when updating non-rule', async () => {
      clients.rulesClient.find.mockResolvedValue(nonRuleFindResult());
      const response = await server.inject(
        getUpdateRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(404);
      expect(response.body).toEqual({
        message: 'rule_id: "rule-1" not found',
        status_code: 404,
      });
    });

    test('catches error if search throws error', async () => {
      clients.rulesClient.find.mockImplementation(async () => {
        throw new Error('Test error');
      });
      const response = await server.inject(
        getUpdateRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    it('returns a 403 if mlAuthz fails', async () => {
      clients.detectionRulesClient.updateRule.mockImplementationOnce(async () => {
        throw new HttpAuthzError('mocked validation message');
      });
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: typicalMlRulePayload(),
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(403);
      expect(response.body).toEqual({
        message: 'mocked validation message',
        status_code: 403,
      });
    });
  });

  describe('request validation', () => {
    test('rejects payloads with no ID', async () => {
      const noIdRequest = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getUpdateRulesSchemaMock(),
          id: undefined,
        },
      });
      const response = await server.inject(noIdRequest, requestContextMock.convertContext(context));
      expect(response.body).toEqual({
        message: ['either "id" or "rule_id" must be set'],
        status_code: 400,
      });
    });

    test('allows query rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getUpdateRulesSchemaMock(), type: 'query' },
      });
      const result = await server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('rejects unknown rule type', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { ...getUpdateRulesSchemaMock(), type: 'unknown type' },
      });
      const result = await server.validate(request);

      expect(result.badRequest).toHaveBeenCalled();
    });

    test('allows rule type of query and custom from and interval', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: { from: 'now-7m', interval: '5m', ...getUpdateRulesSchemaMock(), type: 'query' },
      });
      const result = server.validate(request);

      expect(result.ok).toHaveBeenCalled();
    });

    test('disallows invalid "from" param on rule', async () => {
      const request = requestMock.create({
        method: 'put',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          from: 'now-3755555555555555.67s',
          interval: '5m',
          ...getUpdateRulesSchemaMock(),
          type: 'query',
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
      ['query', () => getCreateRulesSchemaMock()],
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
    test('fails when isolate rbac and response action is being removed to finish as empty array', async () => {
      (context.securitySolution.getEndpointAuthz as jest.Mock).mockReturnValue(() => ({
        canIsolateHost: jest.fn().mockReturnValue(false),
      }));
      clients.rulesClient.find.mockResolvedValue({
        page: 1,
        perPage: 1,
        total: 1,
        data: [
          getRuleMock({
            ...getQueryRuleParams(),
            responseActions: [
              {
                actionTypeId: ResponseActionTypesEnum['.endpoint'],
                params: {
                  command: 'isolate',
                  comment: '',
                  config: undefined,
                },
              },
            ],
          }),
        ],
      });

      const request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_RULES_URL,
        body: {
          ...getCreateRulesSchemaMock(),
          response_actions: [],
        },
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(403);
      expect(response.body.message).toEqual(
        'User is not authorized to create/update isolate response action'
      );
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
