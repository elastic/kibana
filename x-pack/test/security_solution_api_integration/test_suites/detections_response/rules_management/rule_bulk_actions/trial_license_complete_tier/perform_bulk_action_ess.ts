/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '@kbn/alerting-plugin/common';
import expect from '@kbn/expect';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getCreateEsqlRulesSchemaMock } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema/mocks';
import {
  BulkActionEditTypeEnum,
  BulkActionTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import {
  createRule,
  deleteAllRules,
  waitForRuleSuccess,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  binaryToString,
  checkInvestigationFieldSoValue,
  createLegacyRuleAction,
  createRuleThroughAlertingEndpoint,
  getLegacyActionSO,
  getRuleSavedObjectWithLegacyInvestigationFields,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
  getRuleSOById,
  getSimpleRule,
  getWebHookAction,
} from '../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const es = getService('es');
  const log = getService('log');

  const createConnector = async (payload: Record<string, unknown>) =>
    (await supertest.post('/api/actions/action').set('kbn-xsrf', 'true').send(payload).expect(200))
      .body;

  const createWebHookConnector = () => createConnector(getWebHookAction());

  // Failing: See https://github.com/elastic/kibana/issues/173804
  describe('@ess perform_bulk_action - ESS specific logic', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('should delete rules and any associated legacy actions', async () => {
      const ruleId = 'ruleId';
      const [connector, rule1] = await Promise.all([
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
        createRule(supertest, log, getSimpleRule(ruleId, false)),
      ]);
      await createLegacyRuleAction(supertest, rule1.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).to.eql(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(rule1.id);

      const { body } = await securitySolutionApi
        .performBulkAction({
          body: { query: '', action: BulkActionTypeEnum.delete },
          query: {},
        })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the deleted rule is returned with the response
      expect(body.attributes.results.deleted[0].name).to.eql(rule1.name);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

      // Check that the updates have been persisted
      await securitySolutionApi.readRule({ query: { rule_id: ruleId } }).expect(404);
    });

    it('should enable rules and migrate actions', async () => {
      const ruleId = 'ruleId';
      const [connector, rule1] = await Promise.all([
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
        createRule(supertest, log, getSimpleRule(ruleId, false)),
      ]);
      await createLegacyRuleAction(supertest, rule1.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).to.eql(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(rule1.id);

      const { body } = await securitySolutionApi
        .performBulkAction({
          body: { query: '', action: BulkActionTypeEnum.enable },
          query: {},
        })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).to.eql(true);

      // Check that the updates have been persisted
      const { body: ruleBody } = await securitySolutionApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

      expect(ruleBody.enabled).to.eql(true);
      expect(ruleBody.actions).to.eql([
        {
          action_type_id: '.slack',
          group: 'default',
          id: connector.body.id,
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          uuid: ruleBody.actions[0].uuid,
          frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
        },
      ]);
      // we want to ensure rule is executing successfully, to prevent any AAD issues related to partial update of rule SO
      await waitForRuleSuccess({ id: rule1.id, supertest, log });
    });

    it('should disable rules and migrate actions', async () => {
      const ruleId = 'ruleId';
      const [connector, rule1] = await Promise.all([
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
        createRule(supertest, log, getSimpleRule(ruleId, true)),
      ]);
      await createLegacyRuleAction(supertest, rule1.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).to.eql(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(rule1.id);

      const { body } = await securitySolutionApi
        .performBulkAction({
          body: { query: '', action: BulkActionTypeEnum.disable },
          query: {},
        })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).to.eql(false);

      // Check that the updates have been persisted
      const { body: ruleBody } = await securitySolutionApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

      expect(ruleBody.enabled).to.eql(false);
      expect(ruleBody.actions).to.eql([
        {
          action_type_id: '.slack',
          group: 'default',
          id: connector.body.id,
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          uuid: ruleBody.actions[0].uuid,
          frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
        },
      ]);
    });

    it('should duplicate rule with a legacy action', async () => {
      const ruleId = 'ruleId';
      const [connector, ruleToDuplicate] = await Promise.all([
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
        createRule(supertest, log, getSimpleRule(ruleId, true)),
      ]);
      await createLegacyRuleAction(supertest, ruleToDuplicate.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).to.eql(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(
        ruleToDuplicate.id
      );

      const { body } = await securitySolutionApi
        .performBulkAction({
          body: {
            query: '',
            action: BulkActionTypeEnum.duplicate,
            duplicate: { include_exceptions: false, include_expired_exceptions: false },
          },
          query: {},
        })
        .expect(200);

      expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the duplicated rule is returned with the response
      expect(body.attributes.results.created[0].name).to.eql(`${ruleToDuplicate.name} [Duplicate]`);

      // Check that the updates have been persisted
      const { body: rulesResponse } = await securitySolutionApi
        .findRules({ query: {} })
        .expect(200);

      expect(rulesResponse.total).to.eql(2);

      rulesResponse.data.forEach((rule: RuleResponse) => {
        const uuid = rule.actions[0].uuid;
        expect(rule.actions).to.eql([
          {
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            ...(uuid ? { uuid } : {}),
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          },
        ]);
      });
    });

    describe('edit action', () => {
      describe('index patterns actions', () => {
        it('should return error if index patterns action is applied to ES|QL rule', async () => {
          const esqlRule = await createRule(supertest, log, getCreateEsqlRulesSchemaMock());

          const { body } = await securitySolutionApi
            .performBulkAction({
              body: {
                ids: [esqlRule.id],
                action: BulkActionTypeEnum.edit,
                [BulkActionTypeEnum.edit]: [
                  {
                    type: BulkActionEditTypeEnum.add_index_patterns,
                    value: ['index-*'],
                  },
                ],
              },
              query: {},
            })
            .expect(500);

          expect(body.attributes.summary).to.eql({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
          expect(body.attributes.errors[0]).to.eql({
            message:
              "Index patterns can't be added. ES|QL rule doesn't have index patterns property",
            status_code: 500,
            rules: [
              {
                id: esqlRule.id,
                name: esqlRule.name,
              },
            ],
          });
        });
      });

      it('should migrate legacy actions on edit', async () => {
        const ruleId = 'ruleId';
        const [connector, ruleToDuplicate] = await Promise.all([
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
          createRule(supertest, log, getSimpleRule(ruleId, true)),
        ]);
        await createLegacyRuleAction(supertest, ruleToDuplicate.id, connector.body.id);

        // check for legacy sidecar action
        const sidecarActionsResults = await getLegacyActionSO(es);
        expect(sidecarActionsResults.hits.hits.length).to.eql(1);
        expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(
          ruleToDuplicate.id
        );

        const { body: setTagsBody } = await securitySolutionApi.performBulkAction({
          body: {
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_tags,
                value: ['reset-tag'],
              },
            ],
          },
          query: {},
        });
        expect(setTagsBody.attributes.summary).to.eql({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        // Check that the updates have been persisted
        const { body: setTagsRule } = await securitySolutionApi
          .readRule({ query: { rule_id: ruleId } })
          .expect(200);

        // Sidecar should be removed
        const sidecarActionsPostResults = await getLegacyActionSO(es);
        expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);

        expect(setTagsRule.tags).to.eql(['reset-tag']);

        expect(setTagsRule.actions).to.eql([
          {
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            uuid: setTagsRule.actions[0].uuid,
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          },
        ]);
      });

      describe('rule actions', () => {
        const webHookActionMock = {
          group: 'default',
          params: {
            body: '{"test":"action to be saved in a rule"}',
          },
        };

        describe('set_rule_actions', () => {
          it('should migrate legacy actions on edit when actions edited', async () => {
            const ruleId = 'ruleId';
            const [connector, createdRule] = await Promise.all([
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
              createRule(supertest, log, getSimpleRule(ruleId, true)),
            ]);
            // create a new connector
            const webHookConnector = await createWebHookConnector();

            await createLegacyRuleAction(supertest, createdRule.id, connector.body.id);

            // check for legacy sidecar action
            const sidecarActionsResults = await getLegacyActionSO(es);
            expect(sidecarActionsResults.hits.hits.length).to.eql(1);
            expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).to.eql(
              createdRule.id
            );

            const { body } = await securitySolutionApi
              .performBulkAction({
                body: {
                  ids: [createdRule.id],
                  action: BulkActionTypeEnum.edit,
                  [BulkActionTypeEnum.edit]: [
                    {
                      type: BulkActionEditTypeEnum.set_rule_actions,
                      value: {
                        throttle: '1h',
                        actions: [
                          {
                            ...webHookActionMock,
                            id: webHookConnector.id,
                          },
                        ],
                      },
                    },
                  ],
                },
                query: {},
              })
              .expect(200);

            const expectedRuleActions = [
              {
                ...webHookActionMock,
                id: webHookConnector.id,
                action_type_id: '.webhook',
                uuid: body.attributes.results.updated[0].actions[0].uuid,
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ];

            // Check that the updated rule is returned with the response
            expect(body.attributes.results.updated[0].actions).to.eql(expectedRuleActions);

            // Check that the updates have been persisted
            const { body: readRule } = await securitySolutionApi
              .readRule({ query: { rule_id: ruleId } })
              .expect(200);

            expect(readRule.actions).to.eql(expectedRuleActions);

            // Sidecar should be removed
            const sidecarActionsPostResults = await getLegacyActionSO(es);
            expect(sidecarActionsPostResults.hits.hits.length).to.eql(0);
          });
        });
      });
    });

    describe('legacy investigation fields', () => {
      let ruleWithLegacyInvestigationField: Rule<BaseRuleParams>;
      let ruleWithLegacyInvestigationFieldEmptyArray: Rule<BaseRuleParams>;
      let ruleWithIntendedInvestigationField: RuleResponse;

      beforeEach(async () => {
        ruleWithLegacyInvestigationField = await createRuleThroughAlertingEndpoint(
          supertest,
          getRuleSavedObjectWithLegacyInvestigationFields()
        );

        ruleWithLegacyInvestigationFieldEmptyArray = await createRuleThroughAlertingEndpoint(
          supertest,
          getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray()
        );

        ruleWithIntendedInvestigationField = await createRule(supertest, log, {
          ...getSimpleRule('rule-with-investigation-field'),
          name: 'Test investigation fields object',
          investigation_fields: { field_names: ['host.name'] },
        });
      });

      it('should export rules with legacy investigation_fields and transform legacy field in response', async () => {
        const { body } = await securitySolutionApi
          .performBulkAction({
            body: { query: '', action: BulkActionTypeEnum.export },
            query: {},
          })
          .expect(200)
          .expect('Content-Type', 'application/ndjson')
          .expect('Content-Disposition', 'attachment; filename="rules_export.ndjson"')
          .parse(binaryToString);

        const [rule1, rule2, rule3, exportDetailsJson] = body.toString().split(/\n/);
        const exportedRules = [rule1, rule2, rule3].map((rule) => JSON.parse(rule));

        const exportedRuleWithLegacyInvestigationField = exportedRules.find(
          (rule) => rule.id === ruleWithLegacyInvestigationField.id
        );
        expect(exportedRuleWithLegacyInvestigationField.investigation_fields).to.eql({
          field_names: ['client.address', 'agent.name'],
        });

        const exportedRuleWithLegacyInvestigationFieldEmptyArray = exportedRules.find(
          (rule) => rule.id === ruleWithLegacyInvestigationFieldEmptyArray.id
        );
        expect(exportedRuleWithLegacyInvestigationFieldEmptyArray.investigation_fields).to.eql(
          undefined
        );

        const exportedRuleWithInvestigationField = exportedRules.find(
          (rule) => rule.id === ruleWithIntendedInvestigationField.id
        );
        expect(exportedRuleWithInvestigationField.investigation_fields).to.eql({
          field_names: ['host.name'],
        });

        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should not include a migration on SO.
         */
        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(
          undefined,
          { field_names: ['client.address', 'agent.name'] },
          es,
          JSON.parse(rule1).id
        );

        expect(isInvestigationFieldMigratedInSo).to.eql(false);

        const exportDetails = JSON.parse(exportDetailsJson);
        expect(exportDetails).to.eql({
          exported_exception_list_count: 0,
          exported_exception_list_item_count: 0,
          exported_count: 3,
          exported_rules_count: 3,
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

      it('should delete rules with investigation fields and transform legacy field in response', async () => {
        const { body } = await securitySolutionApi
          .performBulkAction({
            body: { query: '', action: BulkActionTypeEnum.delete },
            query: {},
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 3, total: 3 });

        // Check that the deleted rule is returned with the response
        const names = body.attributes.results.deleted.map(
          (returnedRule: RuleResponse) => returnedRule.name
        );
        expect(names.includes('Test investigation fields')).to.eql(true);
        expect(names.includes('Test investigation fields empty array')).to.eql(true);
        expect(names.includes('Test investigation fields object')).to.eql(true);

        const ruleWithLegacyField = body.attributes.results.deleted.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationField.params.ruleId
        );

        expect(ruleWithLegacyField.investigation_fields).to.eql({
          field_names: ['client.address', 'agent.name'],
        });

        // Check that the updates have been persisted
        await securitySolutionApi
          .readRule({ query: { rule_id: ruleWithLegacyInvestigationField.params.ruleId } })
          .expect(404);
        await securitySolutionApi
          .readRule({
            query: { rule_id: ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId },
          })
          .expect(404);
        await securitySolutionApi
          .readRule({ query: { rule_id: 'rule-with-investigation-field' } })
          .expect(404);
      });

      it('should enable rules with legacy investigation fields and transform legacy field in response', async () => {
        const { body } = await securitySolutionApi
          .performBulkAction({
            body: { query: '', action: BulkActionTypeEnum.enable },
            query: {},
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 3, total: 3 });

        // Check that the updated rule is returned with the response
        // and field transformed on response
        expect(
          body.attributes.results.updated.every(
            (returnedRule: RuleResponse) => returnedRule.enabled
          )
        ).to.eql(true);

        const ruleWithLegacyField = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationField.params.ruleId
        );
        expect(ruleWithLegacyField.investigation_fields).to.eql({
          field_names: ['client.address', 'agent.name'],
        });

        const ruleWithEmptyArray = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId
        );
        expect(ruleWithEmptyArray.investigation_fields).to.eql(undefined);

        const ruleWithIntendedType = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) => returnedRule.rule_id === 'rule-with-investigation-field'
        );
        expect(ruleWithIntendedType.investigation_fields).to.eql({ field_names: ['host.name'] });
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should not include a migration on SO.
         */
        const {
          hits: {
            hits: [{ _source: ruleSO }],
          },
        } = await getRuleSOById(es, ruleWithLegacyField.id);

        const isInvestigationFieldMigratedInSo = await checkInvestigationFieldSoValue(ruleSO, {
          field_names: ['client.address', 'agent.name'],
        });

        expect(isInvestigationFieldMigratedInSo).to.eql(false);
        expect(ruleSO?.alert?.enabled).to.eql(true);

        const {
          hits: {
            hits: [{ _source: ruleSO2 }],
          },
        } = await getRuleSOById(es, ruleWithEmptyArray.id);
        expect(ruleSO2?.alert?.params?.investigationFields).to.eql([]);
        expect(ruleSO?.alert?.enabled).to.eql(true);

        const {
          hits: {
            hits: [{ _source: ruleSO3 }],
          },
        } = await getRuleSOById(es, ruleWithIntendedType.id);
        expect(ruleSO3?.alert?.params?.investigationFields).to.eql({ field_names: ['host.name'] });
        expect(ruleSO?.alert?.enabled).to.eql(true);
      });

      it('should disable rules with legacy investigation fields and transform legacy field in response', async () => {
        const { body } = await securitySolutionApi
          .performBulkAction({ body: { query: '', action: BulkActionTypeEnum.disable }, query: {} })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 3, total: 3 });

        // Check that the updated rule is returned with the response
        // and field transformed on response
        expect(
          body.attributes.results.updated.every(
            (returnedRule: RuleResponse) => !returnedRule.enabled
          )
        ).to.eql(true);

        const ruleWithLegacyField = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationField.params.ruleId
        );
        expect(ruleWithLegacyField.investigation_fields).to.eql({
          field_names: ['client.address', 'agent.name'],
        });

        const ruleWithEmptyArray = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId
        );
        expect(ruleWithEmptyArray.investigation_fields).to.eql(undefined);

        const ruleWithIntendedType = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) => returnedRule.rule_id === 'rule-with-investigation-field'
        );
        expect(ruleWithIntendedType.investigation_fields).to.eql({ field_names: ['host.name'] });

        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should not include a migration on SO.
         */
        const isInvestigationFieldForRuleWithLegacyFieldMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            {
              field_names: ['client.address', 'agent.name'],
            },
            es,
            ruleWithLegacyField.id
          );
        expect(isInvestigationFieldForRuleWithLegacyFieldMigratedInSo).to.eql(false);

        const isInvestigationFieldForRuleWithEmptyArraydMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            {
              field_names: [],
            },
            es,
            ruleWithEmptyArray.id
          );
        expect(isInvestigationFieldForRuleWithEmptyArraydMigratedInSo).to.eql(false);

        const isInvestigationFieldForRuleWithIntendedTypeMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: ['host.name'] },
            es,
            ruleWithIntendedType.id
          );
        expect(isInvestigationFieldForRuleWithIntendedTypeMigratedInSo).to.eql(true);
      });

      it('should duplicate rules with legacy investigation fields and transform field in response', async () => {
        const { body } = await securitySolutionApi
          .performBulkAction({
            body: {
              query: '',
              action: BulkActionTypeEnum.duplicate,
              duplicate: { include_exceptions: false, include_expired_exceptions: false },
            },
            query: {},
          })
          .expect(200);

        expect(body.attributes.summary).to.eql({ failed: 0, skipped: 0, succeeded: 3, total: 3 });

        // Check that the duplicated rule is returned with the response
        const names = body.attributes.results.created.map(
          (returnedRule: RuleResponse) => returnedRule.name
        );
        expect(names.includes('Test investigation fields [Duplicate]')).to.eql(true);
        expect(names.includes('Test investigation fields empty array [Duplicate]')).to.eql(true);
        expect(names.includes('Test investigation fields object [Duplicate]')).to.eql(true);

        // Check that the updates have been persisted
        const { body: rulesResponse } = await await securitySolutionApi
          .findRules({ query: {} })
          .expect(200);

        expect(rulesResponse.total).to.eql(6);

        const ruleWithLegacyField = body.attributes.results.created.find(
          (returnedRule: RuleResponse) =>
            returnedRule.name === 'Test investigation fields [Duplicate]'
        );
        const ruleWithEmptyArray = body.attributes.results.created.find(
          (returnedRule: RuleResponse) =>
            returnedRule.name === 'Test investigation fields empty array [Duplicate]'
        );
        const ruleWithIntendedType = body.attributes.results.created.find(
          (returnedRule: RuleResponse) =>
            returnedRule.name === 'Test investigation fields object [Duplicate]'
        );

        // DUPLICATED RULES
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, duplicated
         * rules should NOT have migrated value on write.
         */
        const isInvestigationFieldForRuleWithLegacyFieldMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: ['client.address', 'agent.name'] },
            es,
            ruleWithLegacyField.id
          );
        expect(isInvestigationFieldForRuleWithLegacyFieldMigratedInSo).to.eql(false);

        const isInvestigationFieldForRuleWithEmptyArrayMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: [] },
            es,
            ruleWithEmptyArray.id
          );
        expect(isInvestigationFieldForRuleWithEmptyArrayMigratedInSo).to.eql(false);

        /*
          It's duplicate of a rule with properly formatted "investigation fields".
          So we just check that "investigation fields" are in intended format.
          No migration needs to happen.
        */
        const isInvestigationFieldForRuleWithIntendedTypeInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: ['host.name'] },
            es,
            ruleWithIntendedType.id
          );
        expect(isInvestigationFieldForRuleWithIntendedTypeInSo).to.eql(true);

        // ORIGINAL RULES - rules selected to be duplicated
        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, the original
         * rules selected to be duplicated should not be migrated.
         */
        const isInvestigationFieldForOriginalRuleWithLegacyFieldMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: ['client.address', 'agent.name'] },
            es,
            ruleWithLegacyInvestigationField.id
          );
        expect(isInvestigationFieldForOriginalRuleWithLegacyFieldMigratedInSo).to.eql(false);

        const isInvestigationFieldForOriginalRuleWithEmptyArrayMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: [] },
            es,
            ruleWithLegacyInvestigationFieldEmptyArray.id
          );
        expect(isInvestigationFieldForOriginalRuleWithEmptyArrayMigratedInSo).to.eql(false);

        /*
          Since this rule was created with intended "investigation fields" format,
          it shouldn't change - no need to migrate.
        */
        const isInvestigationFieldForOriginalRuleWithIntendedTypeInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: ['host.name'] },
            es,
            ruleWithIntendedInvestigationField.id
          );
        expect(isInvestigationFieldForOriginalRuleWithIntendedTypeInSo).to.eql(true);
      });

      it('should edit rules with legacy investigation fields', async () => {
        const { body } = await securitySolutionApi.performBulkAction({
          body: {
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_tags,
                value: ['reset-tag'],
              },
            ],
          },
          query: {},
        });
        expect(body.attributes.summary).to.eql({
          failed: 0,
          skipped: 0,
          succeeded: 3,
          total: 3,
        });

        // Check that the updated rule is returned with the response
        // and field transformed on response
        const ruleWithLegacyField = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationField.params.ruleId
        );
        expect(ruleWithLegacyField.investigation_fields).to.eql({
          field_names: ['client.address', 'agent.name'],
        });
        expect(ruleWithLegacyField.tags).to.eql(['reset-tag']);

        const ruleWithEmptyArray = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId
        );
        expect(ruleWithEmptyArray.investigation_fields).to.eql(undefined);
        expect(ruleWithEmptyArray.tags).to.eql(['reset-tag']);

        const ruleWithIntendedType = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) => returnedRule.rule_id === 'rule-with-investigation-field'
        );
        expect(ruleWithIntendedType.investigation_fields).to.eql({ field_names: ['host.name'] });
        expect(ruleWithIntendedType.tags).to.eql(['reset-tag']);

        /**
         * Confirm type on SO so that it's clear in the tests whether it's expected that
         * the SO itself is migrated to the inteded object type, or if the transformation is
         * happening just on the response. In this case, change should not include a migration on SO.
         */
        const isInvestigationFieldForRuleWithLegacyFieldMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: ['client.address', 'agent.name'] },
            es,
            ruleWithLegacyInvestigationField.id
          );
        expect(isInvestigationFieldForRuleWithLegacyFieldMigratedInSo).to.eql(false);

        const isInvestigationFieldForRuleWithEmptyArrayFieldMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: [] },
            es,
            ruleWithLegacyInvestigationFieldEmptyArray.id
          );
        expect(isInvestigationFieldForRuleWithEmptyArrayFieldMigratedInSo).to.eql(false);

        const isInvestigationFieldForRuleWithIntendedTypeMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: ['host.name'] },
            es,
            ruleWithIntendedType.id
          );
        expect(isInvestigationFieldForRuleWithIntendedTypeMigratedInSo).to.eql(true);
      });
    });
  });
};
