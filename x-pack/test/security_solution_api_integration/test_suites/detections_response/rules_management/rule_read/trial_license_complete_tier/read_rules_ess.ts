/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import {
  DETECTION_ENGINE_RULES_URL,
  UPDATE_OR_CREATE_LEGACY_ACTIONS,
} from '@kbn/security-solution-plugin/common/constants';
import {
  getSimpleRule,
  getSimpleRuleOutput,
  getWebHookAction,
  removeServerGeneratedProperties,
  updateUsername,
  getRuleSavedObjectWithLegacyInvestigationFields,
  createRuleThroughAlertingEndpoint,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
  checkInvestigationFieldSoValue,
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
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');

  describe('@ess read_rules - ESS specific logic', () => {
    describe('reading rules', () => {
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
        it('should be able to a read a scheduled action correctly', async () => {
          // create an action
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
            .set('elastic-api-version', '1')
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

          // read the rule which should have the legacy actions attached
          const { body } = await supertest
            .get(`${DETECTION_ENGINE_RULES_URL}?id=${createRuleBody.id}`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .send(getSimpleRule())
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          const expectedRule = updateUsername(getSimpleRuleOutput(), await utils.getUsername());

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
          expect(bodyToCompare).to.eql(ruleWithActions);
        });
      });
    });

    describe('legacy investigation_fields', () => {
      let ruleWithLegacyInvestigationField: Rule<BaseRuleParams>;
      let ruleWithLegacyInvestigationFieldEmptyArray: Rule<BaseRuleParams>;

      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await createAlertsIndex(supertest, log);
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

      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('should be able to read a rule with a legacy investigation field', async () => {
        const { body } = await supertest
          .get(
            `${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleWithLegacyInvestigationField.params.ruleId}`
          )
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare.investigation_fields).to.eql({
          field_names: ['client.address', 'agent.name'],
        });
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * just be a transform on read, not a migration on SO.
         */
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(
          undefined,
          {
            field_names: ['client.address', 'agent.name'],
          },
          es,
          body.id
        );
        expect(isInvestigationFieldMigratedInSo).to.eql(false);
      });

      it('should be able to read a rule with a legacy investigation field - empty array', async () => {
        const { body } = await supertest
          .get(
            `${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId}`
          )
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare.investigation_fields).to.eql(undefined);
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * just be a transform on read, not a migration on SO.
         */
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(
          undefined,
          {
            field_names: [],
          },
          es,
          body.id
        );
        expect(isInvestigationFieldMigratedInSo).to.eql(false);
      });

      it('does not migrate investigation fields when intended object type', async () => {
        const { body } = await supertest
          .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-with-investigation-field`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send()
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare.investigation_fields).to.eql({ field_names: ['host.name'] });
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should
         * just be a transform on read, not a migration on SO.
         */
        const isInvestigationFieldIntendedTypeInSo = await checkInvestigationFieldSoValue(
          undefined,
          { field_names: ['host.name'] },
          es,
          body.id
        );
        expect(isInvestigationFieldIntendedTypeInSo).to.eql(true);
      });
    });
  });
};
