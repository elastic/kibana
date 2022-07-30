/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { CreateRuleExceptionListItemSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request/create_rule_exception_schema';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  getRule,
  createRule,
  getSimpleRule,
  createSignalsIndex,
  deleteSignalsIndex,
  deleteAllAlerts,
  removeExceptionsServerGeneratedProperties,
} from '../../utils';
import { deleteAllExceptions } from '../../../lists_api_integration/utils';

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

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe.only('create_rule_exception_route', () => {
    before(async () => {
      await createSignalsIndex(supertest, log);
    });

    after(async () => {
      await deleteAllExceptions(supertest, log);
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    it('creates and associates a `rule_default` exception list to a rule if one not already found', async () => {
      const rule = await createRule(supertest, log, getSimpleRule('rule-2'));

      await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/${rule.id}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({
          items: [getRuleExceptionItemMock()],
        })
        .expect(200);

      const udpatedRule = await getRule(supertest, log, rule.rule_id);
      const defaultList = udpatedRule.exceptions_list.find((list) => list.type === 'rule_default');

      const { body: foundItem } = await supertest
        .get(`${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${defaultList?.list_id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      foundItem.data = [removeExceptionsServerGeneratedProperties(foundItem.data[0])];
      expect(foundItem).to.eql({
        data: [
          {
            comments: [],
            created_by: 'elastic',
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
            namespace_type: 'single',
            os_types: [],
            tags: [],
            type: 'simple',
            updated_by: 'elastic',
          },
        ],
        page: 1,
        per_page: 20,
        total: 1,
      });
      expect(udpatedRule.exceptions_list.some((list) => list.type === 'rule_default')).to.eql(true);
    });

    it('adds exception items to rule default exception list', async () => {
      // create default exception list
      const exceptionList = {
        ...getCreateExceptionListMinimalSchemaMock(),
        list_id: 'i_exist',
        namespace_type: 'single',
        type: ExceptionListTypeEnum.RULE_DEFAULT,
      };

      const { body: defaultList } = await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(exceptionList)
        .expect(200);
      console.log({ defaultList });
      // add default exception list to rule
      const rule = await createRule(supertest, log, {
        ...getSimpleRule('rule-4'),
        exceptions_list: [
          {
            id: defaultList?.id,
            list_id: defaultList?.list_id,
            namespace_type: defaultList?.namespace_type,
            type: ExceptionListTypeEnum.RULE_DEFAULT,
          },
        ],
      });

      expect(rule.exceptions_list.some((list) => list.type === 'rule_default')).to.eql(true);

      await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/${rule.id}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({
          items: [getRuleExceptionItemMock()],
        })
        .expect(200);

      const { body: foundItem } = await supertest
        .get(`${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${defaultList?.list_id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      foundItem.data = [removeExceptionsServerGeneratedProperties(foundItem.data[0])];
      expect(foundItem).to.eql({
        data: [
          {
            comments: [],
            created_by: 'elastic',
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
            namespace_type: 'single',
            os_types: [],
            tags: [],
            type: 'simple',
            updated_by: 'elastic',
          },
        ],
        page: 1,
        per_page: 20,
        total: 1,
      });
    });

    it('returns 500 if no rule is found to add exception list to', async () => {
      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/123456/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({
          items: [getRuleExceptionItemMock()],
        })
        .expect(500);

      expect(body).to.eql({
        message: 'Unable to add exception list to rule - rule with id:"123456" not found',
        status_code: 500,
      });
    });
  });
};
