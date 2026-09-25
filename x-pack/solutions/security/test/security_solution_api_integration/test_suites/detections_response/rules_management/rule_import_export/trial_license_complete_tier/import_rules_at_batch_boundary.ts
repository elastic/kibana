/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { range } from 'lodash';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  assertNoRuleTask,
  getCustomQueryRuleParams,
  importRules,
  importRulesWithSuccess,
} from '../../../utils';

// Sized to span at least two full import batches (current batch size: 200).
const RULE_COUNT = 501;
const EXISTING_COUNT = 251;

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI import rules at batch boundary', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('imports a mixed create and overwrite batch spanning multiple chunks', async () => {
      const allIds = range(RULE_COUNT).map((i) => `batch-rule-${i}`);
      const existingIds = allIds.slice(0, EXISTING_COUNT);

      await importRulesWithSuccess({
        getService,
        rules: existingIds.map((ruleId) =>
          getCustomQueryRuleParams({
            rule_id: ruleId,
            name: `Existing ${ruleId}`,
            enabled: false,
          })
        ),
        overwrite: false,
      });

      const { body: beforeOverwrite } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: RULE_COUNT,
          },
        })
        .expect(200);

      expect(beforeOverwrite.total).toBe(EXISTING_COUNT);

      const priorByRuleId = new Map<string, { id: string; revision: number }>(
        beforeOverwrite.data.map((rule: { rule_id: string; id: string; revision: number }) => [
          rule.rule_id,
          { id: rule.id, revision: rule.revision },
        ])
      );

      const rules = allIds.map((ruleId) =>
        getCustomQueryRuleParams({
          rule_id: ruleId,
          name: `Imported ${ruleId}`,
          enabled: false,
        })
      );

      const importResponse = await importRules({
        getService,
        rules,
        overwrite: true,
      });

      expect(importResponse).toMatchObject({
        rules_count: RULE_COUNT,
        success: true,
        success_count: RULE_COUNT,
        errors: [],
      });

      const { body } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: RULE_COUNT,
          },
        })
        .expect(200);

      expect(body.total).toBe(RULE_COUNT);
      expect(body.data).toHaveLength(RULE_COUNT);

      const foundIds = body.data.map((rule: { rule_id: string }) => rule.rule_id).sort();
      expect(foundIds).toEqual([...allIds].sort());

      // Spot-check overwrite targets keep SO id and bump revision; a create is new.
      const sampleRuleIds = ['batch-rule-0', 'batch-rule-250', 'batch-rule-251', 'batch-rule-500'];
      for (const ruleId of sampleRuleIds) {
        const found = body.data.find(
          (rule: { rule_id: string; id: string; name: string; revision: number }) =>
            rule.rule_id === ruleId
        );
        expect(found?.name).toBe(`Imported ${ruleId}`);
        const prior = priorByRuleId.get(ruleId);
        if (prior) {
          expect(found?.id).toBe(prior.id);
          expect(found?.revision).toBe(prior.revision + 1);
        } else {
          expect(found?.revision).toBe(0);
          if (!found) {
            throw new Error(`Missing rule ${ruleId} after import`);
          }
          await assertNoRuleTask({
            getService,
            ruleId: found.id,
          });
        }
      }
    });
  });
};
