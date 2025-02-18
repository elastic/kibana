/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import {
  getComplexRule,
  getComplexRuleOutput,
  getSimpleRule,
  getSimpleRuleOutput,
  getWebHookAction,
  updateUsername,
  removeServerGeneratedProperties,
} from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @skipInServerlessMKI find_rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('should return an empty find body correctly if no rules are loaded', async () => {
      const { body } = await securitySolutionApi.findRules({ query: {} }).expect(200);

      expect(body).to.eql({
        data: [],
        page: 1,
        perPage: 20,
        total: 0,
      });
    });

    it('should return a single rule when a single rule is loaded from a find with defaults added', async () => {
      await createRule(supertest, log, getSimpleRule());

      // query the single rule from _find
      const { body } = await securitySolutionApi.findRules({ query: {} }).expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

      expect(body).to.eql({
        data: [expectedRule],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });

    it('should return a single rule when a single rule is loaded from a find with everything for the rule added', async () => {
      // add a single rule
      await securitySolutionApi.createRule({ body: getComplexRule() }).expect(200);

      // query and expect that we get back one record in the find
      const { body } = await securitySolutionApi.findRules({ query: {} }).expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      const expectedRule = updateUsername(getComplexRuleOutput(), await utils.getUsername());

      expect(body).to.eql({
        data: [expectedRule],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });

    it('should find a single rule with a execute immediately action correctly', async () => {
      // create connector/action
      const { body: hookAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send(getWebHookAction())
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);

      const action = {
        group: 'default',
        id: hookAction.id,
        action_type_id: hookAction.connector_type_id,
        params: {},
      };

      // create rule with connector/action
      const rule: ReturnType<typeof getSimpleRule> = {
        ...getSimpleRule('rule-1'),
        actions: [action],
      };
      await createRule(supertest, log, rule);

      // query the single rule from _find
      const { body } = await securitySolutionApi.findRules({ query: {} }).expect(200);

      const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());
      const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
        ...expectedRule,
        actions: [
          {
            ...action,
            uuid: body.data[0].actions[0].uuid,
            frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
          },
        ],
      };

      body.data = [removeServerGeneratedProperties(body.data[0])];
      expect(body).to.eql({
        data: [ruleWithActions],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });

    it('should be able to find a scheduled action correctly', async () => {
      // create connector/action
      const { body: hookAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send(getWebHookAction())
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);

      const action = {
        group: 'default',
        id: hookAction.id,
        action_type_id: hookAction.connector_type_id,
        params: {},
      };

      // create rule with connector/action
      const rule: ReturnType<typeof getSimpleRule> = {
        ...getSimpleRule('rule-1'),
        throttle: '1h', // <-- throttle makes this a scheduled action
        actions: [action],
      };
      await createRule(supertest, log, rule);

      // query the single rule from _find
      const { body } = await securitySolutionApi.findRules({ query: {} }).expect(200);
      const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

      const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
        ...expectedRule,
        actions: [
          {
            ...action,
            uuid: body.data[0].actions[0].uuid,
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          },
        ],
      };

      body.data = [removeServerGeneratedProperties(body.data[0])];
      expect(body).to.eql({
        data: [ruleWithActions],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });
  });
};
