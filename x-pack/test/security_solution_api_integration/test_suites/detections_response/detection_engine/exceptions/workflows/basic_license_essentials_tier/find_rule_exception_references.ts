/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';

import {
  CreateExceptionListSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import {
  DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL,
  RuleReferencesSchema,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_exceptions';

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

import { getSimpleRule, createExceptionList } from '../../../../utils';
import {
  createRule,
  deleteAllRules,
  deleteAllAlerts,
  createAlertsIndex,
} from '../../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@serverless @ess find_rule_exception_references', () => {
    before(async () => {
      await createAlertsIndex(supertest, log);
    });

    after(async () => {
      await deleteAllAlerts(supertest, log, es);
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
      await deleteAllRules(supertest, log);
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
        .set('elastic-api-version', '1')
        .set('X-Elastic-Internal-Origin', 'Kibana')
        .query({
          ids: `${exceptionList.id}`,
          list_ids: `${exceptionList.list_id}`,
          namespace_types: `${exceptionList.namespace_type}`,
        })
        .expect(200);

      const {
        _version,
        id,
        created_at,
        created_by,
        tie_breaker_id,
        updated_at,
        updated_by,
        ...referencesWithoutServerValues
      } = references.references[0].i_exist;

      expect({
        references: [
          {
            i_exist: {
              ...referencesWithoutServerValues,
            },
          },
        ],
      }).to.eql({
        references: [
          {
            i_exist: {
              description: 'some description',
              immutable: false,
              list_id: 'i_exist',
              name: 'some name',
              namespace_type: 'single',
              os_types: [],
              tags: [],
              type: 'detection',
              version: 1,
              referenced_rules: [],
            },
          },
        ],
      });
    });

    it('returns empty array per list_id if list does not exist', async () => {
      // create rule
      await createRule(supertest, log, getSimpleRule('rule-1'));

      const { body: references } = await supertest
        .get(DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .set('X-Elastic-Internal-Origin', 'Kibana')
        .query({
          ids: `1234`,
          list_ids: `i_dont_exist`,
          namespace_types: `single`,
        })
        .expect(200);

      expect(references).to.eql({ references: [] });
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
      await createRule(supertest, log, {
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
        .set('elastic-api-version', '1')
        .set('X-Elastic-Internal-Origin', 'Kibana')
        .query({
          ids: `${exceptionList.id},${exceptionList2.id}`,
          list_ids: `${exceptionList.list_id},${exceptionList2.list_id}`,
          namespace_types: `${exceptionList.namespace_type},${exceptionList2.namespace_type}`,
        })
        .expect(200);

      const refs = references.references.flatMap((ref: RuleReferencesSchema) => Object.keys(ref));

      expect(refs.sort()).to.eql(['i_exist', 'i_exist_2'].sort());
    });

    it('returns found references for all existing exception lists if no list id/list_id passed in', async () => {
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
      await createRule(supertest, log, {
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
        .set('elastic-api-version', '1')
        .set('X-Elastic-Internal-Origin', 'Kibana')
        .query({
          namespace_types: 'single,agnostic',
        })
        .expect(200);

      const refs = references.references.flatMap((ref: RuleReferencesSchema) => Object.keys(ref));
      expect(refs.sort()).to.eql(['i_exist', 'i_exist_2', 'endpoint_list'].sort());
    });
  });
};
