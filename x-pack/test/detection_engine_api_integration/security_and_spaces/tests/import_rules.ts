/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

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
  waitFor,
} from '../../utils';
import { createUserAndRole, deleteUserAndRole } from '../../../common/services/security_solution';
import { ROLES } from '../../../../plugins/security_solution/common/test';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('import_rules', () => {
    describe('importing rules with different roles', () => {
      before(async () => {
        await createUserAndRole(getService, ROLES.hunter_no_actions);
        await createUserAndRole(getService, ROLES.hunter);
      });
      after(async () => {
        await deleteUserAndRole(getService, ROLES.hunter_no_actions);
        await deleteUserAndRole(getService, ROLES.hunter);
      });
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
      });
      it('should successfully import rules without actions when user has no actions privileges', async () => {
        const { body } = await supertestWithoutAuth
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .auth(ROLES.hunter_no_actions, 'changeme')
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
        });
      });
      it('should successfully import rules with actions when user has "read" actions privileges', async () => {
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
        const { body } = await supertestWithoutAuth
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .auth(ROLES.hunter, 'changeme')
          .set('kbn-xsrf', 'true')
          .attach('file', ruleToNdjson(simpleRule), 'rules.ndjson')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
        });
      });
      it('should not import rules with actions when a user has no actions privileges', async () => {
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
        const { body } = await supertestWithoutAuth
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .auth(ROLES.hunter_no_actions, 'changeme')
          .set('kbn-xsrf', 'true')
          .attach('file', ruleToNdjson(simpleRule), 'rules.ndjson')
          .expect(200);
        expect(body).to.eql({
          success: false,
          success_count: 0,
          errors: [
            {
              error: {
                message:
                  'You may not have actions privileges required to import rules with actions: Unauthorized to get actions',
                status_code: 403,
              },
              rule_id: '(unknown id)',
            },
            {
              error: {
                message: `1 connector is missing. Connector id missing is: ${hookAction.id}`,
                status_code: 404,
              },
              rule_id: 'rule-1',
            },
          ],
        });
      });
    });
    describe('importing rules without an index', () => {
      it('should not create a rule if the index does not exist', async () => {
        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(400);

        await waitFor(async () => {
          const { body } = await supertest
            .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`)
            .send();
          return body.status_code === 404;
        }, `within should not create a rule if the index does not exist, ${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`);

        // Try to fetch the rule which should still be a 404 (not found)
        const { body } = await supertest.get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-1`).send();

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "rule-1" not found',
        });
      });

      it('should return an error that the index needs to be created before you are able to import a single rule', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1']), 'rules.ndjson')
          .expect(400);

        expect(body).to.eql({
          message:
            'To create a rule, the index must exist first. Index .siem-signals-default does not exist',
          status_code: 400,
        });
      });

      it('should return an error that the index needs to be created before you are able to import two rules', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_import`)
          .set('kbn-xsrf', 'true')
          .attach('file', getSimpleRuleAsNdjson(['rule-1', 'rule-2']), 'rules.ndjson')
          .expect(400);

        expect(body).to.eql({
          message:
            'To create a rule, the index must exist first. Index .siem-signals-default does not exist',
          status_code: 400,
        });
      });
    });
    describe('importing rules with an index', () => {
      beforeEach(async () => {
        await createSignalsIndex(supertest);
      });

      afterEach(async () => {
        await deleteSignalsIndex(supertest);
        await deleteAllAlerts(supertest);
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
    });
  });
};
