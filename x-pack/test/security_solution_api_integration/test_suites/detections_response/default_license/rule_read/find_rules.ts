/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import {
  DETECTION_ENGINE_RULES_URL,
  UPDATE_OR_CREATE_LEGACY_ACTIONS,
} from '@kbn/security-solution-plugin/common/constants';
import {
  createRule,
  createRuleThroughAlertingEndpoint,
  deleteAllRules,
  getComplexRule,
  getComplexRuleOutput,
  getRuleSOById,
  getSimpleRule,
  getSimpleRuleOutput,
  getWebHookAction,
  updateUsername,
  removeServerGeneratedProperties,
  getRuleSavedObjectWithLegacyInvestigationFields,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@ess @serverless find_rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('should return an empty find body correctly if no rules are loaded', async () => {
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
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
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send()
        .expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

      expect(body).to.eql({
        data: [expectedRule],
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
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send(getComplexRule())
        .expect(200);

      // query and expect that we get back one record in the find
      const { body } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send()
        .expect(200);

      body.data = [removeServerGeneratedProperties(body.data[0])];
      const expectedRule = updateUsername(getComplexRuleOutput(), ELASTICSEARCH_USERNAME);

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
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getWebHookAction())
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send()
        .expect(200);

      const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);
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
        .post('/api/actions/action')
        .set('kbn-xsrf', 'true')
        .send(getWebHookAction())
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send()
        .expect(200);
      const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

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
          .post(`${UPDATE_OR_CREATE_LEGACY_ACTIONS}?alert_id=${createRuleBody.id}`)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
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

        const expectedRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        const ruleWithActions: ReturnType<typeof getSimpleRuleOutput> = {
          ...expectedRule,
          actions: [
            {
              id: hookAction.id,
              group: 'default',
              params: {
                message:
                  'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
              },
              action_type_id: hookAction.actionTypeId,
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

    describe('legacy investigation fields', () => {
      let ruleWithLegacyInvestigationField: Rule<BaseRuleParams>;
      let ruleWithLegacyInvestigationFieldEmptyArray: Rule<BaseRuleParams>;

      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        ruleWithLegacyInvestigationField = await createRuleThroughAlertingEndpoint(
          supertest,
          getRuleSavedObjectWithLegacyInvestigationFields()
        );
        ruleWithLegacyInvestigationFieldEmptyArray = await createRuleThroughAlertingEndpoint(
          supertest,
          getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray()
        );
        await createRule(supertest, log, {
          ...getSimpleRule('rule-with-investigation-field'),
          name: 'Test investigation fields object',
          investigation_fields: { field_names: ['host.name'] },
        });
      });

      it('should return a rule with the migrated investigation fields', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
          .set('kbn-xsrf', 'true')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .send()
          .expect(200);

        const [ruleWithFieldAsArray] = body.data.filter(
          (rule: RuleResponse) => rule.rule_id === ruleWithLegacyInvestigationField.params.ruleId
        );

        const [ruleWithFieldAsEmptyArray] = body.data.filter(
          (rule: RuleResponse) =>
            rule.rule_id === ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId
        );

        const [ruleWithExpectedTyping] = body.data.filter(
          (rule: RuleResponse) => rule.rule_id === 'rule-with-investigation-field'
        );

        expect(ruleWithFieldAsArray.investigation_fields).to.eql({
          field_names: ['client.address', 'agent.name'],
        });
        expect(ruleWithFieldAsEmptyArray.investigation_fields).to.eql(undefined);
        expect(ruleWithExpectedTyping.investigation_fields).to.eql({
          field_names: ['host.name'],
        });

        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * NOT include a migration on SO.
         */
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, ruleWithLegacyInvestigationField.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql(['client.address', 'agent.name']);
        const {
          hits: {
            hits: [{ _source: ruleSO2 }],
          },
        } = await getRuleSOById(es, ruleWithLegacyInvestigationFieldEmptyArray.id);
        expect(ruleSO2?.alert?.params?.investigationFields).to.eql([]);
        const {
          hits: {
            hits: [{ _source: ruleSO3 }],
          },
        } = await getRuleSOById(es, ruleWithExpectedTyping.id);
        expect(ruleSO3?.alert?.params?.investigationFields).to.eql({ field_names: ['host.name'] });
      });
    });
  });
};
