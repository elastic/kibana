/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_schema.mock';
import { DETECTION_ENGINE_RULES_URL } from '../../../../plugins/security_solution/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getSimpleRule,
  getSimpleRuleAsNdjson,
  getSimpleRuleOutput,
  getWebHookAction,
  removeServerGeneratedProperties,
  ruleToNdjson,
} from '../../utils';
import {
  toNdJsonString,
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaMock,
} from '../../../../plugins/lists/common/schemas/request/import_exceptions_schema.mock';
import { deleteAllExceptions } from '../../../lists_api_integration/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('import_rules', () => {
    describe('importing rules with an index', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
      });

      it('should set the response content types to be expected', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      });

      it('should reject with an error if the file type is not that of a ndjson', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.txt')
          .expect(400);

        expect(body).to.eql({
          status_code: 400,
          message: 'Invalid file extension .txt',
        });
      });

      it('should report that it imported a simple rule successfully', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
        });
      });

      it('should be able to read an imported rule back out correctly', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(getSimpleRuleOutput('rule-1', false));
      });

      it('should be able to import two rules', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 2,
        });
      });

      it('should report a conflict if there is an attempt to import two rules with the same rule_id', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
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
        });
      });

      it('should NOT report a conflict if there is an attempt to import two rules with the same rule_id and overwrite is set to true', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
        });
      });

      it('should report a conflict if there is an attempt to import a rule with a rule_id that already exists', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
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
        });
      });

      it('should NOT report a conflict if there is an attempt to import a rule with a rule_id that already exists and overwrite is set to true', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
        });
      });

      it('should overwrite an existing rule if overwrite is set to true', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const simpleRule = getSimpleRule('rule-1');
        simpleRule.name = 'some other name';
        const ndjson = ruleToNdjson(simpleRule);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach('file', ndjson, 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const ruleOutput = getSimpleRuleOutput('rule-1');
        ruleOutput.name = 'some other name';
        ruleOutput.version = 2;
        expect(bodyToCompare).to.eql(ruleOutput);
      });

      it('should report a conflict if there is an attempt to import a rule with a rule_id that already exists, but still have some successes with other rules', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2', 'rule-3']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
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
        });
      });

      it('should report a mix of conflicts and a mix of successes', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2']), 'rules.ndjson')
          .expect(200);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2', 'rule-3']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [
            {
              error: {
                message: 'rule_id: "rule-1" already exists',
                status_code: 409,
              },
              rule_id: 'rule-1',
            },
            {
              error: {
                message: 'rule_id: "rule-2" already exists',
                status_code: 409,
              },
              rule_id: 'rule-2',
            },
          ],
          success: false,
          success_count: 1,
        });
      });

      it('should be able to correctly read back a mixed import of different rules even if some cause conflicts', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2']), 'rules.ndjson')
          .expect(200);

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2', 'rule-3']), 'rules.ndjson')
          .expect(200);

        const { body: bodyOfRule1 } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
          .send()
          .expect(200);

        const { body: bodyOfRule2 } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-2`)
          .send()
          .expect(200);

        const { body: bodyOfRule3 } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-3`)
          .send()
          .expect(200);

        const bodyToCompareOfRule1 = removeServerGeneratedProperties(bodyOfRule1);
        const bodyToCompareOfRule2 = removeServerGeneratedProperties(bodyOfRule2);
        const bodyToCompareOfRule3 = removeServerGeneratedProperties(bodyOfRule3);

        expect([bodyToCompareOfRule1, bodyToCompareOfRule2, bodyToCompareOfRule3]).to.eql([
          getSimpleRuleOutput('rule-1'),
          getSimpleRuleOutput('rule-2'),
          getSimpleRuleOutput('rule-3'),
        ]);
      });

      it('should give single connector error back if we have a single connector error message', async () => {
        const simpleRule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: '123',
              action_type_id: '456',
              params: {},
            },
          ],
        };
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', ruleToNdjson(simpleRule), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          success: false,
          success_count: 0,
          errors: [
            {
              rule_id: 'rule-1',
              error: {
                status_code: 404,
                message: '1 connector is missing. Connector id missing is: 123',
              },
            },
          ],
        });
      });

      it('should be able to import a rule with an action connector that exists', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);
        const simpleRule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: hookAction.id,
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', ruleToNdjson(simpleRule), 'rules.ndjson')
          .expect(200);
        expect(body).to.eql({ success: true, success_count: 1, errors: [] });
      });

      it('should be able to import 2 rules with action connectors that exist', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: hookAction.id,
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };

        const rule2: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-2'),
          actions: [
            {
              group: 'default',
              id: hookAction.id,
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };
        const rule1String = JSON.stringify(rule1);
        const rule2String = JSON.stringify(rule2);
        const buffer = Buffer.from(`${rule1String}\n${rule2String}\n`);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', buffer, 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({ success: true, success_count: 2, errors: [] });
      });

      it('should be able to import 1 rule with an action connector that exists and get 1 other error back for a second rule that does not have the connector', async () => {
        // create a new action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [
            {
              group: 'default',
              id: hookAction.id,
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };

        const rule2: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-2'),
          actions: [
            {
              group: 'default',
              id: '123', // <-- This does not exist
              action_type_id: hookAction.actionTypeId,
              params: {},
            },
          ],
        };
        const rule1String = JSON.stringify(rule1);
        const rule2String = JSON.stringify(rule2);
        const buffer = Buffer.from(`${rule1String}\n${rule2String}\n`);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', buffer, 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          success: false,
          success_count: 1,
          errors: [
            {
              rule_id: 'rule-2',
              error: {
                status_code: 404,
                message: '1 connector is missing. Connector id missing is: 123',
              },
            },
          ],
        });
      });

      describe('importing with exceptions', () => {
        beforeEach(async () => {
          await deleteAllExceptions(supertest, log);
        });

        it('should be able to import a rule and an exception list', async () => {
          const simpleRule = getSimpleRule('rule-1');

          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .attach(
              'file',
              toNdJsonString([
                simpleRule,
                getImportExceptionsListSchemaMock('test_list_id'),
                getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
              ]),
              'rules.ndjson'
            )
            .expect(200);
          expect(body).to.eql({ success: true, success_count: 3, errors: [] });
        });

        it('should should only remove non existent exception list references from rule', async () => {
          // create an exception list
          const { body: exceptionBody } = await supertest
            .post(EXCEPTION_LIST_URL)
            .set('kbn-xsrf', 'true')
            .send({ ...getCreateExceptionListMinimalSchemaMock(), list_id: 'i_exist' })
            .expect(200);

          const simpleRule: ReturnType<typeof getSimpleRule> = {
            ...getSimpleRule('rule-1'),
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
          };
          const { body } = await supertest
            .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
            .set('kbn-xsrf', 'true')
            .attach('file', ruleToNdjson(simpleRule), 'rules.ndjson')
            .expect(200);

          const { body: ruleResponse } = await supertest
            .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
            .send()
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(ruleResponse);
          expect(bodyToCompare.exceptions_list).to.eql([
            {
              id: exceptionBody.id,
              list_id: 'i_exist',
              namespace_type: 'single',
              type: 'detection',
            },
          ]);

          expect(body).to.eql({
            success: false,
            success_count: 1,
            errors: [
              {
                rule_id: 'rule-1',
                error: {
                  message:
                    'Rule with rule_id: "rule-1" references a non existent exception list of list_id: "123" and id: "i_dont_exist". Reference has been removed.',
                  status_code: 400,
                },
              },
            ],
          });
        });
      });
    });
  });
};
