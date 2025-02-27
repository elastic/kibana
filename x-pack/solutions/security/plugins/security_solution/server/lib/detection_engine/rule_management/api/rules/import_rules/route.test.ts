/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  getImportRulesWithIdSchemaMock,
  ruleIdsToNdJsonString,
  rulesToNdJsonString,
} from '../../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';

import type { requestMock } from '../../../../routes/__mocks__';
import { configMock, requestContextMock, serverMock } from '../../../../routes/__mocks__';
import { buildHapiStream } from '../../../../routes/__mocks__/utils';
import {
  getImportRulesRequest,
  getImportRulesRequestOverwriteTrue,
  getEmptyFindResult,
  getRuleMock,
  getFindResultWithSingleHit,
  getBasicEmptySearchResponse,
} from '../../../../routes/__mocks__/request_responses';

import * as createPromiseFromRuleImportStream from '../../../logic/import/create_promise_from_rule_import_stream';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { importRulesRoute } from './route';
import { HttpAuthzError } from '../../../../../machine_learning/validation';
import { createPrebuiltRuleAssetsClient as createPrebuiltRuleAssetsClientMock } from '../../../../prebuilt_rules/logic/rule_assets/__mocks__/prebuilt_rule_assets_client';

jest.mock('../../../../../machine_learning/authz');

let mockPrebuiltRuleAssetsClient: ReturnType<typeof createPrebuiltRuleAssetsClientMock>;

jest.mock('../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client', () => ({
  createPrebuiltRuleAssetsClient: () => mockPrebuiltRuleAssetsClient,
}));

describe('Import rules route', () => {
  let config: ReturnType<typeof configMock.createDefault>;
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    config = configMock.createDefault();
    const hapiStream = buildHapiStream(ruleIdsToNdJsonString(['rule-1']));
    request = getImportRulesRequest(hapiStream);

    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult()); // no extant rules
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    clients.detectionRulesClient.createCustomRule.mockResolvedValue(getRulesSchemaMock());
    clients.detectionRulesClient.importRule.mockResolvedValue(getRulesSchemaMock());
    clients.detectionRulesClient.getRuleCustomizationStatus.mockReturnValue({
      isRulesCustomizationEnabled: false,
    });
    clients.actionsClient.getAll.mockResolvedValue([]);
    context.core.elasticsearch.client.asCurrentUser.search.mockResolvedValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getBasicEmptySearchResponse())
    );
    mockPrebuiltRuleAssetsClient = createPrebuiltRuleAssetsClientMock();
    importRulesRoute(server.router, config);
  });

  describe('status codes', () => {
    test('returns 200 when importing a single rule with a valid actionClient and alertClient', async () => {
      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });

    test('returns 500 if more than 10,000 rules are imported', async () => {
      const ruleIds = new Array(10001).fill(undefined).map((__, index) => `rule-${index}`);
      const multiRequest = getImportRulesRequest(buildHapiStream(ruleIdsToNdJsonString(ruleIds)));
      const response = await server.inject(
        multiRequest,
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: "Can't import more than 10000 rules",
        status_code: 500,
      });
    });
  });

  describe('unhappy paths', () => {
    test('returns a 403 error object if ML Authz fails', async () => {
      clients.detectionRulesClient.importRule.mockImplementationOnce(async () => {
        throw new HttpAuthzError('mocked validation message');
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [
          {
            error: {
              message: 'mocked validation message',
              status_code: 403,
            },
            rule_id: 'rule-1',
          },
        ],
        success: false,
        success_count: 0,
        rules_count: 1,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_warnings: [],
        action_connectors_errors: [],
      });
    });

    test('returns error if createPromiseFromRuleImportStream throws error', async () => {
      const transformMock = jest
        .spyOn(createPromiseFromRuleImportStream, 'createPromiseFromRuleImportStream')
        .mockImplementation(() => {
          throw new Error('Test error');
        });
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ message: 'Test error', status_code: 500 });

      transformMock.mockRestore();
    });

    test('returns 400 if file extension type is not .ndjson', async () => {
      const requestPayload = buildHapiStream(ruleIdsToNdJsonString(['rule-1']), 'wrong.html');
      const badRequest = getImportRulesRequest(requestPayload);
      const response = await server.inject(badRequest, requestContextMock.convertContext(context));

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({ message: 'Invalid file extension .html', status_code: 400 });
    });

    describe('with prebuilt rules customization enabled', () => {
      beforeEach(() => {
        clients.detectionRulesClient.importRules.mockResolvedValueOnce([]);
        clients.detectionRulesClient.getRuleCustomizationStatus.mockReturnValue({
          isRulesCustomizationEnabled: true,
        });
      });

      test('returns 500 if importing fails', async () => {
        clients.detectionRulesClient.importRules
          .mockReset()
          .mockRejectedValue(new Error('test error'));

        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(500);
        expect(response.body).toMatchObject({
          message: 'test error',
          status_code: 500,
        });
      });
    });
  });

  describe('single rule import', () => {
    test('returns 200 if rule imported successfully', async () => {
      clients.rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams()));
      const response = await server.inject(request, requestContextMock.convertContext(context));
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [],
        success: true,
        success_count: 1,
        rules_count: 1,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_warnings: [],
        action_connectors_errors: [],
      });
    });

    test('returns reported conflict if error parsing rule', async () => {
      const requestPayload = buildHapiStream('this is not a valid ndjson string!');
      const badRequest = getImportRulesRequest(requestPayload);
      const response = await server.inject(badRequest, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [
          {
            error: {
              message: `Unexpected token 'h', "this is not"... is not valid JSON`,
              status_code: 400,
            },
            rule_id: '(unknown id)',
          },
        ],
        success: false,
        success_count: 0,
        rules_count: 1,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_warnings: [],
        action_connectors_errors: [],
      });
    });

    describe('rule with existing rule_id', () => {
      test('returns with reported conflict if `overwrite` is set to `false`', async () => {
        clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // extant rule
        clients.detectionRulesClient.importRule.mockRejectedValue({
          message: 'rule_id: "rule-1" already exists',
          statusCode: 409,
        });
        const response = await server.inject(request, requestContextMock.convertContext(context));

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [
            {
              error: {
                message: 'rule_id: "rule-1" already exists',
                status_code: 409,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 0,
          rules_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_warnings: [],
          action_connectors_errors: [],
        });
      });

      test('returns with NO reported conflict if `overwrite` is set to `true`', async () => {
        clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit()); // extant rule
        const overwriteRequest = getImportRulesRequestOverwriteTrue(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1']))
        );
        const response = await server.inject(
          overwriteRequest,
          requestContextMock.convertContext(context)
        );

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 1,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_warnings: [],
          action_connectors_errors: [],
        });
      });
    });
  });

  describe('multi rule import', () => {
    test('returns 200 if all rules imported successfully', async () => {
      const multiRequest = getImportRulesRequest(
        buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-2']))
      );
      const response = await server.inject(
        multiRequest,
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [],
        success: true,
        success_count: 2,
        exceptions_errors: [],
        rules_count: 2,
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_warnings: [],
        action_connectors_errors: [],
      });
    });

    test('returns 200 if many rules are imported successfully', async () => {
      const ruleIds = new Array(9999).fill(undefined).map((__, index) => `rule-${index}`);
      const multiRequest = getImportRulesRequest(buildHapiStream(ruleIdsToNdJsonString(ruleIds)));
      const response = await server.inject(
        multiRequest,
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [],
        success: true,
        success_count: 9999,
        rules_count: 9999,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_warnings: [],
        action_connectors_errors: [],
      });
    });

    test('returns 200 with errors if all rules are missing rule_ids and import fails on validation', async () => {
      const rulesWithoutRuleIds = ['rule-1', 'rule-2'].map((ruleId) =>
        getImportRulesWithIdSchemaMock(ruleId)
      );
      // @ts-expect-error
      delete rulesWithoutRuleIds[0].rule_id;
      // @ts-expect-error
      delete rulesWithoutRuleIds[1].rule_id;
      const badPayload = buildHapiStream(rulesToNdJsonString(rulesWithoutRuleIds));
      const badRequest = getImportRulesRequest(badPayload);

      const response = await server.inject(badRequest, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        errors: [
          {
            error: {
              message: 'rule_id: Required',
              status_code: 400,
            },
            rule_id: '(unknown id)',
          },
          {
            error: {
              message: 'rule_id: Required',
              status_code: 400,
            },
            rule_id: '(unknown id)',
          },
        ],
        success: false,
        success_count: 0,
        rules_count: 2,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_warnings: [],
        action_connectors_errors: [],
      });
    });

    describe('importing duplicated rule_ids', () => {
      test('reports a conflict if `overwrite` is set to `false`', async () => {
        const multiRequest = getImportRulesRequest(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-1']))
        );
        const response = await server.inject(
          multiRequest,
          requestContextMock.convertContext(context)
        );

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [
            {
              error: {
                message: 'More than one rule with rule-id: "rule-1" found',
                status_code: 400,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 1,
          rules_count: 2,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_warnings: [],
          action_connectors_errors: [],
        });
      });

      test('returns with NO reported conflict if `overwrite` is set to `true`', async () => {
        const multiRequest = getImportRulesRequestOverwriteTrue(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-1']))
        );

        const response = await server.inject(
          multiRequest,
          requestContextMock.convertContext(context)
        );
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [],
          success: true,
          success_count: 1,
          rules_count: 2,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_warnings: [],
          action_connectors_errors: [],
        });
      });
    });

    describe('rules with existing rule_id', () => {
      beforeEach(() => {
        clients.rulesClient.find.mockResolvedValueOnce(getFindResultWithSingleHit()); // extant rule
      });

      test('returns with reported conflict if `overwrite` is set to `false`', async () => {
        clients.detectionRulesClient.importRule.mockRejectedValueOnce({
          message: 'rule_id: "rule-1" already exists',
          statusCode: 409,
        });
        const multiRequest = getImportRulesRequest(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-2', 'rule-3']))
        );
        const response = await server.inject(
          multiRequest,
          requestContextMock.convertContext(context)
        );
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [
            {
              error: {
                message: 'rule_id: "rule-1" already exists',
                status_code: 409,
              },
              rule_id: 'rule-1',
            },
          ],
          success: false,
          success_count: 2,
          rules_count: 3,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_warnings: [],
          action_connectors_errors: [],
        });
      });

      test('returns 200 with NO reported conflict if `overwrite` is set to `true`', async () => {
        const multiRequest = getImportRulesRequestOverwriteTrue(
          buildHapiStream(ruleIdsToNdJsonString(['rule-1', 'rule-2', 'rule-3']))
        );
        const response = await server.inject(
          multiRequest,
          requestContextMock.convertContext(context)
        );
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          errors: [],
          success: true,
          success_count: 3,
          rules_count: 3,
          exceptions_errors: [],
          exceptions_success: true,
          exceptions_success_count: 0,
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_warnings: [],
          action_connectors_errors: [],
        });
      });
    });
  });
});
