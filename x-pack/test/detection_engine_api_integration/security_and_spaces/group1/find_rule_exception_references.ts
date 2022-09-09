/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  CreateExceptionListSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  getSimpleRule,
  createSignalsIndex,
  deleteSignalsIndex,
  deleteAllAlerts,
  createExceptionList,
} from '../../utils';
import { deleteAllExceptions } from '../../../lists_api_integration/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('find_rule_exception_references', () => {
    before(async () => {
      await createSignalsIndex(supertest, log);
    });

    after(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    it('returns empty array per list_id if no references are found', async () => {
      // create exception list
      const newExceptionList: CreateExceptionListSchema = {
        ...getCreateExceptionListMinimalSchemaMock(),
        list_id: 'i_exist',
        namespace_type: 'single',
        type: ExceptionListTypeEnum.DETECTION,
      };
      const exceptionList = await createExceptionList(supertest, log, newExceptionList);

      // create rule
      await createRule(supertest, log, getSimpleRule('rule-1'));

      const { body: references } = await supertest
        .get(DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL)
        .set('kbn-xsrf', 'true')
        .query({
          ids: `${exceptionList.id}`,
          list_ids: `${exceptionList.list_id}`,
          namespace_types: `${exceptionList.namespace_type}`,
        })
        .expect(200);

      expect(references).to.eql({ references: [{ i_exist: [] }] });
    });

    it('returns empty array per list_id if  list does not exist', async () => {
      // create rule
      await createRule(supertest, log, getSimpleRule('rule-1'));

      const { body: references } = await supertest
        .get(DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL)
        .set('kbn-xsrf', 'true')
        .query({
          ids: `1234`,
          list_ids: `i_dont_exist`,
          namespace_types: `single`,
        })
        .expect(200);

      expect(references).to.eql({ references: [{ i_dont_exist: [] }] });
    });

    it('returns found references', async () => {
      // create exception list
      const newExceptionList: CreateExceptionListSchema = {
        ...getCreateExceptionListMinimalSchemaMock(),
        list_id: 'i_exist',
        namespace_type: 'single',
        type: ExceptionListTypeEnum.DETECTION,
      };
      const exceptionList = await createExceptionList(supertest, log, newExceptionList);
      const exceptionList2 = await createExceptionList(supertest, log, {
        ...newExceptionList,
        list_id: 'i_exist_2',
      });

      // create rule
      const rule = await createRule(supertest, log, {
        ...getSimpleRule('rule-2'),
        exceptions_list: [
          {
            id: `${exceptionList.id}`,
            list_id: `${exceptionList.list_id}`,
            namespace_type: `${exceptionList.namespace_type}`,
            type: `${exceptionList.type}`,
          },
          {
            id: `${exceptionList2.id}`,
            list_id: `${exceptionList2.list_id}`,
            namespace_type: `${exceptionList2.namespace_type}`,
            type: `${exceptionList2.type}`,
          },
        ],
      });

      const { body: references } = await supertest
        .get(DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL)
        .set('kbn-xsrf', 'true')
        .query({
          ids: `${exceptionList.id},${exceptionList2.id}`,
          list_ids: `${exceptionList.list_id},${exceptionList2.list_id}`,
          namespace_types: `${exceptionList.namespace_type},${exceptionList2.namespace_type}`,
        })
        .expect(200);

      expect(references).to.eql({
        references: [
          {
            i_exist: [
              {
                exception_lists: [
                  {
                    id: references.references[0].i_exist[0].exception_lists[0].id,
                    list_id: 'i_exist',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                  {
                    id: references.references[0].i_exist[0].exception_lists[1].id,
                    list_id: 'i_exist_2',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
                id: rule.id,
                name: 'Simple Rule Query',
                rule_id: 'rule-2',
              },
            ],
          },
          {
            i_exist_2: [
              {
                exception_lists: [
                  {
                    id: references.references[1].i_exist_2[0].exception_lists[0].id,
                    list_id: 'i_exist',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                  {
                    id: references.references[1].i_exist_2[0].exception_lists[1].id,
                    list_id: 'i_exist_2',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
                id: rule.id,
                name: 'Simple Rule Query',
                rule_id: 'rule-2',
              },
            ],
          },
        ],
      });
    });
  });
};
