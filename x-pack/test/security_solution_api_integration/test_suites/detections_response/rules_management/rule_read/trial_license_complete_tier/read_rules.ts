/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  getSimpleRule,
  getSimpleRuleOutput,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleWithoutRuleId,
  getWebHookAction,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  updateUsername,
} from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless read_rules', () => {
    describe('reading rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should be able to read a single rule using rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { body } = await securitySolutionApi
          .readRule({ query: { rule_id: 'rule-1' } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should be able to read a single rule using id', async () => {
        const createRuleBody = await createRule(supertest, log, getSimpleRule());

        const { body } = await securitySolutionApi
          .readRule({ query: { id: createRuleBody.id } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should be able to read a single rule with an auto-generated rule_id', async () => {
        const createRuleBody = await createRule(supertest, log, getSimpleRuleWithoutRuleId());

        const { body } = await securitySolutionApi
          .readRule({ query: { rule_id: createRuleBody.rule_id } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).to.eql(expectedRule);
      });

      it('should return 404 if given a fake id', async () => {
        const { body } = await securitySolutionApi
          .readRule({ query: { id: 'c1e1b359-7ac1-4e96-bc81-c683c092436f' } })
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'id: "c1e1b359-7ac1-4e96-bc81-c683c092436f" not found',
        });
      });

      it('should return 404 if given a fake rule_id', async () => {
        const { body } = await securitySolutionApi
          .readRule({ query: { rule_id: 'fake_id' } })
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'rule_id: "fake_id" not found',
        });
      });

      it('@skipInServerless should be able to a read a execute immediately action correctly', async () => {
        // create connector/action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const action = {
          group: 'default',
          id: hookAction.id,
          action_type_id: hookAction.actionTypeId,
          params: {},
        };

        // create rule with connector/action
        const rule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [action],
        };
        const createRuleBody = await createRule(supertest, log, rule);

        const { body } = await securitySolutionApi
          .readRule({ query: { id: createRuleBody.id } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

        const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
          ...expectedRule,
          actions: [
            {
              ...action,
              uuid: bodyToCompare.actions[0].uuid,
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
          ],
        };
        expect(bodyToCompare).to.eql(ruleWithActions);
      });

      it('@skipInServerless should be able to a read a scheduled action correctly', async () => {
        // create connector/action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(getWebHookAction())
          .expect(200);

        const action = {
          group: 'default',
          id: hookAction.id,
          action_type_id: hookAction.actionTypeId,
          params: {},
        };

        // create rule with connector/action
        const rule: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          throttle: '1h', // <-- throttle makes this a scheduled action
          actions: [action],
        };

        const createRuleBody = await createRule(supertest, log, rule);

        const { body } = await securitySolutionApi
          .readRule({ query: { id: createRuleBody.id } })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

        const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
          ...expectedRule,
          actions: [
            {
              ...action,
              uuid: bodyToCompare.actions[0].uuid,
              frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
            },
          ],
        };
        expect(bodyToCompare).to.eql(ruleWithActions);
      });
    });
  });
};
