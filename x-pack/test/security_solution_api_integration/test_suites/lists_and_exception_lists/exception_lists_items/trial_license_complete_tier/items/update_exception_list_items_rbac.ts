/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { getUpdateMinimalExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_exception_list_item_schema.mock';

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

  describe('@ess @serverless @serverlessQA update exception list items - RBAC', () => {
    beforeEach(async () => {
      // create a simple exception list
      await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListMinimalSchemaMock())
        .expect(200);

      // create a simple exception list item
      await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListItemMinimalSchemaMock())
        .expect(200);
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    after(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('read only users', () => {
      before(async () => {
        t1Analyst = await utils.createSuperTest('t1_analyst');
        t2Analyst = await utils.createSuperTest('t2_analyst');
        eoa = await utils.createSuperTest('endpoint_operations_analyst');
      });

      it('should return 403 for t1_analyst', async () => {
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await t1Analyst
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(403);
      });

      it('should return 403 for t2_analyst', async () => {
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await t2Analyst
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(403);
      });

      // TODO: Should be failing but is passing
      it.skip('should return 403 for endpoint operations analyst', async () => {
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await eoa
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(403);
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
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await threatIntelAnalyst
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(200);
      });

      it('should return 200 for t3_analyst', async () => {
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await t3Analyst
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(200);
      });

      it('should return 200 for rule_author', async () => {
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await ruleAuthor
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(200);
      });

      it('should return 200 for soc_manager', async () => {
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await socManager
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(200);
      });

      it('should return 200 for endpoint_policy_manager', async () => {
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await endpointPolicyManager
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(200);
      });

      it('should return 200 for editor', async () => {
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await editor
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(200);
      });
    });
  });
};
