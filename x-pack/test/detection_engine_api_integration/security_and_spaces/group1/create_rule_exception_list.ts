/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getCreateExceptionListDetectionSchemaMock, getCreateExceptionListMinimalSchemaMock, getCreateExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ENDPOINT_LIST_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  getSimpleRule,
  createSignalsIndex,
  deleteSignalsIndex,
  deleteAllAlerts,
} from '../../utils';
import { deleteAllExceptions } from '../../../lists_api_integration/utils';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe.only('create_rule_exception_list_route', () => {
    before(async () => {
      await createSignalsIndex(supertest, log);
    });

    after(async () => {
      await deleteAllExceptions(supertest, log);
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    it('creates and associates a `detection` exception list to a rule', async () => {
      const rule = await createRule(supertest, log, getSimpleRule('rule-1'));

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({ 
          rule_so_id: rule.id,
          rule_id: rule.rule_id,
          list: getCreateExceptionListDetectionSchemaMock(),
         })
        .expect(200);
      const { _version, created_at, id, updated_at, tie_breaker_id, ...restOfBody } = body;

      expect(restOfBody).to.eql({ 
        created_by: 'elastic',
        description: 'some description',
        immutable: false,
        list_id: 'some-list-id',
        name: 'some name',
        namespace_type: 'single',
        os_types: [],
        tags: [],
        type: 'detection',
        updated_by: 'elastic',
        version: 1 
      });
    });

    it('creates and associates a `rule_default` exception list to a rule', async () => {
      const rule = await createRule(supertest, log, getSimpleRule('rule-2'));

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({ 
          rule_so_id: rule.id,
          rule_id: rule.rule_id,
          list: {
            ...getCreateExceptionListDetectionSchemaMock(),
            list_id: 'my-default-rule-list',
            namespace_type: 'single',
            type: ExceptionListTypeEnum.RULE_DEFAULT,
          },
         })
        .expect(200);
      const { _version, created_at, id, updated_at, tie_breaker_id, ...restOfBody } = body;

      expect(restOfBody).to.eql({ 
        created_by: 'elastic',
        description: 'some description',
        immutable: false,
        list_id: 'my-default-rule-list',
        name: 'some name',
        namespace_type: 'single',
        os_types: [],
        tags: [],
        type: 'rule_default',
        updated_by: 'elastic',
        version: 1 
      });
    });

    it('returns 500 if no rule is found to add exception list to', async () => {
      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({ 
          rule_so_id: '1234',
          rule_id: 'rule-1',
          list: getCreateExceptionListDetectionSchemaMock(),
         })
        .expect(500);

      expect(body).to.eql({ message: 'Unable to add exception list to rule - rule rule-1 not found',
      status_code: 500 });
    });

    it('returns 409 if an exception list with matching `list_id` exists', async () => {
      const rule = await createRule(supertest, log, getSimpleRule('rule-3'));
      const exceptionList = {
        ...getCreateExceptionListMinimalSchemaMock(),
        list_id: 'i_exist',
        namespace_type: 'single',
        type: 'detection',
      };

      // create an exception list
      await supertest
      .post(EXCEPTION_LIST_URL)
      .set('kbn-xsrf', 'true')
      .send(exceptionList)
      .expect(200);
      
      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({ 
          rule_so_id: rule.id,
          rule_id: rule.rule_id,
          list: exceptionList,
         })
        .expect(409);

      expect(body).to.eql({ message: 'exception list id: "i_exist" already exists',
      status_code: 409 });
    });

    it('returns 405 if trying to add a default rule exception list to a rule that already has one', async () => {
      const rule = await createRule(supertest, log, { ...getSimpleRule('rule-4'), exceptions_list: [{ id: '1234', list_id: 'list_id', namespace_type: 'single', type: ExceptionListTypeEnum.RULE_DEFAULT }] });
      const exceptionList = {
        ...getCreateExceptionListMinimalSchemaMock(),
        list_id: 'my-list-id',
        namespace_type: 'single',
        type: ExceptionListTypeEnum.RULE_DEFAULT,
      };

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({ 
          rule_so_id: rule.id,
          rule_id: rule.rule_id,
          list: exceptionList,
         })
        .expect(405);

      expect(body).to.eql({ message: 'Rule already contains a default exception list.',
      status_code: 405 });
    });

    it('returns 405 if trying to add an endpoint list when one already exists and is associated with rule', async () => {
      // create endpoint exception list
      const { body: endpointList } = await supertest
        .post(ENDPOINT_LIST_URL)
        .set('kbn-xsrf', 'true')
        .expect(200);
     
      const rule = await createRule(supertest, log, { ...getSimpleRule('rule-5'), exceptions_list: [{ id: endpointList.id, list_id: endpointList.list_id, namespace_type: endpointList.namespace_type, type: ExceptionListTypeEnum.ENDPOINT }] });
      const exceptionList = {
        ...getCreateExceptionListSchemaMock(),
        list_id: endpointList.list_id,
        namespace_type: endpointList.namespace_type,
        type: ExceptionListTypeEnum.ENDPOINT,
      };

      const { body } = await supertest
        .post(`${DETECTION_ENGINE_RULES_URL}/exceptions`)
        .set('kbn-xsrf', 'true')
        .send({ 
          rule_so_id: rule.id,
          rule_id: rule.rule_id,
          list: exceptionList,
         })
        .expect(405);

      expect(body).to.eql({ message: 'Rule already contains a default exception list.',
      status_code: 405 });
    });
  });
};
