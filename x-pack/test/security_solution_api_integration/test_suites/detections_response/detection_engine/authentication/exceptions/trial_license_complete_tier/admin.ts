/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  CreateExceptionListSchema,
  CreateRuleExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { createRule, deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';
import { createExceptionList, getCustomQueryRuleParams } from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

const getRuleExceptionItemMock = (): CreateRuleExceptionListItemSchema => ({
  description: 'Exception item for rule default exception list',
  entries: [
    {
      field: 'some.not.nested.field',
      operator: 'included',
      type: 'match',
      value: 'some value',
    },
  ],
  name: 'Sample exception item',
  type: 'simple',
});

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  let admin: TestAgent;

  describe('@serverless @serverlessQA admin rule exceptions API behaviors', () => {
    before(async () => {
      admin = await utils.createSuperTest('admin');
    });

    beforeEach(async () => {
      await deleteAllExceptions(admin, log);
      await deleteAllRules(admin, log);
    });

    after(async () => {
      await deleteAllExceptions(admin, log);
      await deleteAllRules(admin, log);
    });

    // Expected 200, receiving 401
    describe('add rule_default exception', () => {
      it('should return 200 for admin', async () => {
        const rule = await createRule(admin, log, getCustomQueryRuleParams());
        await admin
          .post(`${DETECTION_ENGINE_RULES_URL}/${rule.id}/exceptions`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            items: [getRuleExceptionItemMock()],
          })
          .expect(200);
      });
    });

    // Unexpected 401
    describe('find rule exception references', () => {
      it('should return 200 for admin', async () => {
        // create exception list
        const newExceptionList: CreateExceptionListSchema = {
          ...getCreateExceptionListMinimalSchemaMock(),
          list_id: 'i_exist',
          namespace_type: 'single',
          type: ExceptionListTypeEnum.DETECTION,
        };
        const exceptionList = await createExceptionList(admin, log, newExceptionList);
        const exceptionList2 = await createExceptionList(admin, log, {
          ...newExceptionList,
          list_id: 'i_exist_2',
        });

        // create rule
        await createRule(admin, log, {
          ...getCustomQueryRuleParams(),
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

        await admin
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
      });
    });
  });
};
