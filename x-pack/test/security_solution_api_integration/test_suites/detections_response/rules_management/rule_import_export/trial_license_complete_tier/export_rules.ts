/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID } from '../../../../../config/shared';
import { binaryToString, getCustomQueryRuleParams } from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  waitForRulePartialFailure,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getWebHookConnectorParams } from '../../../utils/connectors/get_web_hook_connector_params';
import { createConnector } from '../../../utils/connectors';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess @skipInServerlessMKI export_rules', () => {
    describe('exporting rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should set the response content types to be expected', async () => {
        await createRule(supertest, log, getCustomQueryRuleParams());

        await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .expect('Content-Type', 'application/ndjson')
          .expect('Content-Disposition', 'attachment; filename="export.ndjson"');
      });

      it('should validate exported rule schema when it is exported by its rule_id', async () => {
        const ruleId = 'rule-1';

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: ruleId,
            enabled: true,
          })
        );

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

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: ruleId1,
            enabled: true,
          })
        );
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: ruleId2,
            enabled: true,
          })
        );

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
        await createRule(supertest, log, getCustomQueryRuleParams());

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
        const ruleToExport1 = getCustomQueryRuleParams({ rule_id: 'rule-1' });
        const ruleToExport2 = getCustomQueryRuleParams({ rule_id: 'rule-2' });

        await createRule(supertest, log, ruleToExport1);
        await createRule(supertest, log, ruleToExport2);

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportedRule1 = JSON.parse(body.toString().split(/\n/)[0]);
        const exportedRule2 = JSON.parse(body.toString().split(/\n/)[1]);

        expect([exportedRule1, exportedRule2]).toEqual(
          expect.arrayContaining([
            expect.objectContaining(ruleToExport1),
            expect.objectContaining(ruleToExport2),
          ])
        );
      });

      it('should export multiple actions attached to 1 rule', async () => {
        const webHookConnectorParams = getWebHookConnectorParams();
        const webHookConnectorId1 = await createConnector(supertest, webHookConnectorParams);
        const webHookConnectorId2 = await createConnector(supertest, webHookConnectorParams);

        const action1 = {
          group: 'default',
          id: webHookConnectorId1,
          action_type_id: webHookConnectorParams.connector_type_id,
          params: {},
        };
        const action2 = {
          group: 'default',
          id: webHookConnectorId2,
          action_type_id: webHookConnectorParams.connector_type_id,
          params: {},
        };

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            actions: [action1, action2],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportedRule = JSON.parse(body.toString().split(/\n/)[0]);

        expect(exportedRule).toMatchObject({
          actions: [
            {
              ...action1,
              uuid: expect.any(String),
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
            {
              ...action2,
              uuid: expect.any(String),
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
          ],
        });
      });

      it('should export actions attached to 2 rules', async () => {
        const webHookConnectorParams = getWebHookConnectorParams();
        const webHookConnectorId = await createConnector(supertest, webHookConnectorParams);

        const action = {
          group: 'default',
          id: webHookConnectorId,
          action_type_id: webHookConnectorParams.connector_type_id,
          params: {},
        };

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({ rule_id: 'rule-1', actions: [action] })
        );
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({ rule_id: 'rule-2', actions: [action] })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportedRule1 = JSON.parse(body.toString().split(/\n/)[0]);
        const exportedRule2 = JSON.parse(body.toString().split(/\n/)[1]);

        expect(exportedRule1).toMatchObject({
          actions: [
            {
              ...action,
              uuid: expect.any(String),
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
          ],
        });
        expect(exportedRule2).toMatchObject({
          actions: [
            {
              ...action,
              uuid: expect.any(String),
              frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
            },
          ],
        });
      });

      it('should export action connectors with the rule', async () => {
        const webHookConnectorParams = getWebHookConnectorParams();
        const webHookConnectorId = await createConnector(supertest, webHookConnectorParams);

        const action = {
          group: 'default',
          id: webHookConnectorId,
          action_type_id: webHookConnectorParams.connector_type_id,
          params: {},
        };

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            actions: [action],
          })
        );

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportedConnectors = JSON.parse(body.toString().split(/\n/)[1]);
        const exportedSummary = JSON.parse(body.toString().split(/\n/)[2]);

        expect(exportedConnectors).toMatchObject({
          attributes: {
            actionTypeId: '.webhook',
            config: {
              hasAuth: true,
              headers: null,
              method: 'post',
              url: 'http://localhost',
            },
            isMissingSecrets: true,
            name: 'Webhook connector',
            secrets: {},
          },
          references: [],
          type: 'action',
        });
        expect(exportedSummary).toMatchObject({
          exported_count: 2,
          exported_rules_count: 1,
          missing_rules: [],
          missing_rules_count: 0,
          excluded_action_connection_count: 0,
          excluded_action_connections: [],
          exported_action_connector_count: 1,
          missing_action_connection_count: 0,
          missing_action_connections: [],
        });
      });

      it('should NOT export preconfigured actions connectors', async () => {
        const action = {
          group: 'default',
          id: PRECONFIGURED_EMAIL_ACTION_CONNECTOR_ID,
          action_type_id: '.email',
          params: {},
        };

        await createRule(supertest, log, getCustomQueryRuleParams({ actions: [action] }));

        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200)
          .parse(binaryToString);

        const exportedSummary = JSON.parse(body.toString().split(/\n/)[1]);

        expect(exportedSummary).toMatchObject({
          exported_count: 1,
          exported_rules_count: 1,
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
    rule_source: {
      type: 'internal',
    },
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
