/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';

import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  removeServerGeneratedProperties,
  removeServerGeneratedPropertiesIncludingRuleId,
  getSimpleRuleOutputWithoutRuleId,
  getSimpleRuleUpdate,
  createRule,
  getSimpleRule,
  createLegacyRuleAction,
  getLegacyActionSO,
  getRuleSOById,
  createRuleThroughAlertingEndpoint,
  getRuleSavedObjectWithLegacyInvestigationFields,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
  updateUsername,
} from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for pulling kibana username, similar to getService('es')
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@ess update_rules - ESS specific logic', () => {
    describe('update rules', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should update a single rule property of name using an auto-generated rule_id and migrate the actions', async () => {
        const rule = getSimpleRule('rule-1');
        delete rule.rule_id;
        const [connector, createRuleBody] = await Promise.all([
          supertest
            .post(`/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              connector_type_id: '.slack',
              secrets: {
                webhookUrl: 'http://localhost:1234',
              },
            }),
          createRule(supertest, log, rule),
        ]);
        await createLegacyRuleAction(supertest, createRuleBody.id, connector.body.id);

        // check for legacy sidecar action
        const sidecarActionsResults = await getLegacyActionSO(es);
        expect(sidecarActionsResults.hits.hits.length).to.eql(1);
        expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(
          createRuleBody.id
        );

        const action1 = {
          group: 'default',
          id: connector.body.id,
          action_type_id: connector.body.connector_type_id,
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
        };
        // update a simple rule's name
        const updatedRule = getSimpleRuleUpdate('rule-1');
        updatedRule.rule_id = createRuleBody.rule_id;
        updatedRule.name = 'some other name';
        updatedRule.actions = [action1];
        delete updatedRule.id;

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(updatedRule)
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(body);

        const outputRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          ELASTICSEARCH_USERNAME
        );
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        outputRule.actions = [
          {
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            uuid: bodyToCompare.actions![0].uuid,
            frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
          },
        ];

        expect(bodyToCompare).to.eql(outputRule);

        // legacy sidecar action should be gone
        const sidecarActionsPostResults = await getLegacyActionSO(es);
        expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);
      });
    });

    describe('legacy investigation fields', () => {
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

      it('errors if sending legacy investigation fields type', async () => {
        const updatedRule = {
          ...getSimpleRuleUpdate(ruleWithLegacyInvestigationField.params.ruleId),
          investigation_fields: ['foo'],
        };

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(updatedRule)
          .expect(400);

        expect(body.message).to.eql(
          '[request body]: investigation_fields: Expected object, received array'
        );
      });

      it('unsets legacy investigation fields when field not specified for update', async () => {
        // rule_id of a rule with legacy investigation fields set
        const updatedRule = getSimpleRuleUpdate(ruleWithLegacyInvestigationField.params.ruleId);

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(updatedRule)
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare.investigation_fields).to.eql(undefined);
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, body.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql(undefined);
      });

      it('updates a rule with legacy investigation fields when field specified for update in intended format', async () => {
        // rule_id of a rule with legacy investigation fields set
        const updatedRule = {
          ...getSimpleRuleUpdate(ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId),
          investigation_fields: {
            field_names: ['foo'],
          },
        };

        const { body } = await supertest
          .put(DETECTION_ENGINE_RULES_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send(updatedRule)
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body);
        expect(bodyToCompare.investigation_fields).to.eql({
          field_names: ['foo'],
        });
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, body.id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql({
          field_names: ['foo'],
        });
      });
    });
  });
};
