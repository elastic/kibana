/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  binaryToString,
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getSimpleRule,
  getSimpleRuleOutput,
  getWebHookAction,
  removeServerGeneratedProperties,
  waitForRulePartialFailure,
  updateUsername,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for pulling kibana username, similar to getService('es')
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@ess @brokenInServerless @skipInQA export_rules', () => {
    describe('exporting rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should set the response content types to be expected', async () => {
        await createRule(supertest, log, getSimpleRule());

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .expect('Content-Type', 'application/ndjson')
          .expect('Content-Disposition', 'attachment; filename="export.ndjson"');
      });

      it('should validate exported rule schema when its exported by its rule_id', async () => {
        const ruleId = 'rule-1';

        await createRule(supertest, log, getSimpleRule(ruleId, true));

        await waitForRulePartialFailure({
          supertest,
          log,
          ruleId,
        });

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            objects: [{ rule_id: 'rule-1' }],
          })
          .expect(200)
          .parse(binaryToString);

        const exportedRule = JSON.parse(body.toString().split(/\n/)[0]);

        expectToMatchRuleSchema(exportedRule);
      });

      it('should validate all exported rules schema', async () => {
        const ruleId1 = 'rule-1';
        const ruleId2 = 'rule-2';

        await createRule(supertest, log, getSimpleRule(ruleId1, true));
        await createRule(supertest, log, getSimpleRule(ruleId2, true));

        await waitForRulePartialFailure({
          supertest,
          log,
          ruleId: ruleId1,
        });
        await waitForRulePartialFailure({
          supertest,
          log,
          ruleId: ruleId2,
        });

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportedRule1 = JSON.parse(body.toString().split(/\n/)[1]);
        const exportedRule2 = JSON.parse(body.toString().split(/\n/)[0]);

        expectToMatchRuleSchema(exportedRule1);
        expectToMatchRuleSchema(exportedRule2);
      });

      it('should export a exported count with a single rule_id', async () => {
        await createRule(supertest, log, getSimpleRule());

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const bodySplitAndParsed = JSON.parse(body.toString().split(/\n/)[1]);

        expect(bodySplitAndParsed).toEqual({
          exported_exception_list_count: 0,
          exported_exception_list_item_count: 0,
          exported_count: 1,
          exported_rules_count: 1,
          missing_exception_list_item_count: 0,
          missing_exception_list_items: [],
          missing_exception_lists: [],
          missing_exception_lists_count: 0,
          missing_rules: [],
          missing_rules_count: 0,
          excluded_action_connection_count: 0,
          excluded_action_connections: [],
          exported_action_connector_count: 0,
          missing_action_connection_count: 0,
          missing_action_connections: [],
        });
      });

      it('should export exactly two rules given two rules', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));
        await createRule(supertest, log, getSimpleRule('rule-2'));

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
        const secondRuleParsed = JSON.parse(body.toString().split(/\n/)[1]);
        const firstRule = removeServerGeneratedProperties(firstRuleParsed);
        const secondRule = removeServerGeneratedProperties(secondRuleParsed);
        const expectedRule1 = updateUsername(
          getSimpleRuleOutput(firstRule.rule_id),
          ELASTICSEARCH_USERNAME
        );
        const expectedRule2 = updateUsername(
          getSimpleRuleOutput(secondRule.rule_id),
          ELASTICSEARCH_USERNAME
        );

        expect(firstRule).toEqual(expectedRule1);
        expect(secondRule).toEqual(expectedRule2);
      });

      it('should export multiple actions attached to 1 rule', async () => {
        // 1st action
        const { body: hookAction1 } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        // 2nd action
        const { body: hookAction2 } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'true')
          .send(getWebHookAction())
          .expect(200);

        const action1 = {
          group: 'default',
          id: hookAction1.id,
          action_type_id: hookAction1.actionTypeId,
          params: {},
        };
        const action2 = {
          group: 'default',
          id: hookAction2.id,
          action_type_id: hookAction2.actionTypeId,
          params: {},
        };

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [action1, action2],
        };

        await createRule(supertest, log, rule1);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
        const firstRule = removeServerGeneratedProperties(firstRuleParsed);
        const expectedRule = updateUsername(getSimpleRuleOutput('rule-1'), ELASTICSEARCH_USERNAME);

        const outputRule1: ReturnType<typeof getSimpleRuleOutput> = {
          ...expectedRule,
          actions: [
            {
              ...action1,
              uuid: firstRule.actions[0].uuid,
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
            {
              ...action2,
              uuid: firstRule.actions[1].uuid,
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
          ],
        };
        expect(firstRule).toEqual(outputRule1);
      });

      it('should export actions attached to 2 rules', async () => {
        // create a new action
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

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [action],
        };

        const rule2: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-2'),
          actions: [action],
        };

        await createRule(supertest, log, rule1);
        await createRule(supertest, log, rule2);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const firstRuleParsed = JSON.parse(body.toString().split(/\n/)[0]);
        const secondRuleParsed = JSON.parse(body.toString().split(/\n/)[1]);
        const firstRule = removeServerGeneratedProperties(firstRuleParsed);
        const secondRule = removeServerGeneratedProperties(secondRuleParsed);
        const expectedRule2 = updateUsername(getSimpleRuleOutput('rule-2'), ELASTICSEARCH_USERNAME);

        const outputRule1: ReturnType<typeof getSimpleRuleOutput> = {
          ...expectedRule2,
          actions: [
            {
              ...action,
              uuid: firstRule.actions[0].uuid,
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
          ],
        };
        const expectedRule1 = updateUsername(getSimpleRuleOutput('rule-1'), ELASTICSEARCH_USERNAME);

        const outputRule2: ReturnType<typeof getSimpleRuleOutput> = {
          ...expectedRule1,
          actions: [
            {
              ...action,
              uuid: secondRule.actions[0].uuid,
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
          ],
        };
        expect(firstRule).toEqual(outputRule1);
        expect(secondRule).toEqual(outputRule2);
      });

      it('should export actions connectors with the rule', async () => {
        // create a new action
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

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [action],
        };

        await createRule(supertest, log, rule1);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const connectorsObjectParsed = JSON.parse(body.toString().split(/\n/)[1]);
        const exportDetailsParsed = JSON.parse(body.toString().split(/\n/)[2]);

        expect(connectorsObjectParsed).toEqual(
          expect.objectContaining({
            attributes: {
              actionTypeId: '.webhook',
              config: {
                hasAuth: true,
                headers: null,
                method: 'post',
                url: 'http://localhost',
              },
              isMissingSecrets: true,
              name: 'Some connector',
              secrets: {},
            },
            references: [],
            type: 'action',
          })
        );
        expect(exportDetailsParsed).toEqual({
          exported_exception_list_count: 0,
          exported_exception_list_item_count: 0,
          exported_count: 2,
          exported_rules_count: 1,
          missing_exception_list_item_count: 0,
          missing_exception_list_items: [],
          missing_exception_lists: [],
          missing_exception_lists_count: 0,
          missing_rules: [],
          missing_rules_count: 0,
          excluded_action_connection_count: 0,
          excluded_action_connections: [],
          exported_action_connector_count: 1,
          missing_action_connection_count: 0,
          missing_action_connections: [],
        });
      });
      it('should export rule without the action connector if it is Preconfigured Connector', async () => {
        const action = {
          group: 'default',
          id: 'my-test-email',
          action_type_id: '.email',
          params: {},
        };

        const rule1: ReturnType<typeof getSimpleRule> = {
          ...getSimpleRule('rule-1'),
          actions: [action],
        };

        await createRule(supertest, log, rule1);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportDetailsParsed = JSON.parse(body.toString().split(/\n/)[1]);

        expect(exportDetailsParsed).toEqual({
          exported_exception_list_count: 0,
          exported_exception_list_item_count: 0,
          exported_count: 1,
          exported_rules_count: 1,
          missing_exception_list_item_count: 0,
          missing_exception_list_items: [],
          missing_exception_lists: [],
          missing_exception_lists_count: 0,
          missing_rules: [],
          missing_rules_count: 0,
          excluded_action_connection_count: 0,
          excluded_action_connections: [],
          exported_action_connector_count: 0,
          missing_action_connection_count: 0,
          missing_action_connections: [],
        });
      });
    });
  });
};

function expectToMatchRuleSchema(obj: RuleResponse): void {
  expect(obj.throttle).toBeUndefined();
  expect(obj).toEqual({
    id: expect.any(String),
    rule_id: expect.any(String),
    enabled: expect.any(Boolean),
    immutable: false,
    updated_at: expect.any(String),
    updated_by: expect.any(String),
    created_at: expect.any(String),
    created_by: expect.any(String),
    name: expect.any(String),
    tags: expect.arrayContaining([]),
    interval: expect.any(String),
    description: expect.any(String),
    risk_score: expect.any(Number),
    severity: expect.any(String),
    output_index: expect.any(String),
    author: expect.arrayContaining([]),
    false_positives: expect.arrayContaining([]),
    from: expect.any(String),
    max_signals: expect.any(Number),
    revision: expect.any(Number),
    risk_score_mapping: expect.arrayContaining([]),
    severity_mapping: expect.arrayContaining([]),
    threat: expect.arrayContaining([]),
    to: expect.any(String),
    references: expect.arrayContaining([]),
    version: expect.any(Number),
    exceptions_list: expect.arrayContaining([]),
    related_integrations: expect.arrayContaining([]),
    required_fields: expect.arrayContaining([]),
    setup: expect.any(String),
    type: expect.any(String),
    language: expect.any(String),
    index: expect.arrayContaining([]),
    query: expect.any(String),
    actions: expect.arrayContaining([]),
  });
}
