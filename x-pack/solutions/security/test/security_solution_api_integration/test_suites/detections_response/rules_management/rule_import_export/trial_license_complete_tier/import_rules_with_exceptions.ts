/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { range } from 'lodash';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import {
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaMock,
  getImportExceptionsListItemNewerVersionSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import type {
  ReadExceptionListItemRequestQueryInput,
  ReadExceptionListRequestQueryInput,
} from '@kbn/securitysolution-exceptions-common/api';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import { getCustomQueryRuleParams, importRules } from '../../../utils';
import { deleteAllExceptions } from '../../../../lists_and_exception_lists/utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

const RULE_TO_IMPORT_RULE_ID = 'imported-rule';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const exceptionsApi = getService('exceptionsApi');
  const log = getService('log');
  const spacesServices = getService('spaces');

  describe('@ess @serverless @skipInServerlessMKI import rules with exceptions', () => {
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

    const testImportingInSpace = (kibanaSpaceId?: string) => {
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
    });
  });
};
