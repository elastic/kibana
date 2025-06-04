/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '@kbn/security-solution-plugin/common/constants';
import {
  BulkActionTypeEnum,
  BulkActionEditTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';

import { getSimpleRule, getThresholdRuleForAlertTesting } from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../../common/utils/security_solution';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  const postBulkAction = () =>
    supertest
      .post(DETECTION_ENGINE_RULES_BULK_ACTION)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31');

  const fetchRule = (ruleId: string) =>
    supertest
      .get(`${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleId}`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31');

  // skips serverless MKI due to feature flag
  describe('@ess @serverless @skipInServerlessMKI perform_bulk_action suppression', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    describe('add_alert_suppression action', () => {
      it('should add suppression fields to a rule', async () => {
        const ruleId = 'ruleId';
        const existingSuppression = {
          group_by: ['field1'],
          duration: { value: 5, unit: 'm' as const },
          missing_fields_strategy: 'suppress' as const,
        };
        const suppressionToAdd = {
          group_by: ['field2'],
          duration: { value: 10, unit: 'm' },
          missing_fields_strategy: 'suppress',
        };
        const resultingSuppression = {
          group_by: ['field1', 'field2'],
          duration: { value: 10, unit: 'm' },
          missing_fields_strategy: 'suppress',
        };

        await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_alert_suppression,
                value: suppressionToAdd,
              },
            ],
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
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.alert_suppression).toEqual(resultingSuppression);
      });

      it('should add suppression fields to a rule without configured suppression', async () => {
        const ruleId = 'ruleId';
        const suppressionToAdd = {
          group_by: ['field2'],
        };
        const resultingSuppression = {
          group_by: ['field2'],
          missing_fields_strategy: 'suppress',
        };

        await createRule(supertest, log, getSimpleRule(ruleId));

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_alert_suppression,
                value: suppressionToAdd,
              },
            ],
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
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.alert_suppression).toEqual(resultingSuppression);
      });

      it('should not add more than 3 suppression fields to a rule', async () => {
        const ruleId = 'ruleId';
        const existingSuppression = {
          group_by: ['field1', 'field2'],
          duration: { value: 5, unit: 'm' as const },
          missing_fields_strategy: 'suppress' as const,
        };
        const suppressionToAdd = {
          group_by: ['new1', 'new2', 'new3'],
          duration: { value: 10, unit: 'm' },
          missing_fields_strategy: 'suppress',
        };

        await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_alert_suppression,
                value: suppressionToAdd,
              },
            ],
          })
          .expect(500);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 0,
          total: 1,
        });

        expect(bulkEditResponse.attributes.errors[0].message).toEqual(
          'alert_suppression.group_by: Array must contain at most 3 element(s)'
        );

        // Check that the updates have not been applied to the rule
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.alert_suppression).toEqual(existingSuppression);
      });

      it('should skip threshold rule if duration is not set in action', async () => {
        const ruleId = 'ruleId';
        const existingSuppression = { duration: { value: 5, unit: 'm' as const } };
        const suppressionToAdd = {
          group_by: ['field2'],
        };

        await createRule(supertest, log, {
          ...getThresholdRuleForAlertTesting(['*'], ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_alert_suppression,
                value: suppressionToAdd,
              },
            ],
          })
          .expect(200);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 0,
          skipped: 1,
          succeeded: 0,
          total: 1,
        });

        expect(bulkEditResponse.attributes.results.updated).toHaveLength(0);
        expect(bulkEditResponse.attributes.results.skipped).toHaveLength(1);

        // Check that the updates did not apply to the rule
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.alert_suppression).toEqual(existingSuppression);
      });

      it('should update threshold rule if duration is set in action', async () => {
        const ruleId = 'ruleId';
        const existingSuppression = { duration: { value: 5, unit: 'm' as const } };
        const suppressionToAdd = {
          group_by: ['field2'],
          duration: { value: 1, unit: 'h' as const },
          missing_fields_strategy: 'suppress' as const,
        };
        const resultingSuppression = {
          duration: { value: 1, unit: 'h' },
        };

        await createRule(supertest, log, {
          ...getThresholdRuleForAlertTesting(['*'], ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.add_alert_suppression,
                value: suppressionToAdd,
              },
            ],
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
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.alert_suppression).toEqual(resultingSuppression);
      });
    });

    describe('delete_alert_suppression action', () => {
      it('should delete suppression fields from a rule', async () => {
        const ruleId = 'ruleId';
        const existingSuppression = {
          group_by: ['field1', 'field2'],
          duration: { value: 5, unit: 'm' as const },
          missing_fields_strategy: 'suppress' as const,
        };
        const suppressionToDelete = {
          group_by: ['field2'],
          duration: { value: 5, unit: 'm' },
          missing_fields_strategy: 'suppress',
        };
        const resultingSuppression = {
          group_by: ['field1'],
          duration: { value: 5, unit: 'm' },
          missing_fields_strategy: 'suppress',
        };

        await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.delete_alert_suppression,
                value: suppressionToDelete,
              },
            ],
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
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.alert_suppression).toEqual(resultingSuppression);
      });

      it('should remove suppression from threshold rule if duration is set to null in action', async () => {
        const ruleId = 'thresholdRuleId';
        const existingSuppression = { duration: { value: 5, unit: 'm' as const } };
        const suppressionToSet = { group_by: ['field2'], duration: null };

        await createRule(supertest, log, {
          ...getThresholdRuleForAlertTesting(['*'], ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.delete_alert_suppression,
                value: suppressionToSet,
              },
            ],
          })
          .expect(200);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });

        expect(bulkEditResponse.attributes.results.updated).toHaveLength(1);

        // Check that the updates did not apply to the rule
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.alert_suppression).toEqual(undefined);
      });
    });

    describe('set_alert_suppression action', () => {
      it('should overwrite suppression fields in a rule', async () => {
        const ruleId = 'ruleId';
        const existingSuppression = {
          group_by: ['field1'],
          duration: { value: 5, unit: 'm' as const },
          missing_fields_strategy: 'suppress' as const,
        };
        const suppressionToSet = {
          group_by: ['field2'],
          duration: { value: 10, unit: 'm' },
          missing_fields_strategy: 'doNotSuppress',
        };
        const resultingSuppression = {
          group_by: ['field2'],
          duration: { value: 10, unit: 'm' },
          missing_fields_strategy: 'doNotSuppress',
        };

        await createRule(supertest, log, {
          ...getSimpleRule(ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_alert_suppression,
                value: suppressionToSet,
              },
            ],
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
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.alert_suppression).toEqual(resultingSuppression);
      });

      it('should skip threshold rule if duration is not set in action', async () => {
        const ruleId = 'thresholdRuleId';
        const existingSuppression = { duration: { value: 5, unit: 'm' as const } };
        const suppressionToSet = { group_by: ['field2'] };

        await createRule(supertest, log, {
          ...getThresholdRuleForAlertTesting(['*'], ruleId),
          alert_suppression: existingSuppression,
        });

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_alert_suppression,
                value: suppressionToSet,
              },
            ],
          })
          .expect(200);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 0,
          skipped: 1,
          succeeded: 0,
          total: 1,
        });

        expect(bulkEditResponse.attributes.results.updated).toHaveLength(0);
        expect(bulkEditResponse.attributes.results.skipped).toHaveLength(1);

        // Check that the updates did not apply to the rule
        const { body: updatedRule } = await fetchRule(ruleId).expect(200);

        expect(updatedRule.alert_suppression).toEqual(existingSuppression);
      });

      it('should skip a rule if setting empty suppression fields to a rule without suppression', async () => {
        const ruleId = 'ruleId';
        const suppressionToSet = {
          group_by: [],
        };

        await createRule(supertest, log, getSimpleRule(ruleId));

        const { body: bulkEditResponse } = await postBulkAction()
          .send({
            query: '',
            action: BulkActionTypeEnum.edit,
            [BulkActionTypeEnum.edit]: [
              {
                type: BulkActionEditTypeEnum.set_alert_suppression,
                value: suppressionToSet,
              },
            ],
          })
          .expect(200);

        expect(bulkEditResponse.attributes.summary).toEqual({
          failed: 0,
          skipped: 1,
          succeeded: 0,
          total: 1,
        });
      });
    });
  });
};
