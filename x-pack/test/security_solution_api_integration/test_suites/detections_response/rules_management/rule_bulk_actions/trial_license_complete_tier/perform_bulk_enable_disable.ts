/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { getCustomQueryRuleParams, fetchRule } from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');

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

      const { body } = await securitySolutionApi.performRulesBulkAction({
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

      const { body } = await securitySolutionApi.performRulesBulkAction({
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
  });
};
