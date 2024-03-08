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
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  DETECTION_ENGINE_RULES_URL,
  UPDATE_OR_CREATE_LEGACY_ACTIONS,
} from '@kbn/security-solution-plugin/common/constants';
import {
  createRuleThroughAlertingEndpoint,
  getSimpleRule,
  getSimpleRuleOutput,
  getWebHookAction,
  updateUsername,
  removeServerGeneratedProperties,
  getRuleSavedObjectWithLegacyInvestigationFields,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
  checkInvestigationFieldSoValue,
} from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for pulling kibana username, similar to getService('es')
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@ess find_rules - ESS specific logic', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
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
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(
          undefined,
          {
            field_names: ['client.address', 'agent.name'],
          },
          es,
          ruleWithLegacyInvestigationField.id
        );
        expect(isInvestigationFieldMigratedInSo).to.eql(false);

        const isInvestigationFieldMigratedInSoForRuleWithEmptyArray =
          await checkInvestigationFieldSoValue(
            undefined,
            {
              field_names: [],
            },
            es,
            ruleWithLegacyInvestigationFieldEmptyArray.id
          );
        expect(isInvestigationFieldMigratedInSoForRuleWithEmptyArray).to.eql(false);

        const isInvestigationFieldSoExpectedType = await checkInvestigationFieldSoValue(
          undefined,
          {
            field_names: ['host.name'],
          },
          es,
          ruleWithExpectedTyping.id
        );
        expect(isInvestigationFieldSoExpectedType).to.eql(true);
      });
    });
  });
};
