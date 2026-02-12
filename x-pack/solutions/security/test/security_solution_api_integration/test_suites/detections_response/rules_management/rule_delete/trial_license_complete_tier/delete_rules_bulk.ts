/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { Rule } from '@kbn/alerting-plugin/common';
import type { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '@kbn/detections-response-ftr-services';
import {
  getSimpleRule,
  createRuleThroughAlertingEndpoint,
  getRuleSavedObjectWithLegacyInvestigationFields,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
  removeServerGeneratedPropertiesIncludingRuleId,
  updateUsername,
  getSimpleRuleOutputWithoutRuleId,
} from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');

  describe('@ess @skipInServerlessMKI delete_rules_bulk', () => {
    describe('deleting rules bulk using bulk_action endpoint', () => {
      beforeEach(async () => {
        await createAlertsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('should delete a single rule using an auto generated id', async () => {
        const bodyWithCreatedRule = await createRule(supertest, log, getSimpleRule());

        // delete that rule by its id
        const { body } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: { ids: [bodyWithCreatedRule.id], action: 'delete' },
          })
          .expect(200);

        const bodyToCompare = removeServerGeneratedPropertiesIncludingRuleId(
          body.attributes.results.deleted[0]
        );
        const expectedRule = updateUsername(
          getSimpleRuleOutputWithoutRuleId(),
          await utils.getUsername()
        );

        expect(bodyToCompare).toEqual(expectedRule);
      });

      it('should return an error if the id does not exist when trying to delete an id', async () => {
        const { body } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: { ids: ['c4e80a0d-e20f-4efc-84c1-08112da5a612'], action: 'delete' },
          })
          .expect(500);

        expect(body).toEqual({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Bulk edit failed',
          attributes: {
            errors: [
              {
                message: 'Rule not found',
                status_code: 500,
                rules: [
                  {
                    id: 'c4e80a0d-e20f-4efc-84c1-08112da5a612',
                  },
                ],
              },
            ],
            results: {
              updated: [],
              created: [],
              deleted: [],
              skipped: [],
            },
            summary: {
              failed: 1,
              succeeded: 0,
              skipped: 0,
              total: 1,
            },
          },
        });
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

      it('Should delete a single rule with investigation field', async () => {
        // delete the rule in bulk using the bulk_actions endpoint
        const { body } = await detectionsApi
          .performRulesBulkAction({
            query: { dry_run: false },
            body: {
              ids: [
                ruleWithLegacyInvestigationFieldEmptyArray.id,
                ruleWithLegacyInvestigationField.id,
              ],
              action: 'delete',
            },
          })
          .expect(200);

        expect(body.success).toBe(true);
        expect(body.rules_count).toBe(2);

        const investigationFields = body.attributes.results.deleted
          .map((rule: RuleResponse) => rule.investigation_fields)
          .sort();

        expect(investigationFields).toEqual([
          { field_names: ['client.address', 'agent.name'] },
          undefined,
        ]);
      });
    });
  });
};
