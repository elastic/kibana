/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getCreateEsqlRulesSchemaMock } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema/mocks';
import {
  BulkActionEditTypeEnum,
  BulkActionTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
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
  getCustomQueryRuleParams,
  getLegacyActionSO,
  getRuleSavedObjectWithLegacyInvestigationFields,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
  getRuleSOById,
  getWebHookAction,
} from '../../../utils';

// Rule's interval must be less or equal rule action's interval
const MINIMUM_RULE_INTERVAL_FOR_LEGACY_ACTION = '1h';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const es = getService('es');
  const log = getService('log');

  const createConnector = async (payload: Record<string, unknown>) =>
    (
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send(payload)
        .expect(200)
    ).body;

  const createWebHookConnector = () => createConnector(getWebHookAction());

  // Failing: See https://github.com/elastic/kibana/issues/196462
  describe.skip('@ess perform_bulk_action - ESS specific logic', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('should delete rules and any associated legacy actions', async () => {
      const ruleId = 'ruleId';
      const [connector, rule] = await Promise.all([
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

        createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: ruleId,
            interval: MINIMUM_RULE_INTERVAL_FOR_LEGACY_ACTION,
          })
        ),
      ]);
      await createLegacyRuleAction(supertest, rule.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).toBe(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).toBe(rule.id);

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          body: { query: '', action: BulkActionTypeEnum.delete },
          query: {},
        })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the deleted rule is returned with the response
      expect(body.attributes.results.deleted[0].name).toEqual(rule.name);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).toBe(0);

      // Check that the updates have been persisted
      await securitySolutionApi.readRule({ query: { rule_id: ruleId } }).expect(404);
    });

    it('should enable rules and migrate actions', async () => {
      const ruleId = 'ruleId';
      const [connector, rule] = await Promise.all([
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
        createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: ruleId,
            index: ['*'],
            interval: MINIMUM_RULE_INTERVAL_FOR_LEGACY_ACTION,
            enabled: false,
          })
        ),
      ]);
      await createLegacyRuleAction(supertest, rule.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).toBe(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).toBe(rule.id);

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          body: { query: '', action: BulkActionTypeEnum.enable },
          query: {},
        })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).toBeTruthy();

      // Check that the updates have been persisted
      const { body: ruleBody } = await securitySolutionApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).toBe(0);

      expect(ruleBody.enabled).toBeTruthy();
      expect(ruleBody.actions).toEqual([
        {
          action_type_id: '.slack',
          group: 'default',
          id: connector.body.id,
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          uuid: expect.any(String),
          frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
        },
      ]);
      // we want to ensure rule is executing successfully, to prevent any AAD issues related to partial update of rule SO
      await waitForRuleSuccess({ id: rule.id, supertest, log });
    });

    it('should disable rules and migrate actions', async () => {
      const ruleId = 'ruleId';
      const [connector, rule] = await Promise.all([
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
        createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: ruleId,
            interval: MINIMUM_RULE_INTERVAL_FOR_LEGACY_ACTION,
            enabled: true,
          })
        ),
      ]);
      await createLegacyRuleAction(supertest, rule.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).toBe(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).toBe(rule.id);

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          body: { query: '', action: BulkActionTypeEnum.disable },
          query: {},
        })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).toBeFalsy();

      // Check that the updates have been persisted
      const { body: ruleBody } = await securitySolutionApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);

      // legacy sidecar action should be gone
      const sidecarActionsPostResults = await getLegacyActionSO(es);
      expect(sidecarActionsPostResults.hits.hits.length).toBe(0);

      expect(ruleBody.enabled).toBeFalsy();
      expect(ruleBody.actions).toEqual([
        {
          action_type_id: '.slack',
          group: 'default',
          id: connector.body.id,
          params: {
            message: 'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          uuid: expect.any(String),
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
        createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: ruleId,
            interval: MINIMUM_RULE_INTERVAL_FOR_LEGACY_ACTION,
          })
        ),
      ]);
      await createLegacyRuleAction(supertest, ruleToDuplicate.id, connector.body.id);

      // check for legacy sidecar action
      const sidecarActionsResults = await getLegacyActionSO(es);
      expect(sidecarActionsResults.hits.hits.length).toBe(1);
      expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).toBe(
        ruleToDuplicate.id
      );

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          body: {
            query: '',
            action: BulkActionTypeEnum.duplicate,
            duplicate: { include_exceptions: false, include_expired_exceptions: false },
          },
          query: {},
        })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the duplicated rule is returned with the response
      expect(body.attributes.results.created[0].name).toBe(`${ruleToDuplicate.name} [Duplicate]`);

      // Check that the updates have been persisted
      const { body: rulesResponse } = await securitySolutionApi
        .findRules({ query: {} })
        .expect(200);

      expect(rulesResponse.total).toBe(2);

      rulesResponse.data.forEach((rule: RuleResponse) => {
        expect(rule.actions).toEqual([
          expect.objectContaining({
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
          }),
        ]);
      });
    });

    it('should set rule_source to "internal" when duplicating a rule', async () => {
      await createRule(supertest, log, getCustomQueryRuleParams());

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          body: {
            query: '',
            action: BulkActionTypeEnum.duplicate,
            duplicate: { include_exceptions: false, include_expired_exceptions: false },
          },
          query: {},
        })
        .expect(200);

      // Check that the duplicated rule is returned with the correct rule_source
      expect(body.attributes.results.created[0].rule_source).toEqual({
        type: 'internal',
      });
    });

    describe('edit action', () => {
      describe('index patterns actions', () => {
        it('should return error if index patterns action is applied to ES|QL rule', async () => {
          const esqlRule = await createRule(supertest, log, getCreateEsqlRulesSchemaMock());

          const { body } = await securitySolutionApi
            .performRulesBulkAction({
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

          expect(body.attributes.summary).toEqual({
            failed: 1,
            skipped: 0,
            succeeded: 0,
            total: 1,
          });
          expect(body.attributes.errors[0]).toEqual({
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
          createRule(
            supertest,
            log,
            getCustomQueryRuleParams({
              rule_id: ruleId,
              interval: MINIMUM_RULE_INTERVAL_FOR_LEGACY_ACTION,
            })
          ),
        ]);
        await createLegacyRuleAction(supertest, ruleToDuplicate.id, connector.body.id);

        // check for legacy sidecar action
        const sidecarActionsResults = await getLegacyActionSO(es);
        expect(sidecarActionsResults.hits.hits.length).toBe(1);
        expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).toBe(
          ruleToDuplicate.id
        );

        const { body: setTagsBody } = await securitySolutionApi
          .performRulesBulkAction({
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
          })
          .expect(200);

        expect(setTagsBody.attributes.summary).toEqual({
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

        expect(sidecarActionsPostResults.hits.hits.length).toBe(0);
        expect(setTagsRule.tags).toEqual(['reset-tag']);
        expect(setTagsRule.actions).toEqual([
          {
            action_type_id: '.slack',
            group: 'default',
            id: connector.body.id,
            params: {
              message:
                'Hourly\nRule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            uuid: expect.any(String),
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
              createRule(
                supertest,
                log,
                getCustomQueryRuleParams({
                  rule_id: ruleId,
                  interval: MINIMUM_RULE_INTERVAL_FOR_LEGACY_ACTION,
                })
              ),
            ]);
            // create a new connector
            const webHookConnector = await createWebHookConnector();

            await createLegacyRuleAction(supertest, createdRule.id, connector.body.id);

            // check for legacy sidecar action
            const sidecarActionsResults = await getLegacyActionSO(es);
            expect(sidecarActionsResults.hits.hits.length).toBe(1);
            expect(sidecarActionsResults.hits.hits[0]?._source?.references[0].id).toBe(
              createdRule.id
            );

            const { body } = await securitySolutionApi
              .performRulesBulkAction({
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
                uuid: expect.any(String),
                frequency: { summary: true, throttle: '1h', notifyWhen: 'onThrottleInterval' },
              },
            ];

            // Check that the updated rule is returned with the response
            expect(body.attributes.results.updated[0].actions).toEqual(expectedRuleActions);

            // Check that the updates have been persisted
            const { body: readRule } = await securitySolutionApi
              .readRule({ query: { rule_id: ruleId } })
              .expect(200);

            expect(readRule.actions).toEqual(expectedRuleActions);

            // Sidecar should be removed
            const sidecarActionsPostResults = await getLegacyActionSO(es);
            expect(sidecarActionsPostResults.hits.hits.length).toBe(0);
          });
        });
      });
    });

    describe('legacy investigation fields', () => {
      it('should export rules with legacy investigation_fields and transform legacy field in response', async () => {
        const [
          ruleWithLegacyInvestigationField,
          ruleWithLegacyInvestigationFieldEmptyArray,
          ruleWithIntendedInvestigationField,
        ] = await Promise.all([
          createRuleThroughAlertingEndpoint(
            supertest,
            getRuleSavedObjectWithLegacyInvestigationFields()
          ),
          createRuleThroughAlertingEndpoint(
            supertest,
            getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray()
          ),
          createRule(supertest, log, {
            ...getCustomQueryRuleParams({ rule_id: 'rule-with-investigation-field' }),
            name: 'Test investigation fields object',
            investigation_fields: { field_names: ['host.name'] },
          }),
        ]);

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
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
        expect(exportedRuleWithLegacyInvestigationField.investigation_fields).toEqual({
          field_names: ['client.address', 'agent.name'],
        });

        const exportedRuleWithLegacyInvestigationFieldEmptyArray = exportedRules.find(
          (rule) => rule.id === ruleWithLegacyInvestigationFieldEmptyArray.id
        );
        expect(exportedRuleWithLegacyInvestigationFieldEmptyArray.investigation_fields).toEqual(
          undefined
        );

        const exportedRuleWithInvestigationField = exportedRules.find(
          (rule) => rule.id === ruleWithIntendedInvestigationField.id
        );
        expect(exportedRuleWithInvestigationField.investigation_fields).toEqual({
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

        expect(isInvestigationFieldMigratedInSo).toBeFalsy();

        const exportDetails = JSON.parse(exportDetailsJson);
        expect(exportDetails).toEqual({
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
        const [ruleWithLegacyInvestigationField, ruleWithLegacyInvestigationFieldEmptyArray] =
          await Promise.all([
            createRuleThroughAlertingEndpoint(
              supertest,
              getRuleSavedObjectWithLegacyInvestigationFields()
            ),
            createRuleThroughAlertingEndpoint(
              supertest,
              getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray()
            ),
            createRule(supertest, log, {
              ...getCustomQueryRuleParams({ rule_id: 'rule-with-investigation-field' }),
              name: 'Test investigation fields object',
              investigation_fields: { field_names: ['host.name'] },
            }),
          ]);

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            body: { query: '', action: BulkActionTypeEnum.delete },
            query: {},
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 3, total: 3 });

        // Check that the deleted rule is returned with the response
        const names = body.attributes.results.deleted.map(
          (returnedRule: RuleResponse) => returnedRule.name
        );
        expect(names.includes('Test investigation fields')).toBeTruthy();
        expect(names.includes('Test investigation fields empty array')).toBeTruthy();
        expect(names.includes('Test investigation fields object')).toBeTruthy();

        const ruleWithLegacyField = body.attributes.results.deleted.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationField.params.ruleId
        );

        expect(ruleWithLegacyField.investigation_fields).toEqual({
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
        const [ruleWithLegacyInvestigationField, ruleWithLegacyInvestigationFieldEmptyArray] =
          await Promise.all([
            createRuleThroughAlertingEndpoint(
              supertest,
              getRuleSavedObjectWithLegacyInvestigationFields({ enabled: false })
            ),
            createRuleThroughAlertingEndpoint(
              supertest,
              getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray({ enabled: false })
            ),
            createRule(supertest, log, {
              ...getCustomQueryRuleParams({ rule_id: 'rule-with-investigation-field' }),
              name: 'Test investigation fields object',
              investigation_fields: { field_names: ['host.name'] },
            }),
          ]);

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            body: { query: '', action: BulkActionTypeEnum.enable },
            query: {},
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 3, total: 3 });

        // Check that the updated rule is returned with the response
        // and field transformed on response
        expect(
          body.attributes.results.updated.every(
            (returnedRule: RuleResponse) => returnedRule.enabled
          )
        ).toBeTruthy();

        const ruleWithLegacyField = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationField.params.ruleId
        );
        expect(ruleWithLegacyField.investigation_fields).toEqual({
          field_names: ['client.address', 'agent.name'],
        });

        const ruleWithEmptyArray = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId
        );
        expect(ruleWithEmptyArray.investigation_fields).toBeUndefined();

        const ruleWithIntendedType = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) => returnedRule.rule_id === 'rule-with-investigation-field'
        );
        expect(ruleWithIntendedType.investigation_fields).toEqual({ field_names: ['host.name'] });
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

        expect(isInvestigationFieldMigratedInSo).toBeFalsy();
        expect(ruleSO?.alert?.enabled).toBeTruthy();

        const {
          hits: {
            hits: [{ _source: ruleSO2 }],
          },
        } = await getRuleSOById(es, ruleWithEmptyArray.id);
        expect(ruleSO2?.alert?.params?.investigationFields).toEqual([]);
        expect(ruleSO?.alert?.enabled).toBeTruthy();

        const {
          hits: {
            hits: [{ _source: ruleSO3 }],
          },
        } = await getRuleSOById(es, ruleWithIntendedType.id);
        expect(ruleSO3?.alert?.params?.investigationFields).toEqual({ field_names: ['host.name'] });
        expect(ruleSO?.alert?.enabled).toBeTruthy();
      });

      it('should disable rules with legacy investigation fields and transform legacy field in response', async () => {
        const [ruleWithLegacyInvestigationField, ruleWithLegacyInvestigationFieldEmptyArray] =
          await Promise.all([
            createRuleThroughAlertingEndpoint(
              supertest,
              getRuleSavedObjectWithLegacyInvestigationFields({ enabled: true })
            ),
            createRuleThroughAlertingEndpoint(
              supertest,
              getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray({ enabled: false })
            ),
            createRule(supertest, log, {
              ...getCustomQueryRuleParams({ rule_id: 'rule-with-investigation-field' }),
              name: 'Test investigation fields object',
              investigation_fields: { field_names: ['host.name'] },
            }),
          ]);

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            body: { query: '', action: BulkActionTypeEnum.disable },
            query: {},
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 3, total: 3 });

        // Check that the updated rule is returned with the response
        // and field transformed on response
        expect(
          body.attributes.results.updated.every(
            (returnedRule: RuleResponse) => !returnedRule.enabled
          )
        ).toBeTruthy();

        const ruleWithLegacyField = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationField.params.ruleId
        );
        expect(ruleWithLegacyField.investigation_fields).toEqual({
          field_names: ['client.address', 'agent.name'],
        });

        const ruleWithEmptyArray = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId
        );
        expect(ruleWithEmptyArray.investigation_fields).toBeUndefined();

        const ruleWithIntendedType = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) => returnedRule.rule_id === 'rule-with-investigation-field'
        );
        expect(ruleWithIntendedType.investigation_fields).toEqual({ field_names: ['host.name'] });

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
        expect(isInvestigationFieldForRuleWithLegacyFieldMigratedInSo).toBeFalsy();

        const isInvestigationFieldForRuleWithEmptyArraydMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            {
              field_names: [],
            },
            es,
            ruleWithEmptyArray.id
          );
        expect(isInvestigationFieldForRuleWithEmptyArraydMigratedInSo).toBeFalsy();

        const isInvestigationFieldForRuleWithIntendedTypeMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: ['host.name'] },
            es,
            ruleWithIntendedType.id
          );
        expect(isInvestigationFieldForRuleWithIntendedTypeMigratedInSo).toBeTruthy();
      });

      it('should duplicate rules with legacy investigation fields and transform field in response', async () => {
        const [
          ruleWithLegacyInvestigationField,
          ruleWithLegacyInvestigationFieldEmptyArray,
          ruleWithIntendedInvestigationField,
        ] = await Promise.all([
          createRuleThroughAlertingEndpoint(
            supertest,
            getRuleSavedObjectWithLegacyInvestigationFields()
          ),
          createRuleThroughAlertingEndpoint(
            supertest,
            getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray()
          ),
          createRule(supertest, log, {
            ...getCustomQueryRuleParams({ rule_id: 'rule-with-investigation-field' }),
            name: 'Test investigation fields object',
            investigation_fields: { field_names: ['host.name'] },
          }),
        ]);

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            body: {
              query: '',
              action: BulkActionTypeEnum.duplicate,
              duplicate: { include_exceptions: false, include_expired_exceptions: false },
            },
            query: {},
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 3, total: 3 });

        // Check that the duplicated rule is returned with the response
        const names = body.attributes.results.created.map(
          (returnedRule: RuleResponse) => returnedRule.name
        );
        expect(names.includes('Test investigation fields [Duplicate]')).toBeTruthy();
        expect(names.includes('Test investigation fields empty array [Duplicate]')).toBeTruthy();
        expect(names.includes('Test investigation fields object [Duplicate]')).toBeTruthy();

        // Check that the updates have been persisted
        const { body: rulesResponse } = await await securitySolutionApi
          .findRules({ query: {} })
          .expect(200);

        expect(rulesResponse.total).toBe(6);

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
        expect(isInvestigationFieldForRuleWithLegacyFieldMigratedInSo).toBeFalsy();

        const isInvestigationFieldForRuleWithEmptyArrayMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: [] },
            es,
            ruleWithEmptyArray.id
          );
        expect(isInvestigationFieldForRuleWithEmptyArrayMigratedInSo).toBeFalsy();

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
        expect(isInvestigationFieldForRuleWithIntendedTypeInSo).toBeTruthy();

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
        expect(isInvestigationFieldForOriginalRuleWithLegacyFieldMigratedInSo).toBeFalsy();

        const isInvestigationFieldForOriginalRuleWithEmptyArrayMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: [] },
            es,
            ruleWithLegacyInvestigationFieldEmptyArray.id
          );
        expect(isInvestigationFieldForOriginalRuleWithEmptyArrayMigratedInSo).toBeFalsy();

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
        expect(isInvestigationFieldForOriginalRuleWithIntendedTypeInSo).toBeTruthy();
      });

      it('should edit rules with legacy investigation fields', async () => {
        const [ruleWithLegacyInvestigationField, ruleWithLegacyInvestigationFieldEmptyArray] =
          await Promise.all([
            createRuleThroughAlertingEndpoint(
              supertest,
              getRuleSavedObjectWithLegacyInvestigationFields()
            ),
            createRuleThroughAlertingEndpoint(
              supertest,
              getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray()
            ),
            createRule(supertest, log, {
              ...getCustomQueryRuleParams({ rule_id: 'rule-with-investigation-field' }),
              name: 'Test investigation fields object',
              investigation_fields: { field_names: ['host.name'] },
            }),
          ]);

        const { body } = await securitySolutionApi.performRulesBulkAction({
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
        expect(body.attributes.summary).toEqual({
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
        expect(ruleWithLegacyField.investigation_fields).toEqual({
          field_names: ['client.address', 'agent.name'],
        });
        expect(ruleWithLegacyField.tags).toEqual(['reset-tag']);

        const ruleWithEmptyArray = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) =>
            returnedRule.rule_id === ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId
        );
        expect(ruleWithEmptyArray.investigation_fields).toBeUndefined();
        expect(ruleWithEmptyArray.tags).toEqual(['reset-tag']);

        const ruleWithIntendedType = body.attributes.results.updated.find(
          (returnedRule: RuleResponse) => returnedRule.rule_id === 'rule-with-investigation-field'
        );
        expect(ruleWithIntendedType.investigation_fields).toEqual({ field_names: ['host.name'] });
        expect(ruleWithIntendedType.tags).toEqual(['reset-tag']);

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
        expect(isInvestigationFieldForRuleWithLegacyFieldMigratedInSo).toBeFalsy();

        const isInvestigationFieldForRuleWithEmptyArrayFieldMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: [] },
            es,
            ruleWithLegacyInvestigationFieldEmptyArray.id
          );
        expect(isInvestigationFieldForRuleWithEmptyArrayFieldMigratedInSo).toBeFalsy();

        const isInvestigationFieldForRuleWithIntendedTypeMigratedInSo =
          await checkInvestigationFieldSoValue(
            undefined,
            { field_names: ['host.name'] },
            es,
            ruleWithIntendedType.id
          );
        expect(isInvestigationFieldForRuleWithIntendedTypeMigratedInSo).toBeTruthy();
      });
    });
  });
};
