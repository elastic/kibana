/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import TestAgent from 'supertest/lib/agent';
import { deleteAllExceptions } from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  let t1Analyst: TestAgent;
  let t2Analyst: TestAgent;
  let eoa: TestAgent;
  let threatIntelAnalyst: TestAgent;
  let t3Analyst: TestAgent;
  let ruleAuthor: TestAgent;
  let socManager: TestAgent;
  let endpointPolicyManager: TestAgent;
  let editor: TestAgent;
  let item: ExceptionListItemSchema;

  describe('@ess @serverless @serverlessQA read exception list items API - RBAC', () => {
    beforeEach(async () => {
      // create a simple exception list to read
      await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListMinimalSchemaMock())
        .expect(200);

      // create a simple exception list item to read
      const { body: itemBody } = await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListItemMinimalSchemaMock())
        .expect(200);

      item = itemBody;
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('read only users', () => {
      before(async () => {
        t1Analyst = await utils.createSuperTest('t1_analyst');
        t2Analyst = await utils.createSuperTest('t2_analyst');
        eoa = await utils.createSuperTest('endpoint_operations_analyst');
      });

      it('should return 200 for t1_analyst', async () => {
        await t1Analyst
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${item.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should return 200 for t2_analyst', async () => {
        await t2Analyst
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${item.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should return 200 for endpoint operations analyst', async () => {
        await eoa
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${item.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('read/write users', () => {
      before(async () => {
        threatIntelAnalyst = await utils.createSuperTest('threat_intelligence_analyst');
        t3Analyst = await utils.createSuperTest('t3_analyst');
        ruleAuthor = await utils.createSuperTest('rule_author');
        socManager = await utils.createSuperTest('soc_manager');
        endpointPolicyManager = await utils.createSuperTest('endpoint_policy_manager');
        editor = await utils.createSuperTest('editor');
      });

      it('should return 200 for threat_intelligence_analyst', async () => {
        await threatIntelAnalyst
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${item.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should return 200 for t3_analyst', async () => {
        await t3Analyst
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${item.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should return 200 for rule_author', async () => {
        await ruleAuthor
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${item.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should return 200 for soc_manager', async () => {
        await socManager
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${item.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should return 200 for endpoint_policy_manager', async () => {
        await endpointPolicyManager
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${item.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should return 200 for editor', async () => {
        await editor
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${item.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });
  });
};
