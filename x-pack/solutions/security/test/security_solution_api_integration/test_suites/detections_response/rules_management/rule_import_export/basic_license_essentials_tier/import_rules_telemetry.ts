/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import { getCustomQueryRuleParams, fetchRule, importRules } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

const DETECTION_RULE_IMPORT_EVENT = 'detection_rule_import';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const ebtServer = getService('kibana_ebt_server');

  describe('@ess @serverless @skipInServerlessMKI import_rules telemetry', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('emits one import event per successful rule with its outcome', async () => {
      const createdRule = getCustomQueryRuleParams({ rule_id: 'rule-created', name: 'New' });
      const updatedRule = getCustomQueryRuleParams({ rule_id: 'rule-updated', name: 'Before' });
      const unchangedRule = getCustomQueryRuleParams({ rule_id: 'rule-unchanged', name: 'Same' });
      const invalidRule = {
        ...getCustomQueryRuleParams({ rule_id: 'rule-invalid' }),
        risk_score: 101,
      };
      await importRules({ getService, rules: [updatedRule, unchangedRule], overwrite: true });

      await ebtServer.setOptIn(true);
      const fromTimestamp = new Date().toISOString();

      // 4 rules imported (one invalid), so only 3 telemetry events are expected
      const response = await importRules({
        getService,
        rules: [createdRule, { ...updatedRule, name: 'After' }, unchangedRule, invalidRule],
        overwrite: true,
      });

      expect(response).toMatchObject({
        success: false,
        success_count: 3,
        rules_summary: { created: 1, updated: 1, unchanged: 1, failed: 1 },
        rules_count: 4,
      });
      expect(response.errors).toHaveLength(1);

      const events = await ebtServer.getEvents(3, {
        eventTypes: [DETECTION_RULE_IMPORT_EVENT],
        fromTimestamp,
        withTimeoutMs: 10_000,
      });

      const [created, updated, unchanged] = await Promise.all(
        ['rule-created', 'rule-updated', 'rule-unchanged'].map((ruleId) =>
          fetchRule(supertest, { ruleId })
        )
      );
      const expected = (id: string, outcome: string) => ({
        ruleId: id,
        ruleType: 'query',
        isPrebuilt: false,
        isCustomized: false,
        outcome,
      });

      expect(events).toHaveLength(3);
      expect(events.map(({ properties }) => properties)).toEqual(
        expect.arrayContaining([
          expected(created.id, 'created'),
          expected(updated.id, 'updated'),
          expected(unchanged.id, 'unchanged'),
        ])
      );
      expect(updated.revision).toBe(1);
      expect(unchanged.revision).toBe(0);
    });
  });
};
