/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';

import {
  getSimpleRule,
  getSimpleRuleOutput,
  removeServerGeneratedProperties,
  getSimpleRuleOutputWithoutRuleId,
  removeServerGeneratedPropertiesIncludingRuleId,
  createLegacyRuleAction,
  getLegacyActionSO,
  getRuleSOById,
  updateUsername,
  createRuleThroughAlertingEndpoint,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
  getRuleSavedObjectWithLegacyInvestigationFields,
  checkInvestigationFieldSoValue,
} from '../../../utils';
import {
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  createRule,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');
  // TODO: add a new service for pulling kibana username, similar to getService('es')
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  // See https://github.com/elastic/kibana/issues/130963 for discussion on deprecation
  describe('@ess @brokenInServerless @skipInQA patch_rules_bulk', () => {
    describe('deprecations', () => {
      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('should return a warning header', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        const { header } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'rule-1', name: 'some other name' }] })
          .expect(200);

        expect(header.warning).to.be(
          '299 Kibana "Deprecated endpoint: /api/detection_engine/rules/_bulk_update API is deprecated since v8.2. Please use the /api/detection_engine/rules/_bulk_action API instead. See https://www.elastic.co/guide/en/security/master/rule-api-overview.html for more detail."'
        );
      });
    });

    describe('patch rules bulk', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should patch a single rule property of name using a rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'rule-1', name: 'some other name' }] })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should patch two rule properties of name using the two rules rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));
        await createRule(supertest, log, getSimpleRule('rule-2'));

        // patch both rule names
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { rule_id: 'rule-1', name: 'some other name' },
              { rule_id: 'rule-2', name: 'some other name' },
            ],
          })
          .expect(200);

        const outputRule1 = updateUsername(getSimpleRuleOutput('rule-1'), ELASTICSEARCH_USERNAME);

        outputRule1.name = 'some other name';
        outputRule1.revision = 1;

        const outputRule2 = updateUsername(getSimpleRuleOutput('rule-2'), ELASTICSEARCH_USERNAME);

        outputRule2.name = 'some other name';
        outputRule2.revision = 1;

        const bodyToCompare1 = removeServerGeneratedProperties(body[0]);
        const bodyToCompare2 = removeServerGeneratedProperties(body[1]);
        expect(bodyToCompare1).to.eql(outputRule1);
        expect(bodyToCompare2).to.eql(outputRule2);
      });

      it('should patch a single rule property of name using an id', async () => {
        const createRuleBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ id: createRuleBody.id, name: 'some other name' }] })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should patch two rule properties of name using the two rules id', async () => {
        const createRule1 = await createRule(supertest, log, getSimpleRule('rule-1'));
        const createRule2 = await createRule(supertest, log, getSimpleRule('rule-2'));

        // patch both rule names
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { id: createRule1.id, name: 'some other name' },
              { id: createRule2.id, name: 'some other name' },
            ],
          })
          .expect(200);

        const outputRule1 = updateUsername(
          getSimpleRuleOutputWithoutRuleId('rule-1'),
          ELASTICSEARCH_USERNAME
        );

        outputRule1.name = 'some other name';
        outputRule1.revision = 1;

        const outputRule2 = updateUsername(
          getSimpleRuleOutputWithoutRuleId('rule-2'),
          ELASTICSEARCH_USERNAME
        );
        outputRule2.name = 'some other name';
        outputRule2.revision = 1;

        const bodyToCompare1 = removeServerGeneratedPropertiesIncludingRuleId(body[0]);
        const bodyToCompare2 = removeServerGeneratedPropertiesIncludingRuleId(body[1]);
        expect(bodyToCompare1).to.eql(outputRule1);
        expect(bodyToCompare2).to.eql(outputRule2);
      });

      it('should bulk disable two rules and migrate their actions', async () => {
        const [connector, rule1, rule2] = await Promise.all([
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
          createRule(supertest, log, getSimpleRule('rule-1')),
          createRule(supertest, log, getSimpleRule('rule-2')),
        ]);
        await Promise.all([
          createLegacyRuleAction(supertest, rule1.id, connector.body.id),
          createLegacyRuleAction(supertest, rule2.id, connector.body.id),
        ]);

        // check for legacy sidecar action
        const sidecarActionsResults = await getLegacyActionSO(es);
        expect(sidecarActionsResults.hits.hits.length).to.eql(2);
        expect(
          sidecarActionsResults.hits.hits.map((hit) => hit?._source?.references[0].id).sort()
        ).to.eql([rule1.id, rule2.id].sort());

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { id: rule1.id, enabled: false },
              { id: rule2.id, enabled: false },
            ],
          })
          .expect(200);

        // legacy sidecar action should be gone
        const sidecarActionsPostResults = await getLegacyActionSO(es);
        expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

        // @ts-expect-error
        body.forEach((response) => {
          const bodyToCompare = removeServerGeneratedProperties(response);
          const outputRule = updateUsername(
            getSimpleRuleOutput(response.rule_id, false),
            ELASTICSEARCH_USERNAME
          );

          outputRule.actions = [
            {
              action_type_id: '.slack',
              group: 'default',
              id: connector.body.id,
              params: {
                message:
                  'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
              },
              uuid: bodyToCompare.actions[0].uuid,
              frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
            },
          ];
          outputRule.revision = 1;
          expect(bodyToCompare).to.eql(outputRule);
        });
      });

      it('should patch a single rule property of name using the auto-generated id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ id: createdBody.id, name: 'some other name' }] })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);
        outputRule.name = 'some other name';
        outputRule.revision = 1;
        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should not change the revision of a rule when it patches only enabled', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'rule-1', enabled: false }] })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.enabled = false;

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should change the revision of a rule when it patches enabled and another property', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's enabled to false and another property
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'rule-1', severity: 'low', enabled: false }] })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.enabled = false;
        outputRule.severity = 'low';
        outputRule.revision = 1;

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should not change other properties when it does patches', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch a simple rule's timeline_title
        await securitySolutionApi
          .bulkPatchRules({
            body: [{ rule_id: 'rule-1', timeline_title: 'some title', timeline_id: 'some id' }],
          })
          .expect(200);

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'rule-1', name: 'some other name' }] })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.name = 'some other name';
        outputRule.timeline_title = 'some title';
        outputRule.timeline_id = 'some id';
        outputRule.revision = 2;

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare).to.eql(outputRule);
      });

      it('should return a 200 but give a 404 in the message if it is given a fake id', async () => {
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [{ id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d', name: 'some other name' }],
          })
          .expect(200);

        expect(body).to.eql([
          {
            id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d',
            error: {
              status_code: 404,
              message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
            },
          },
        ]);
      });

      it('should return a 200 but give a 404 in the message if it is given a fake rule_id', async () => {
        const { body } = await securitySolutionApi
          .bulkPatchRules({ body: [{ rule_id: 'fake_id', name: 'some other name' }] })
          .expect(200);

        expect(body).to.eql([
          {
            rule_id: 'fake_id',
            error: { status_code: 404, message: 'rule_id: "fake_id" not found' },
          },
        ]);
      });

      it('should patch one rule property and give an error about a second fake rule_id', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch one rule name and give a fake id for the second
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { rule_id: 'rule-1', name: 'some other name' },
              { rule_id: 'fake_id', name: 'some other name' },
            ],
          })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.name = 'some other name';
        outputRule.revision = 1;

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect([bodyToCompare, body[1]]).to.eql([
          outputRule,
          {
            error: {
              message: 'rule_id: "fake_id" not found',
              status_code: 404,
            },
            rule_id: 'fake_id',
          },
        ]);
      });

      it('should patch one rule property and give an error about a second fake id', async () => {
        const createdBody = await createRule(supertest, log, getSimpleRule('rule-1'));

        // patch one rule name and give a fake id for the second
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { id: createdBody.id, name: 'some other name' },
              { id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d', name: 'some other name' },
            ],
          })
          .expect(200);

        const outputRule = updateUsername(getSimpleRuleOutput(), ELASTICSEARCH_USERNAME);

        outputRule.name = 'some other name';
        outputRule.revision = 1;

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect([bodyToCompare, body[1]]).to.eql([
          outputRule,
          {
            error: {
              message: 'id: "5096dec6-b6b9-4d8d-8f93-6c2602079d9d" not found',
              status_code: 404,
            },
            id: '5096dec6-b6b9-4d8d-8f93-6c2602079d9d',
          },
        ]);
      });

      it('should return a 200 ok but have a 409 conflict if we attempt to patch the rule, which use existing attached rule defult list', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));
        const ruleWithException = await createRule(supertest, log, {
          ...getSimpleRule('rule-2'),
          exceptions_list: [
            {
              id: '2',
              list_id: '123',
              namespace_type: 'single',
              type: ExceptionListTypeEnum.RULE_DEFAULT,
            },
          ],
        });

        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              {
                rule_id: 'rule-1',
                exceptions_list: [
                  {
                    id: '2',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.RULE_DEFAULT,
                  },
                ],
              },
            ],
          })
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: `default exception list for rule: rule-1 already exists in rule(s): ${ruleWithException.id}`,
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
        ]);
      });

      it('should return a 409 if several rules has the same exception rule default list', async () => {
        await createRule(supertest, log, getSimpleRule('rule-1'));
        await createRule(supertest, log, getSimpleRule('rule-2'));

        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              {
                rule_id: 'rule-1',
                exceptions_list: [
                  {
                    id: '2',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.RULE_DEFAULT,
                  },
                ],
              },
              {
                rule_id: 'rule-2',
                exceptions_list: [
                  {
                    id: '2',
                    list_id: '123',
                    namespace_type: 'single',
                    type: ExceptionListTypeEnum.RULE_DEFAULT,
                  },
                ],
              },
            ],
          })
          .expect(200);

        expect(body).to.eql([
          {
            error: {
              message: 'default exceptions list 2 for rule rule-1 is duplicated',
              status_code: 409,
            },
            rule_id: 'rule-1',
          },
          {
            error: {
              message: 'default exceptions list 2 for rule rule-2 is duplicated',
              status_code: 409,
            },
            rule_id: 'rule-2',
          },
        ]);
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
      });

      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('errors if trying to patch investigation fields using legacy format', async () => {
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              {
                rule_id: ruleWithLegacyInvestigationField.params.ruleId,
                name: 'some other name',
                // @ts-expect-error we are testing the invalid payload
                investigation_fields: ['foobar'],
              },
            ],
          })
          .expect(400);

        expect(body.message).to.eql(
          '[request body]: 0.investigation_fields: Expected object, received array, 0.investigation_fields: Expected object, received array, 0.investigation_fields: Expected object, received array, 0.investigation_fields: Expected object, received array, 0.investigation_fields: Expected object, received array, and 3 more'
        );
      });

      it('should patch a rule with a legacy investigation field and transform field in response', async () => {
        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              { rule_id: ruleWithLegacyInvestigationField.params.ruleId, name: 'some other name' },
            ],
          })
          .expect(200);

        const bodyToCompareLegacyField = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompareLegacyField.investigation_fields).to.eql({
          field_names: ['client.address', 'agent.name'],
        });
        expect(bodyToCompareLegacyField.name).to.eql('some other name');

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
          body[0].id
        );
        expect(isInvestigationFieldMigratedInSo).to.eql(false);
      });

      it('should patch a rule with a legacy investigation field - empty array - and transform field in response', async () => {
        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              {
                rule_id: ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId,
                name: 'some other name 2',
              },
            ],
          })
          .expect(200);

        const bodyToCompareLegacyFieldEmptyArray = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompareLegacyFieldEmptyArray.investigation_fields).to.eql(undefined);
        expect(bodyToCompareLegacyFieldEmptyArray.name).to.eql('some other name 2');

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
          body[0].id
        );
        expect(isInvestigationFieldMigratedInSo).to.eql(false);
      });

      it('should patch a rule with an investigation field', async () => {
        await createRule(supertest, log, {
          ...getSimpleRule('rule-1'),
          investigation_fields: {
            field_names: ['host.name'],
          },
        });

        // patch a simple rule's name
        const { body } = await securitySolutionApi
          .bulkPatchRules({
            body: [
              {
                rule_id: 'rule-1',
                name: 'some other name 3',
              },
            ],
          })
          .expect(200);

        const bodyToCompare = removeServerGeneratedProperties(body[0]);
        expect(bodyToCompare.investigation_fields).to.eql({
          field_names: ['host.name'],
        });
        expect(bodyToCompare.name).to.eql('some other name 3');
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, body[0].id);
        expect(ruleSO?.alert?.params?.investigationFields).to.eql({
          field_names: ['host.name'],
        });
      });
    });
  });
};
