/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllAlerts,
  deleteSignalsIndex,
  getComplexRule,
  getComplexRuleOutput,
  getSimpleRule,
  getSimpleRuleOutput,
  getWebHookAction,
  removeServerGeneratedProperties,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('find_rules', () => {
    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllAlerts(supertest, log);
    });

    it('should return an empty find body correctly if no rules are loaded', async () => {
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

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
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      expect(body).to.eql({
        data: [getSimpleRuleOutput()],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });

    it('should return a single rule when a single rule is loaded from a find with everything for the rule added', async () => {
      // add a single rule
      await supertest
        .post(DETECTION_ENGINE_RULES_URL)
        .set('kbn-xsrf', 'true')
        .send(getComplexRule())
        .expect(200);

      // query and expect that we get back one record in the find
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      expect(body).to.eql({
        data: [getComplexRuleOutput()],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });

    it('should find a single rule with a execute immediately action correctly', async () => {
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
      await createRule(supertest, log, rule);

      // query the single rule from _find
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
        ...getSimpleRuleOutput(),
        actions: [action],
        throttle: 'rule',
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
        throttle: '1h', // <-- throttle makes this a scheduled action
        actions: [action],
      };
      await createRule(supertest, log, rule);

      // query the single rule from _find
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
        ...getSimpleRuleOutput(),
        actions: [action],
        throttle: '1h', // <-- throttle makes this a scheduled action
      };

      body.data = [removeServerGeneratedProperties(body.data[0])];
      expect(body).to.eql({
        data: [ruleWithActions],
        page: 1,
        perPage: 20,
        total: 1,
      });
    });

    /**
     * Tests the legacy actions to ensure we can export legacy notifications
     * @deprecated Once the legacy notification system is removed, remove this test too.
     */
    describe('legacy_notification_system', async () => {
      it('should be able to a read a scheduled action correctly', async () => {
        // create an connector/action
        const { body: hookAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        // create a rule without actions
        const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // attach the legacy notification
        await supertest
          .post(`/internal/api/detection/legacy/notifications?alert_id=${createRuleBody.id}`)
          .set('kbn-xsrf', 'true')
          .send({
            name: 'Legacy notification with one action',
            interval: '1h',
            actions: [
              {
                id: hookAction.id,
                group: 'default',
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                actionTypeId: hookAction.actionTypeId,
              },
            ],
          })
          .expect(200);

        // query the single rule from _find
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
          ...getSimpleRuleOutput(),
          actions: [
            {
              id: hookAction.id,
              group: 'default',
              params: {
                message:
                  'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
              },
              action_type_id: hookAction.actionTypeId,
            },
          ],
          throttle: '1h',
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
  });
};
