/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  BulkActionTypeEnum,
  BulkActionEditTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { AlertSuppressionMissingFieldsStrategyEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema/common_attributes.gen';
import { getThresholdRuleForAlertTesting, getCustomQueryRuleParams } from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../config/services/detections_response';

import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const detectionsApi = getService('detectionsApi');

  // skips serverless MKI due to feature flag
  describe('@ess @serverless @skipInServerlessMKI perform_bulk_action suppression', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    describe('set_alert_suppression action', () => {
      it('should overwrite suppression in a rule', async () => {
        const ruleId = 'ruleId';
        const existingSuppression = {
          group_by: ['field1'],
          duration: { value: 5, unit: 'm' as const },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        };
        const suppressionToSet = {
          group_by: ['field2'],
          duration: { value: 10, unit: 'm' as const },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        };
        const resultingSuppression = {
          group_by: ['field2'],
          duration: { value: 10, unit: 'm' },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        };

        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({ rule_id: ruleId, alert_suppression: existingSuppression })
        );

        const { body: bulkEditResponse } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_alert_suppression,
                  value: suppressionToSet,
                },
              ],
            },
          })
          .expect(200);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        // Check that the updated rule is returned with the response
        expect(bulkEditResponse.attributes.results.updated[0].alert_suppression).toEqual(
          resultingSuppression
        );

        // Check that the updates have been persisted
        const { body: updatedRule } = await detectionsApi
          .readRule({
            query: { rule_id: ruleId },
          })
          .expect(200);

        expect(updatedRule.alert_suppression).toEqual(resultingSuppression);
      });

      it('should set suppression to rules without configured suppression', async () => {
        const suppressionToSet = {
          group_by: ['field2'],
        };
        const resultingSuppression = {
          group_by: ['field2'],
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        };

        await Promise.all([
          createRule(supertest, log, getCustomQueryRuleParams({ rule_id: 'id_1' })),
          createRule(supertest, log, getCustomQueryRuleParams({ rule_id: 'id_2' })),
        ]);

        const { body: bulkEditResponse } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_alert_suppression,
                  value: suppressionToSet,
                },
              ],
            },
          })
          .expect(200);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 2,
          total: 2,
        });

        // Check that the updated rule is returned with the response
        expect(bulkEditResponse.attributes.results.updated[0].alert_suppression).toEqual(
          resultingSuppression
        );

        // Check that the updates have been persisted
        const { body: updatedRule } = await detectionsApi
          .readRule({
            query: { rule_id: 'id_1' },
          })
          .expect(200);

        expect(updatedRule.alert_suppression).toEqual(resultingSuppression);
      });

      it('should return error when trying to set suppression to threshold rule', async () => {
        const ruleId = 'ruleId';
        const existingSuppression = { duration: { value: 5, unit: 'm' as const } };
        const suppressionToSet = {
          group_by: ['field2'],
        };

        await createRule(supertest, log, {
          ...getThresholdRuleForAlertTesting(['*'], ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_alert_suppression,
                  value: suppressionToSet,
                },
              ],
            },
          })
          .expect(500);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 0,
          total: 1,
        });

        expect(bulkEditResponse.attributes.errors).toHaveLength(1);
        expect(bulkEditResponse.attributes.errors[0].message).toBe(
          "Threshold rule doesn't support this action. Use 'set_alert_suppression_for_threshold' action instead"
        );
        // Check that the updates did not apply to the rule
        const { body: updatedRule } = await detectionsApi
          .readRule({
            query: { rule_id: ruleId },
          })
          .expect(200);

        expect(updatedRule.alert_suppression).toEqual(existingSuppression);
      });

      it('should set suppression to rules without configured suppression and throw error on threshold one', async () => {
        const suppressionToSet = {
          group_by: ['field2'],
        };

        await Promise.all([
          createRule(supertest, log, getCustomQueryRuleParams({ rule_id: 'id_1' })),
          createRule(supertest, log, getThresholdRuleForAlertTesting(['*'], 'id_2')),
        ]);

        const { body: bulkEditResponse } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_alert_suppression,
                  value: suppressionToSet,
                },
              ],
            },
          })
          .expect(500);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 1,
          total: 2,
        });
      });
    });

    describe('delete_alert_suppression action', () => {
      it('should delete suppression from rules', async () => {
        await Promise.all([
          createRule(
            supertest,
            log,
            getCustomQueryRuleParams({
              rule_id: 'id_1',
              alert_suppression: {
                group_by: ['field2'],
                duration: { value: 10, unit: 'm' },
                missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
              },
            })
          ),
          createRule(supertest, log, {
            ...getThresholdRuleForAlertTesting(['*'], 'id_2'),
            alert_suppression: {
              duration: { value: 10, unit: 'm' },
            },
          }),
        ]);

        const { body: bulkEditResponse } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              query: '',
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.delete_alert_suppression,
                },
              ],
            },
          })
          .expect(200);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 2,
          total: 2,
        });

        // Check that the updated rule is returned with the response
        expect(bulkEditResponse.attributes.results.updated[0].alert_suppression).toEqual(undefined);

        // Check that the updates have been persisted
        const updatedRules = await Promise.all([
          detectionsApi.readRule({
            query: { rule_id: 'id_1' },
          }),
          await detectionsApi.readRule({
            query: { rule_id: 'id_2' },
          }),
        ]);
        expect(updatedRules[0].body.alert_suppression).toEqual(undefined);
        expect(updatedRules[1].body.alert_suppression).toEqual(undefined);
      });
    });

    describe('set_alert_suppression_for_threshold action', () => {
      it('should overwrite suppression in a rule', async () => {
        const ruleId = 'ruleId';
        const existingSuppression = {
          duration: { value: 5, unit: 'm' as const },
        };
        const suppressionToSet = {
          duration: { value: 10, unit: 'm' as const },
        };
        const resultingSuppression = {
          duration: { value: 10, unit: 'm' },
        };

        await createRule(supertest, log, {
          ...getThresholdRuleForAlertTesting(['*'], ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_alert_suppression_for_threshold,
                  value: suppressionToSet,
                },
              ],
            },
          })
          .expect(200);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        // Check that the updated rule is returned with the response
        expect(bulkEditResponse.attributes.results.updated[0].alert_suppression).toEqual(
          resultingSuppression
        );

        // Check that the updates have been persisted
        const { body: updatedRule } = await detectionsApi
          .readRule({
            query: { rule_id: ruleId },
          })
          .expect(200);

        expect(updatedRule.alert_suppression).toEqual(resultingSuppression);
      });

      it('should set suppression to rule without configured suppression', async () => {
        const ruleId = 'ruleId';
        const suppressionToSet = {
          duration: { value: 10, unit: 'm' as const },
        };
        const resultingSuppression = {
          duration: { value: 10, unit: 'm' },
        };

        await createRule(supertest, log, getThresholdRuleForAlertTesting(['*'], ruleId));

        const { body: bulkEditResponse } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_alert_suppression_for_threshold,
                  value: suppressionToSet,
                },
              ],
            },
          })
          .expect(200);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        // Check that the updated rule is returned with the response
        expect(bulkEditResponse.attributes.results.updated[0].alert_suppression).toEqual(
          resultingSuppression
        );

        // Check that the updates have been persisted
        const { body: updatedRule } = await detectionsApi
          .readRule({
            query: { rule_id: ruleId },
          })
          .expect(200);

        expect(updatedRule.alert_suppression).toEqual(resultingSuppression);
      });

      it('should return error when trying to set suppression not to threshold rule', async () => {
        const ruleId = 'ruleId';

        await createRule(supertest, log, getCustomQueryRuleParams({ rule_id: ruleId }));

        const { body: bulkEditResponse } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_alert_suppression_for_threshold,
                  value: { duration: { value: 10, unit: 'm' } },
                },
              ],
            },
          })
          .expect(500);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 0,
          total: 1,
        });

        expect(bulkEditResponse.attributes.errors).toHaveLength(1);
        expect(bulkEditResponse.attributes.errors[0].message).toBe(
          "query rule type doesn't support this action. Use 'set_alert_suppression' action instead."
        );
        // Check that the updates did not apply to the rule
        const { body: updatedRule } = await detectionsApi
          .readRule({
            query: { rule_id: ruleId },
          })
          .expect(200);

        expect(updatedRule.alert_suppression).toEqual(undefined);
      });
    });
  });
};
