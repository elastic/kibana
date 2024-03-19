/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';

import {
  DETECTION_ENGINE_RULES_URL,
  UPDATE_OR_CREATE_LEGACY_ACTIONS,
} from '@kbn/security-solution-plugin/common/constants';
import {
  binaryToString,
  getRuleSavedObjectWithLegacyInvestigationFields,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
  createRuleThroughAlertingEndpoint,
  checkInvestigationFieldSoValue,
  getCustomQueryRuleParams,
} from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getWebHookConnectorParams } from '../../../utils/connectors/get_web_hook_connector_params';
import { createConnector } from '../../../utils/connectors';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess export_rules - ESS specific logic', () => {
    describe('exporting rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      /**
       * Tests the legacy actions to ensure we can export legacy notifications
       * @deprecated Once the legacy notification system is removed, remove this test too.
       */
      describe('legacy_notification_system', () => {
        it('should be able to export 1 legacy action on 1 rule', async () => {
          const webHookConnectorParams = getWebHookConnectorParams();
          const webHookConnectorId = await createConnector(supertest, webHookConnectorParams);

          // create a rule without actions
          const rule = await createRule(supertest, log, getCustomQueryRuleParams());

          // attach the legacy notification
          await supertest
            .post(`${UPDATE_OR_CREATE_LEGACY_ACTIONS}?alert_id=${rule.id}`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '1')
            .send({
              name: 'Legacy notification with one action',
              interval: '1h',
              actions: [
                {
                  id: webHookConnectorId,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: webHookConnectorParams.connector_type_id,
                },
              ],
            })
            .expect(200);

          // export the rule
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
                group: 'default',
                id: webHookConnectorId,
                action_type_id: webHookConnectorParams.connector_type_id,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ],
          });
        });

        it('should be able to export 2 legacy actions on 1 rule', async () => {
          const webHookConnectorParams = getWebHookConnectorParams();
          const webHookConnectorId1 = await createConnector(supertest, webHookConnectorParams);
          const webHookConnectorId2 = await createConnector(supertest, webHookConnectorParams);

          // create a rule without actions
          const rule = await createRule(supertest, log, getCustomQueryRuleParams());

          // attach the legacy notification with actions
          await supertest
            .post(`${UPDATE_OR_CREATE_LEGACY_ACTIONS}?alert_id=${rule.id}`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '1')
            .send({
              name: 'Legacy notification with one action',
              interval: '1h',
              actions: [
                {
                  id: webHookConnectorId1,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: webHookConnectorParams.connector_type_id,
                },
                {
                  id: webHookConnectorId2,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: webHookConnectorParams.connector_type_id,
                },
              ],
            })
            .expect(200);

          // export the rule
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
                group: 'default',
                id: webHookConnectorId1,
                action_type_id: webHookConnectorParams.connector_type_id,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
              {
                group: 'default',
                id: webHookConnectorId2,
                action_type_id: webHookConnectorParams.connector_type_id,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ],
          });
        });

        it('should be able to export 2 legacy actions on 2 rules', async () => {
          const webHookConnectorParams = getWebHookConnectorParams();
          const webHookConnectorId1 = await createConnector(supertest, webHookConnectorParams);
          const webHookConnectorId2 = await createConnector(supertest, webHookConnectorParams);

          // create 2 rules without actions
          const rule1 = await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({ rule_id: 'rule-1' })
          );
          const rule2 = await createRule(
            supertest,
            log,
            getCustomQueryRuleParams({ rule_id: 'rule-2' })
          );

          // attach the legacy notification with actions to the first rule
          await supertest
            .post(`${UPDATE_OR_CREATE_LEGACY_ACTIONS}?alert_id=${rule1.id}`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '1')
            .send({
              name: 'Legacy notification with one action',
              interval: '1h',
              actions: [
                {
                  id: webHookConnectorId1,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: webHookConnectorParams.connector_type_id,
                },
                {
                  id: webHookConnectorId2,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: webHookConnectorParams.connector_type_id,
                },
              ],
            })
            .expect(200);

          // attach the legacy notification with actions to the 2nd rule
          await supertest
            .post(`${UPDATE_OR_CREATE_LEGACY_ACTIONS}?alert_id=${rule2.id}`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '1')
            .send({
              name: 'Legacy notification with one action',
              interval: '1h',
              actions: [
                {
                  id: webHookConnectorId1,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: webHookConnectorParams.connector_type_id,
                },
                {
                  id: webHookConnectorId2,
                  group: 'default',
                  params: {
                    message:
                      'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                  },
                  actionTypeId: webHookConnectorParams.connector_type_id,
                },
              ],
            })
            .expect(200);

          // export the rule
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
                group: 'default',
                id: webHookConnectorId1,
                action_type_id: webHookConnectorParams.connector_type_id,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
              {
                group: 'default',
                id: webHookConnectorId2,
                action_type_id: webHookConnectorParams.connector_type_id,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ],
          });
          expect(exportedRule2).toMatchObject({
            actions: [
              {
                group: 'default',
                id: webHookConnectorId1,
                action_type_id: webHookConnectorParams.connector_type_id,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
              {
                group: 'default',
                id: webHookConnectorId2,
                action_type_id: webHookConnectorParams.connector_type_id,
                params: {
                  message:
                    'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
                },
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ],
          });
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
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-with-investigation-field',
            name: 'Test investigation fields object',
            investigation_fields: { field_names: ['host.name'] },
          })
        );
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('exports a rule that has legacy investigation_field and transforms field in response', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            objects: [{ rule_id: ruleWithLegacyInvestigationField.params.ruleId }],
          })
          .expect(200)
          .parse(binaryToString);

        const exportedRule = JSON.parse(body.toString().split(/\n/)[0]);

        expect(exportedRule.investigation_fields).toEqual({
          field_names: ['client.address', 'agent.name'],
        });

        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * NOT include a migration on SO.
         */
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(
          undefined,
          { field_names: ['client.address', 'agent.name'] },
          es,
          ruleWithLegacyInvestigationField.id
        );
        expect(isInvestigationFieldMigratedInSo).toEqual(false);
      });

      it('exports a rule that has a legacy investigation field set to empty array and unsets field in response', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            objects: [{ rule_id: ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId }],
          })
          .expect(200)
          .parse(binaryToString);

        const exportedRule = JSON.parse(body.toString().split(/\n/)[0]);

        expect(exportedRule.investigation_fields).toEqual(undefined);

        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * NOT include a migration on SO.
         */
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(
          undefined,
          { field_names: [] },
          es,
          ruleWithLegacyInvestigationFieldEmptyArray.id
        );
        expect(isInvestigationFieldMigratedInSo).toEqual(false);
      });

      it('exports rule with investigation fields as intended object type', async () => {
        const { body } = await supertest
          .post(`${DETECTION_ENGINE_RULES_URL}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            objects: [{ rule_id: 'rule-with-investigation-field' }],
          })
          .expect(200)
          .parse(binaryToString);

        const exportedRule = JSON.parse(body.toString().split(/\n/)[0]);

        expect(exportedRule.investigation_fields).toEqual({
          field_names: ['host.name'],
        });
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * NOT include a migration on SO.
         */
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(
          undefined,
          { field_names: ['host.name'] },
          es,
          exportedRule.id
        );
        expect(isInvestigationFieldMigratedInSo).toEqual(true);
      });
    });
  });
};
