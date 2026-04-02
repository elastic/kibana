/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { getCustomQueryRuleParams, fetchRule, rulesAllV3OnlyRole } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @serverlessQA Bulk enable/disable', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('should enable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({ rule_id: ruleId, enabled: false })
      );

      const { body } = await detectionsApi.performRulesBulkAction({
        query: {},
        body: { action: BulkActionTypeEnum.enable },
      });

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).toEqual(true);

      // Check that the updates have been persisted
      const ruleBody = await fetchRule(supertest, { ruleId });
      expect(ruleBody.enabled).toEqual(true);
    });

    it('should disable rules', async () => {
      const ruleId = 'ruleId';
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({ rule_id: ruleId, enabled: true })
      );

      const { body } = await detectionsApi.performRulesBulkAction({
        query: {},
        body: { action: BulkActionTypeEnum.disable },
      });

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });

      // Check that the updated rule is returned with the response
      expect(body.attributes.results.updated[0].enabled).toEqual(false);

      // Check that the updates have been persisted
      const ruleBody = await fetchRule(supertest, { ruleId });
      expect(ruleBody.enabled).toEqual(false);
    });

    describe('@skipInServerless as various roles', () => {
      beforeEach(async () => {
        await utils.createSuperTestWithCustomRole(rulesAllV3OnlyRole);
      });

      afterEach(async () => {
        await utils.cleanUpCustomRoles();
      });

      it('allows enabling/disabling rules with the Rules:All feature', async () => {
        const ruleId = 'ruleId';
        await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({ rule_id: ruleId, enabled: false })
        );

        const restrictedApis = detectionsApi.withUser({ username: rulesAllV3OnlyRole.name });

        const { body: enableBody } = await restrictedApis
          .performRulesBulkAction({
            query: {},
            body: { action: BulkActionTypeEnum.enable },
          })
          .expect(200);

        expect(enableBody.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });
        expect(enableBody.attributes.results.updated[0].enabled).toEqual(true);

        const { body: disableBody } = await restrictedApis
          .performRulesBulkAction({
            query: {},
            body: { action: BulkActionTypeEnum.disable },
          })
          .expect(200);

        expect(disableBody.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 1,
          total: 1,
        });
        expect(disableBody.attributes.results.updated[0].enabled).toEqual(false);

        const ruleBody = await fetchRule(supertest, { ruleId });
        expect(ruleBody.enabled).toEqual(false);
      });
    });
  });
};
