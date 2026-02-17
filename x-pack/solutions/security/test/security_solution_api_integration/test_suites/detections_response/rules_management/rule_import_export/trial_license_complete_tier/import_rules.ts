/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { range } from 'lodash';
import { v4 as uuid } from 'uuid';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { DETECTION_ENGINE_RULES_IMPORT_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaMock,
  getImportExceptionsListItemNewerVersionSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import type {
  ReadExceptionListItemRequestQueryInput,
  ReadExceptionListRequestQueryInput,
} from '@kbn/securitysolution-exceptions-common/api';
import { createRule } from '@kbn/detections-response-ftr-services';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type TestAgent from 'supertest/lib/agent';
import { createSupertestErrorLogger } from '../../../../edr_workflows/utils';
import { PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID } from '../../../../../config/shared';
import {
  combineArrayToNdJson,
  fetchRule,
  getCustomQueryRuleParams,
  getThresholdRuleForAlertTesting,
  importRules,
  importRulesWithSuccess,
} from '../../../utils';
import { deleteAllExceptions } from '../../../../lists_and_exception_lists/utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getWebHookConnectorParams } from '../../../utils/connectors/get_web_hook_connector_params';
import { createConnector } from '../../../utils/connectors';
import { ROLE } from '../../../../../config/services/security_solution_edr_workflows_roles_users';

const RULE_TO_IMPORT_RULE_ID = 'imported-rule';
const RULE_TO_IMPORT_RULE_ID_2 = 'another-imported-rule';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const exceptionsApi = getService('exceptionsApi');
  const log = getService('log');
  const spacesServices = getService('spaces');
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');

  describe('@ess @serverless @skipInServerlessMKI import custom rules', () => {
    const spaceId = '4567-space';

    before(async () => {
      await spacesServices.delete(spaceId);
      await spacesServices.create({
        id: spaceId,
        name: spaceId,
      });
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllRules(supertest, log, spaceId);
      await deleteAllExceptions(supertest, log);
      await deleteAllExceptions(supertest, log, spaceId);
    });

    describe('validation', () => {
      it('rejects with an error if the file type is not that of a ndjson', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_RULES_IMPORT_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .attach('file', Buffer.from(''), 'rules.txt')
          .expect(400);

        expect(body).toEqual({
          status_code: 400,
          message: 'Invalid file extension .txt',
        });
      });

      describe('threshold rule type', () => {
        it('results in partial success if no threshold-specific fields are provided', async () => {
          const { threshold, ...rule } = getThresholdRuleForAlertTesting(['*']);

          const importResponse = await importRules({
            getService,
            rules: [rule],
            overwrite: false,
          });

          expect(importResponse.errors[0]).toEqual({
            error: { status_code: 400, message: 'threshold: Required' },
          });
        });

        it('results in partial success if more than 5 threshold fields', async () => {
          const baseRule = getThresholdRuleForAlertTesting(['*']);
          const rule = {
            ...baseRule,
            threshold: {
              ...baseRule.threshold,
              field: ['field-1', 'field-2', 'field-3', 'field-4', 'field-5', 'field-6'],
            },
          };

          const importResponse = await importRules({
            getService,
            rules: [rule],
            overwrite: false,
          });

          expect(importResponse.errors[0]).toEqual({
            error: {
              message: 'threshold.field: Array must contain at most 5 element(s)',
              status_code: 400,
            },
          });
        });

        it('results in partial success if threshold value is less than 1', async () => {
          const baseRule = getThresholdRuleForAlertTesting(['*']);
          const rule = {
            ...baseRule,
            threshold: {
              ...baseRule.threshold,
              value: 0,
            },
          };

          const importResponse = await importRules({
            getService,
            rules: [rule],
            overwrite: false,
          });

          expect(importResponse.errors[0]).toEqual({
            error: {
              message: 'threshold.value: Number must be greater than or equal to 1',
              status_code: 400,
            },
          });
        });

        it('results in 400 error if cardinality is also an agg field', async () => {
          const baseRule = getThresholdRuleForAlertTesting(['*']);
          const rule = {
            ...baseRule,
            threshold: {
              ...baseRule.threshold,
              cardinality: [
                {
                  field: 'process.name',
                  value: 5,
                },
              ],
            },
          };

          const importResponse = await importRules({
            getService,
            rules: [rule],
            overwrite: false,
          });

          expect(importResponse.errors[0]).toEqual({
            error: {
              message: 'Cardinality of a field that is being aggregated on is always 1',
              status_code: 400,
            },
          });
        });
      });
    });

    const testImportingInSpace = (kibanaSpaceId?: string) => {
      describe('only rules', () => {
        it('imports a custom query rule', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule).toMatchObject(IMPORT_PAYLOAD[0]);
        });

        it('imports a rule with defined optional fields', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
              investigation_fields: { field_names: ['foo'] },
              related_integrations: [
                {
                  package: 'somePackage',
                  version: '^1.0.0',
                },
              ],
              required_fields: [
                {
                  name: 'fieldA',
                  type: 'string',
                },
              ],
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule).toMatchObject({
            investigation_fields: { field_names: ['foo'] },
            related_integrations: [
              {
                package: 'somePackage',
                version: '^1.0.0',
              },
            ],
            required_fields: [
              {
                name: 'fieldA',
                type: 'string',
              },
            ],
          });
        });

        it('imports rules in bulk', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID }),
            getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID_2 }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          const { body: importedRule1 } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule1).toMatchObject(IMPORT_PAYLOAD[0]);

          const { body: importedRule2 } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID_2 },
            },
            kibanaSpaceId
          );

          expect(importedRule2).toMatchObject(IMPORT_PAYLOAD[1]);
        });
      });

      describe('rules with action connectors', () => {
        it('import a rule with an action connector', async () => {
          const webHookConnectorParams = getWebHookConnectorParams();
          const connectorId = await createConnector(
            supertest,
            webHookConnectorParams,
            undefined,
            kibanaSpaceId
          );
          const ACTION = {
            group: 'default',
            id: connectorId,
            action_type_id: webHookConnectorParams.connector_type_id,
            params: {},
          };
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
              actions: [ACTION],
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule.actions[0]).toMatchObject(ACTION);
        });

        it('imports multiple rules with action connectors in bulk', async () => {
          const WEBHOOK_CONNECTOR_ID = uuid();
          const WEBHOOK_CONNECTOR = {
            id: WEBHOOK_CONNECTOR_ID,
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.webhook',
              name: 'webhook',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          };
          const INDEX_CONNECTOR_ID = uuid();
          const INDEX_CONNECTOR = {
            id: INDEX_CONNECTOR_ID,
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.index',
              name: 'index',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          };
          const CUSTOM_QUERY_RULE_WITH_WEBHOOK_CONNECTOR = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            actions: [
              {
                group: 'default',
                id: WEBHOOK_CONNECTOR_ID,
                action_type_id: '.webhook',
                params: {},
              },
            ],
          });
          const CUSTOM_QUERY_RULE_WITH_INDEX_CONNECTOR = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID_2,
            actions: [
              {
                group: 'default',
                id: INDEX_CONNECTOR_ID,
                action_type_id: '.index',
                params: {},
              },
            ],
          });

          const IMPORT_PAYLOAD = [
            CUSTOM_QUERY_RULE_WITH_WEBHOOK_CONNECTOR,
            CUSTOM_QUERY_RULE_WITH_INDEX_CONNECTOR,
            WEBHOOK_CONNECTOR,
            INDEX_CONNECTOR,
          ];

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            success_count: 2,
            rules_count: 2,
            errors: [],
            action_connectors_success: true,
            action_connectors_success_count: 2,
            action_connectors_errors: [],
            action_connectors_warnings: [],
          });
        });
      });

      const assertExceptionList = async ({
        query,
        expected,
      }: {
        query: ReadExceptionListRequestQueryInput;
        expected: Record<string, unknown>;
      }) => {
        const { body: exceptionList } = await exceptionsApi
          .readExceptionList(
            {
              query,
            },
            kibanaSpaceId
          )
          .expect(200);

        expect(exceptionList).toMatchObject(expected);
      };
      const assertExceptionListItems = async ({
        query,
        expected,
      }: {
        query: ReadExceptionListItemRequestQueryInput;
        expected: Record<string, unknown>;
      }) => {
        const { body: exceptionListItem } = await exceptionsApi
          .readExceptionListItem(
            {
              query,
            },
            kibanaSpaceId
          )
          .expect(200);

        expect(exceptionListItem).toMatchObject(expected);
      };

      describe('rules with exceptions', () => {
        it('imports a rule with a single space exception', async () => {
          const CUSTOM_QUERY_RULE_WITH_EXCEPTION = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            exceptions_list: [
              {
                id: 'single',
                list_id: 'test_list_id',
                type: 'rule_default',
                namespace_type: 'single',
              },
            ],
          });
          const EXCEPTION_LIST = {
            ...getImportExceptionsListSchemaMock('test_list_id'),
            type: 'rule_default',
          };
          const EXCEPTION_LIST_ITEM = getImportExceptionsListItemNewerVersionSchemaMock(
            'test_item_id',
            'test_list_id'
          );
          const IMPORT_PAYLOAD = [
            CUSTOM_QUERY_RULE_WITH_EXCEPTION,
            EXCEPTION_LIST,
            EXCEPTION_LIST_ITEM,
          ];

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule.exceptions_list).toEqual([
            {
              ...CUSTOM_QUERY_RULE_WITH_EXCEPTION.exceptions_list?.[0],
              id: expect.any(String),
            },
          ]);

          await assertExceptionList({
            query: {
              id: importedRule.exceptions_list[0].id,
            },
            expected: EXCEPTION_LIST,
          });
          await assertExceptionListItems({
            query: {
              item_id: 'test_item_id',
              namespace_type: 'single',
            },
            expected: EXCEPTION_LIST_ITEM,
          });
        });

        it('imports a rule with space agnostic exception', async () => {
          const CUSTOM_QUERY_RULE_WITH_EXCEPTION = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            exceptions_list: [
              {
                id: 'agnostic',
                list_id: 'test_list_agnostic_id',
                type: 'detection',
                namespace_type: 'agnostic',
              },
            ],
          });
          const SPACE_AGNOSTIC_EXCEPTION_LIST = {
            ...getImportExceptionsListSchemaMock('test_list_agnostic_id'),
            type: 'detection',
            namespace_type: 'agnostic',
          };
          const SPACE_AGNOSTIC_EXCEPTION_LIST_ITEM = {
            ...getImportExceptionsListItemNewerVersionSchemaMock(
              'test_item_id',
              'test_list_agnostic_id'
            ),
            namespace_type: 'agnostic',
          };
          const IMPORT_PAYLOAD = [
            CUSTOM_QUERY_RULE_WITH_EXCEPTION,
            SPACE_AGNOSTIC_EXCEPTION_LIST,
            SPACE_AGNOSTIC_EXCEPTION_LIST_ITEM,
          ];

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule.exceptions_list).toEqual([
            {
              ...CUSTOM_QUERY_RULE_WITH_EXCEPTION.exceptions_list?.[0],
              id: expect.any(String),
            },
          ]);

          await assertExceptionList({
            query: {
              id: importedRule.exceptions_list[0].id,
              namespace_type: 'agnostic',
            },
            expected: SPACE_AGNOSTIC_EXCEPTION_LIST,
          });
          await assertExceptionListItems({
            query: {
              item_id: 'test_item_id',
              namespace_type: 'agnostic',
            },
            expected: SPACE_AGNOSTIC_EXCEPTION_LIST_ITEM,
          });
        });

        it('imports a rule with exception having comments', async () => {
          const CUSTOM_QUERY_RULE_WITH_EXCEPTION = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            exceptions_list: [
              {
                id: 'abc',
                list_id: 'i_exist',
                type: 'detection',
                namespace_type: 'single',
              },
            ],
          });
          const EXCEPTION_LIST = {
            ...getImportExceptionsListSchemaMock('i_exist'),
            id: 'abc',
            type: 'detection',
            namespace_type: 'single',
          };
          const EXCEPTION_LIST_ITEM = {
            comments: [
              {
                comment: 'This is an exception to the rule',
                created_at: '2022-02-04T02:27:40.938Z',
                created_by: 'elastic',
                id: '845fc456-91ff-4530-bcc1-5b7ebd2f75b5',
              },
              {
                comment: 'I decided to add a new comment',
              },
            ],
            description: 'some description',
            entries: [
              {
                entries: [
                  {
                    field: 'nested.field',
                    operator: 'included',
                    type: 'match',
                    value: 'some value',
                  },
                ],
                field: 'some.parentField',
                type: 'nested',
              },
              {
                field: 'some.not.nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            item_id: 'item_id_1',
            list_id: 'i_exist',
            name: 'Query with a rule id',
            type: 'simple',
          };

          const IMPORT_PAYLOAD = [
            CUSTOM_QUERY_RULE_WITH_EXCEPTION,
            EXCEPTION_LIST,
            EXCEPTION_LIST_ITEM,
          ];

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 1,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule.exceptions_list).toEqual([
            {
              ...CUSTOM_QUERY_RULE_WITH_EXCEPTION.exceptions_list?.[0],
              id: expect.any(String),
            },
          ]);

          await assertExceptionList({
            query: {
              id: importedRule.exceptions_list[0].id,
            },
            expected: {
              ...EXCEPTION_LIST,
              id: importedRule.exceptions_list[0].id,
            },
          });
          await assertExceptionListItems({
            query: {
              item_id: 'item_id_1',
            },
            expected: {
              ...EXCEPTION_LIST_ITEM,
              comments: [
                {
                  ...EXCEPTION_LIST_ITEM.comments[0],
                  id: expect.any(String),
                  created_by: expect.any(String),
                  created_at: expect.any(String),
                },
                EXCEPTION_LIST_ITEM.comments[1],
              ],
            },
          });
        });

        it('imports 100 rules with exceptions in bulk', async () => {
          const RULES_TO_IMPORT = range(150).map((i) =>
            getCustomQueryRuleParams({
              rule_id: `imported-rule-${i}`,
              exceptions_list: [
                {
                  id: `${i}`,
                  list_id: `exception-${i}`,
                  type: 'detection',
                  namespace_type: 'single',
                },
              ],
            })
          );
          const EXCEPTION_LISTS = range(150).map((i) => ({
            ...getImportExceptionsListSchemaMock(`exception-${i}`),
            id: `${i}`,
            type: 'detection',
            namespace_type: 'single',
          }));
          const EXCEPTION_LISTS_ITEMS = range(150).map((i) => ({
            description: 'some description',
            entries: [
              {
                field: 'some.not.nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            item_id: `item_id_${i}`,
            list_id: `exception-${i}`,
            name: 'Query with a rule id',
            type: 'simple',
          }));
          const IMPORT_PAYLOAD = [...RULES_TO_IMPORT, ...EXCEPTION_LISTS, ...EXCEPTION_LISTS_ITEMS];

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            success_count: 150,
            rules_count: 150,
            errors: [],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 150,
          });
        });

        it('removes non-existent exception list from the imported rule', async () => {
          const { body: exceptionBody } = await exceptionsApi
            .createExceptionList(
              {
                body: {
                  ...getCreateExceptionListMinimalSchemaMock(),
                  list_id: 'i_exist',
                  namespace_type: 'single',
                  type: 'detection',
                },
              },
              kibanaSpaceId
            )
            .expect(200);

          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
              exceptions_list: [
                {
                  id: exceptionBody.id,
                  list_id: 'i_exist',
                  type: 'detection',
                  namespace_type: 'single',
                },
                {
                  id: 'i_dont_exist',
                  list_id: '123',
                  type: 'detection',
                  namespace_type: 'single',
                },
              ],
            }),
          ];

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          expect(importResponse).toMatchObject({
            success: false,
            success_count: 1,
            rules_count: 1,
            errors: [
              {
                rule_id: RULE_TO_IMPORT_RULE_ID,
                error: {
                  message: `Rule with rule_id: "${RULE_TO_IMPORT_RULE_ID}" references a non existent exception list of list_id: "123". Reference has been removed.`,
                  status_code: 400,
                },
              },
            ],
            exceptions_errors: [],
            exceptions_success: true,
            exceptions_success_count: 0,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            kibanaSpaceId
          );

          expect(importedRule).toMatchObject({
            exceptions_list: [
              {
                id: exceptionBody.id,
                list_id: 'i_exist',
                namespace_type: 'single',
                type: 'detection',
              },
            ],
          });
        });
      });

      describe('exceptions not related to rules', () => {
        it('imports an exception list with list items', async () => {
          // Custom rules import endpoint expects as minimum one rule in the import payload.
          // Though provided rule doesn't have to reference the exception list.
          const CUSTOM_QUERY_RULE = getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID });
          const EXCEPTION_LIST = getImportExceptionsListSchemaMock('test_list_id');
          const EXCEPTION_LIST_ITEM = getImportExceptionsListItemNewerVersionSchemaMock(
            'test_item_id',
            'test_list_id'
          );
          const IMPORT_PAYLOAD = [CUSTOM_QUERY_RULE, EXCEPTION_LIST, EXCEPTION_LIST_ITEM];

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            exceptions_success: true,
            exceptions_success_count: 1,
          });

          await assertExceptionList({
            query: {
              list_id: 'test_list_id',
            },
            expected: EXCEPTION_LIST,
          });
          await assertExceptionListItems({
            query: {
              item_id: 'test_item_id',
            },
            expected: EXCEPTION_LIST_ITEM,
          });
        });

        /*
          Following the release of version 8.7, this test can be considered as an evaluation of exporting
          an outdated List Item. A notable distinction lies in the absence of the "expire_time" property
          within the getImportExceptionsListItemSchemaMock, which allows for differentiation between older
          and newer versions. The rationale behind this approach is the lack of version tracking for both List and Rule,
          thereby enabling simulation of migration scenarios.
        */
        it('imports an outdated exception list with list items', async () => {
          // Custom rules import endpoint expects as minimum one rule in the import payload.
          // Though provided rule doesn't have to reference the exception list.
          const CUSTOM_QUERY_RULE = getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID });
          const EXCEPTION_LIST = getImportExceptionsListSchemaMock('test_list_id');
          const EXCEPTION_LIST_ITEM = getImportExceptionsListItemSchemaMock(
            'test_item_id',
            'test_list_id'
          );
          const IMPORT_PAYLOAD = [CUSTOM_QUERY_RULE, EXCEPTION_LIST, EXCEPTION_LIST_ITEM];

          // import old exception version
          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId: kibanaSpaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            exceptions_success: true,
            exceptions_success_count: 1,
          });

          await assertExceptionList({
            query: {
              list_id: 'test_list_id',
            },
            expected: EXCEPTION_LIST,
          });
          await assertExceptionListItems({
            query: {
              item_id: 'test_item_id',
            },
            expected: EXCEPTION_LIST_ITEM,
          });
        });
      });
    };

    describe('importing in default space', () => {
      testImportingInSpace();
    });

    describe('importing in non-default space', () => {
      testImportingInSpace(spaceId);

      describe('rules with action connectors (edge cases)', () => {
        it('overwrites a rule with connector after importing to the default space', async () => {
          const CONNECTOR_ID = uuid();
          const SLACK_CONNECTOR = {
            id: CONNECTOR_ID,
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.slack',
              name: 'slack',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          };
          const RULE_WITH_ACTION = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            actions: [
              {
                group: 'default',
                id: CONNECTOR_ID,
                params: {
                  message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                action_type_id: '.slack',
              },
            ],
          });
          const IMPORT_PAYLOAD = [RULE_WITH_ACTION, SLACK_CONNECTOR];

          await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
          });

          await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId,
          });

          const overwriteImportResponseBody = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: true,
            spaceId,
          });

          expect(overwriteImportResponseBody).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            action_connectors_success: true,
            action_connectors_success_count: 1,
            action_connectors_warnings: [],
            action_connectors_errors: [],
          });
        });

        it('imports a rule with connector when connector includes an originId', async () => {
          const CONNECTOR_ID = uuid();
          const SLACK_CONNECTOR = {
            id: CONNECTOR_ID,
            originId: 'some-origin-id',
            type: 'action',
            updated_at: '2023-01-25T14:35:52.852Z',
            created_at: '2023-01-25T14:35:52.852Z',
            version: 'WzUxNTksMV0=',
            attributes: {
              actionTypeId: '.slack',
              name: 'slack',
              isMissingSecrets: false,
              config: {},
              secrets: {},
            },
            references: [],
            migrationVersion: { action: '8.3.0' },
            coreMigrationVersion: '8.7.0',
          };
          const RULE_WITH_ACTION = getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            actions: [
              {
                group: 'default',
                id: CONNECTOR_ID,
                params: {
                  message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                action_type_id: '.slack',
              },
            ],
          });
          const IMPORT_PAYLOAD = [RULE_WITH_ACTION, SLACK_CONNECTOR];

          await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
          });

          const importResponse = await importRules({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId,
          });

          expect(importResponse).toMatchObject({
            success: true,
            success_count: 1,
            rules_count: 1,
            errors: [],
            action_connectors_success: true,
            action_connectors_success_count: 1,
            action_connectors_warnings: [],
            action_connectors_errors: [],
          });
        });
      });
    });

    describe('error handling', () => {
      it('reports a conflict if there is an attempt to import two rules with the same rule_id', async () => {
        const IMPORT_PAYLOAD = [
          getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID }),
          getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID }),
        ];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          errors: [
            {
              error: {
                message: `More than one rule with rule-id: "${RULE_TO_IMPORT_RULE_ID}" found`,
                status_code: 400,
              },
              rule_id: RULE_TO_IMPORT_RULE_ID,
            },
          ],
          success: false,
          success_count: 1,
          rules_count: 2,
        });
      });

      it('reports a conflict if there is an attempt to import a rule with a rule_id that already exists', async () => {
        const existingRule = getCustomQueryRuleParams({ rule_id: RULE_TO_IMPORT_RULE_ID });

        await createRule(supertest, log, existingRule);

        const IMPORT_PAYLOAD = [existingRule];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          errors: [
            {
              error: {
                message: 'Rule with this rule_id already exists',
                status_code: 409,
              },
              rule_id: RULE_TO_IMPORT_RULE_ID,
            },
          ],
          success: false,
          success_count: 0,
          rules_count: 1,
        });
      });

      it('reports a conflict if there is an attempt to import a rule with a rule_id that already exists, but still have some successes with other rules', async () => {
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'existing-rule',
          })
        );

        const IMPORT_PAYLOAD = [
          getCustomQueryRuleParams({
            rule_id: 'existing-rule',
          }),
          getCustomQueryRuleParams({
            rule_id: 'non-existing-rule-1',
          }),
          getCustomQueryRuleParams({
            rule_id: 'non-existing-rule-2',
          }),
        ];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          errors: [
            {
              error: {
                message: 'Rule with this rule_id already exists',
                status_code: 409,
              },
              rule_id: 'existing-rule',
            },
          ],
          success: false,
          success_count: 2,
          rules_count: 3,
        });
      });

      it('reports a mix of conflicts and a mix of successes', async () => {
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'existing-rule-1',
          })
        );
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'existing-rule-2',
          })
        );

        const IMPORT_PAYLOAD = [
          getCustomQueryRuleParams({
            rule_id: 'existing-rule-1',
          }),
          getCustomQueryRuleParams({
            rule_id: 'existing-rule-2',
          }),
          getCustomQueryRuleParams({
            rule_id: 'non-existing-rule',
          }),
        ];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          errors: [
            {
              error: {
                message: 'Rule with this rule_id already exists',
                status_code: 409,
              },
              rule_id: 'existing-rule-1',
            },
            {
              error: {
                message: 'Rule with this rule_id already exists',
                status_code: 409,
              },
              rule_id: 'existing-rule-2',
            },
          ],
          success: false,
          success_count: 1,
          rules_count: 3,
        });
      });

      it('reads back a mixed import of different rules even if some cause conflicts', async () => {
        const existingRule1 = getCustomQueryRuleParams({
          rule_id: 'existing-rule-1',
        });
        const existingRule2 = getCustomQueryRuleParams({
          rule_id: 'existing-rule-2',
        });
        const ruleToImportSuccessfully = getCustomQueryRuleParams({
          rule_id: 'non-existing-rule',
        });

        await createRule(supertest, log, existingRule1);
        await createRule(supertest, log, existingRule2);

        const IMPORT_PAYLOAD = [existingRule1, existingRule2, ruleToImportSuccessfully];

        await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        const rule1 = await fetchRule(supertest, { ruleId: 'existing-rule-1' });
        const rule2 = await fetchRule(supertest, { ruleId: 'existing-rule-2' });
        const rule3 = await fetchRule(supertest, { ruleId: 'non-existing-rule' });

        expect(rule1).toMatchObject(existingRule1);
        expect(rule2).toMatchObject(existingRule2);
        expect(rule3).toMatchObject(ruleToImportSuccessfully);
      });

      it('reports a missing connector', async () => {
        const IMPORT_PAYLOAD = [
          getCustomQueryRuleParams({
            rule_id: RULE_TO_IMPORT_RULE_ID,
            actions: [
              {
                group: 'default',
                id: '123',
                action_type_id: '456',
                params: {},
              },
            ],
          }),
        ];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          success: false,
          success_count: 0,
          rules_count: 1,
          errors: [
            {
              rule_id: RULE_TO_IMPORT_RULE_ID,
              error: {
                status_code: 404,
                message: 'Rule actions reference the following missing action IDs: 123',
              },
            },
          ],
          action_connectors_success: true,
          action_connectors_success_count: 0,
          action_connectors_warnings: [],
          action_connectors_errors: [],
        });
      });

      it('warns about a missing connector secret', async () => {
        const WEBHOOK_CONNECTOR_ID = uuid();
        const WEBHOOK_CONNECTOR = {
          id: WEBHOOK_CONNECTOR_ID,
          type: 'action',
          updated_at: '2023-01-25T14:35:52.852Z',
          created_at: '2023-01-25T14:35:52.852Z',
          version: 'WzUxNTksMV0=',
          attributes: {
            actionTypeId: '.webhook',
            name: 'webhook',
            isMissingSecrets: true,
            config: {},
            secrets: {},
          },
          references: [],
          migrationVersion: { action: '8.3.0' },
          coreMigrationVersion: '8.7.0',
        };
        const CUSTOM_QUERY_RULE = getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID,
          actions: [
            {
              group: 'default',
              id: WEBHOOK_CONNECTOR_ID,
              action_type_id: '.webhook',
              params: {},
            },
          ],
        });

        const IMPORT_PAYLOAD = [CUSTOM_QUERY_RULE, WEBHOOK_CONNECTOR];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
          action_connectors_success: true,
          action_connectors_success_count: 1,
          action_connectors_warnings: [
            {
              actionPath: '/app/management/insightsAndAlerting/triggersActionsConnectors',
              buttonLabel: 'Go to connectors',
              message: '1 connector has sensitive information that require updates.',
              type: 'action_required',
            },
          ],
          action_connectors_errors: [],
        });
      });

      it('imports a mix of rules with actions and connectors while some connectors are missing', async () => {
        const WEBHOOK_CONNECTOR_ID = uuid();
        const WEBHOOK_CONNECTOR = {
          id: WEBHOOK_CONNECTOR_ID,
          type: 'action',
          updated_at: '2023-01-25T14:35:52.852Z',
          created_at: '2023-01-25T14:35:52.852Z',
          version: 'WzUxNTksMV0=',
          attributes: {
            actionTypeId: '.webhook',
            name: 'webhook',
            isMissingSecrets: false,
            config: {},
            secrets: {},
          },
          references: [],
          migrationVersion: { action: '8.3.0' },
          coreMigrationVersion: '8.7.0',
        };
        const CUSTOM_QUERY_RULE_WITH_WEBHOOK_CONNECTOR = getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID,
          actions: [
            {
              group: 'default',
              id: WEBHOOK_CONNECTOR_ID,
              action_type_id: '.webhook',
              params: {},
            },
          ],
        });
        const NON_EXISTING_CONNECTOR = uuid();
        const CUSTOM_QUERY_RULE_2 = getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID_2,
          actions: [
            {
              group: 'default',
              id: NON_EXISTING_CONNECTOR, // <-- This does not exist
              action_type_id: '.index',
              params: {},
            },
          ],
        });

        const IMPORT_PAYLOAD = [
          CUSTOM_QUERY_RULE_WITH_WEBHOOK_CONNECTOR,
          CUSTOM_QUERY_RULE_2,
          WEBHOOK_CONNECTOR,
        ];

        const importResponse = await importRules({
          getService,
          rules: IMPORT_PAYLOAD,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          success: false,
          success_count: 1,
          rules_count: 2,
          errors: [
            {
              rule_id: RULE_TO_IMPORT_RULE_ID_2,
              error: {
                status_code: 404,
                message: `Rule actions reference the following missing action IDs: ${NON_EXISTING_CONNECTOR}`,
              },
            },
          ],
          action_connectors_success: true,
          action_connectors_success_count: 1,
          action_connectors_errors: [],
          action_connectors_warnings: [],
        });
      });
    });

    describe('importing with endpoint response actions', () => {
      let superTestResponseActionsNoAuthz: TestAgent;
      let rulesToImport: unknown[];

      before(async () => {
        superTestResponseActionsNoAuthz = await utils.createSuperTestWithCustomRole({
          name: ROLE.endpoint_response_actions_no_access,
          privileges: rolesUsersProvider.loader.getPreDefinedRole(
            ROLE.endpoint_response_actions_no_access
          ),
        });
      });

      beforeEach(async () => {
        rulesToImport = [
          getCustomQueryRuleParams({
            rule_id: uuid(),
            response_actions: [
              {
                action_type_id: '.endpoint',
                params: {
                  command: 'suspend-process',
                  config: { field: 'some-field', overwrite: false },
                },
              },
            ],
          }),
        ];
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('should import rules with response actions when user has authz', async () => {
        const importResponse = await importRules({
          getService,
          rules: rulesToImport,
          overwrite: false,
        });

        expect(importResponse).toMatchObject({
          success: true,
          success_count: 1,
          rules_count: 1,
          errors: [],
        });
      });

      it('should NOT import rules with response actions when user does NOT have authz', async () => {
        // @ts-expect-error due to array of `unknown` items
        const ruleId = rulesToImport[0].rule_id;
        const fileBuffer = Buffer.from(combineArrayToNdJson(rulesToImport));

        const { body } = await superTestResponseActionsNoAuthz
          .post('/api/detection_engine/rules/_import')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .on('error', createSupertestErrorLogger(log).ignoreCodes([403]))
          .attach('file', fileBuffer, { filename: 'rules.ndjson' })
          .expect(200);

        expect(body).toMatchObject({
          success: false,
          success_count: 0,
          errors: [
            {
              error: {
                message: 'User is not authorized to create/update suspend-process response action',
                status_code: 403,
              },
              id: '',
              rule_id: ruleId,
            },
          ],
        });
      });
    });

    describe('forward compatibility', () => {
      it('removes any extra rule fields when importing', async () => {
        const rule = getCustomQueryRuleParams({
          rule_id: RULE_TO_IMPORT_RULE_ID,
          extraField: true,
          risk_score_mapping: [
            {
              field: 'host.name',
              value: 'host.name',
              operator: 'equals',
              risk_score: 50,
              // @ts-expect-error
              extraField: true,
            },
          ],
          severity_mapping: [
            {
              field: 'host.name',
              value: 'host.name',
              operator: 'equals',
              severity: 'low',
              // @ts-expect-error
              extraField: true,
            },
          ],
          threat: [
            {
              framework: 'MITRE ATT&CK',
              extraField: true,
              tactic: {
                id: 'TA0001',
                name: 'Initial Access',
                reference: 'https://attack.mitre.org/tactics/TA0001',
                // @ts-expect-error
                extraField: true,
              },
              technique: [],
            },
          ],
          investigation_fields: {
            field_names: ['host.name'],
            // @ts-expect-error
            extraField: true,
          },
        });

        await importRulesWithSuccess({
          getService,
          rules: [rule],
          overwrite: false,
        });

        const importedRule = await fetchRule(supertest, { ruleId: RULE_TO_IMPORT_RULE_ID });

        expect(Object.hasOwn(importedRule, 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.risk_score_mapping[0], 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.severity_mapping[0], 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.threat[0], 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.threat[0].tactic, 'extraField')).toBeFalsy();
        expect(Object.hasOwn(importedRule.investigation_fields!, 'extraField')).toBeFalsy();
      });
    });

    describe('backward compatibility', () => {
      describe('importing in default space', () => {
        it('migrates rule level throttle', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
              throttle: '1d',
              actions: [
                {
                  group: 'default',
                  id: PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID,
                  params: {
                    message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  action_type_id: '.email',
                },
              ],
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
          });

          const { body: importedRule } = await detectionsApi.readRule({
            query: { rule_id: RULE_TO_IMPORT_RULE_ID },
          });

          expect(importedRule.throttle).toBeUndefined();
          expect(importedRule.actions[0]).toMatchObject({
            frequency: { summary: true, notifyWhen: 'onThrottleInterval', throttle: '1d' },
          });
        });
      });

      describe('importing in non-default space', () => {
        it('imports a rule from Kibana v7.14 to the non-default space', async () => {
          const IMPORT_PAYLOAD = [
            getCustomQueryRuleParams({
              rule_id: RULE_TO_IMPORT_RULE_ID,
              throttle: '1d',
              actions: [
                {
                  group: 'default',
                  id: PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID,
                  params: {
                    message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  action_type_id: '.email',
                },
              ],
            }),
          ];

          await importRulesWithSuccess({
            getService,
            rules: IMPORT_PAYLOAD,
            overwrite: false,
            spaceId,
          });

          const { body: importedRule } = await detectionsApi.readRule(
            {
              query: { rule_id: RULE_TO_IMPORT_RULE_ID },
            },
            spaceId
          );

          expect(importedRule.throttle).toBeUndefined();
          expect(importedRule.actions[0]).toMatchObject({
            frequency: { summary: true, notifyWhen: 'onThrottleInterval', throttle: '1d' },
          });
        });
      });
    });
  });
};
