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
  assertRuleTask,
  getCustomQueryRuleParams,
  getRuleTaskId,
  importRules,
  importRulesWithSuccess,
} from '../../../utils';

const RULE_COUNT = 568;
// Keep in sync with rule_management/api/constants.ts without importing a private plugin module.
const BATCH_SIZE = 200;

if (RULE_COUNT <= BATCH_SIZE * 2) {
  throw new Error('RULE_COUNT must span more than two import batches');
}

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI import rules overwrite at batch boundary', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('overwrites an existing-only batch spanning multiple chunks', async () => {
      const allIds = range(RULE_COUNT).map((i) => `overwrite-batch-rule-${i}`);

      await importRulesWithSuccess({
        getService,
        rules: allIds.map((ruleId) =>
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

      expect(beforeOverwrite.total).toBe(RULE_COUNT);

      const priorByRuleId = new Map<string, { id: string; revision: number }>(
        beforeOverwrite.data.map((rule: { rule_id: string; id: string; revision: number }) => [
          rule.rule_id,
          { id: rule.id, revision: rule.revision },
        ])
      );

      const importResponse = await importRules({
        getService,
        rules: allIds.map((ruleId) =>
          getCustomQueryRuleParams({
            rule_id: ruleId,
            name: `Overwritten ${ruleId}`,
            enabled: false,
          })
        ),
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

      // Ends/starts of each chunk plus a few mids — not every rule.
      const sampleIndexes = [
        0,
        50,
        BATCH_SIZE - 1,
        BATCH_SIZE,
        300,
        BATCH_SIZE * 2 - 1,
        BATCH_SIZE * 2,
        500,
        RULE_COUNT - 1,
      ];
      for (const i of sampleIndexes) {
        const ruleId = `overwrite-batch-rule-${i}`;
        const found = body.data.find(
          (rule: { rule_id: string; id: string; name: string; revision: number }) =>
            rule.rule_id === ruleId
        );
        const prior = priorByRuleId.get(ruleId);
        expect(found?.name).toBe(`Overwritten ${ruleId}`);
        expect(found?.id).toBe(prior?.id);
        expect(found?.revision).toBe((prior?.revision ?? 0) + 1);
      }
    });

    it('enables and disables rules when overwriting a full batch', async () => {
      const half = Math.floor(BATCH_SIZE / 2);
      const enableIds = range(half).map((i) => `overwrite-batch-enable-${i}`);
      const disableIds = range(BATCH_SIZE - half).map((i) => `overwrite-batch-disable-${i}`);
      const mid = Math.floor(enableIds.length / 2);
      const sampleEnable = [
        enableIds[0],
        enableIds[mid - 1],
        enableIds[mid],
        enableIds[enableIds.length - 1],
      ];
      const sampleDisable = [
        disableIds[0],
        disableIds[mid - 1],
        disableIds[mid],
        disableIds[disableIds.length - 1],
      ];

      await importRulesWithSuccess({
        getService,
        rules: [
          ...enableIds.map((ruleId) =>
            getCustomQueryRuleParams({
              rule_id: ruleId,
              name: `Disabled ${ruleId}`,
              enabled: false,
            })
          ),
          ...disableIds.map((ruleId) =>
            getCustomQueryRuleParams({
              rule_id: ruleId,
              name: `Enabled ${ruleId}`,
              enabled: true,
            })
          ),
        ],
        overwrite: false,
      });

      const { body: beforeOverwrite } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: BATCH_SIZE + 1,
          },
        })
        .expect(200);

      expect(beforeOverwrite.total).toBe(BATCH_SIZE);

      const priorByRuleId = new Map<string, { id: string; revision: number }>(
        beforeOverwrite.data.map((rule: { rule_id: string; id: string; revision: number }) => [
          rule.rule_id,
          { id: rule.id, revision: rule.revision },
        ])
      );
      const disableTasks = new Map<string, string>();
      for (const ruleId of sampleDisable) {
        const prior = priorByRuleId.get(ruleId);
        if (!prior) {
          throw new Error(`Missing rule ${ruleId} before overwrite`);
        }
        disableTasks.set(ruleId, await getRuleTaskId({ getService, ruleId: prior.id }));
      }

      await importRulesWithSuccess({
        getService,
        rules: [
          ...enableIds.map((ruleId) =>
            getCustomQueryRuleParams({
              rule_id: ruleId,
              name: `Enabled ${ruleId}`,
              enabled: true,
            })
          ),
          ...disableIds.map((ruleId) =>
            getCustomQueryRuleParams({
              rule_id: ruleId,
              name: `Disabled ${ruleId}`,
              enabled: false,
            })
          ),
        ],
        overwrite: true,
      });

      const { body } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: BATCH_SIZE,
          },
        })
        .expect(200);

      expect(body.total).toBe(BATCH_SIZE);
      expect(body.data).toHaveLength(BATCH_SIZE);

      for (const ruleId of sampleEnable) {
        const found = body.data.find((rule: { rule_id: string }) => rule.rule_id === ruleId);
        const prior = priorByRuleId.get(ruleId);
        if (!found || !prior) {
          throw new Error(`Missing rule ${ruleId} after overwrite`);
        }
        expect(found?.enabled).toBe(true);
        expect(found?.name).toBe(`Enabled ${ruleId}`);
        expect(found?.id).toBe(prior?.id);
        expect(found?.revision).toBe((prior?.revision ?? 0) + 1);
        await assertRuleTask({
          getService,
          ruleId: found.id,
          enabled: true,
        });
      }
      for (const ruleId of sampleDisable) {
        const found = body.data.find((rule: { rule_id: string }) => rule.rule_id === ruleId);
        const prior = priorByRuleId.get(ruleId);
        const taskId = disableTasks.get(ruleId);
        if (!found || !prior || !taskId) {
          throw new Error(`Missing rule ${ruleId} after overwrite`);
        }
        expect(found?.enabled).toBe(false);
        expect(found?.name).toBe(`Disabled ${ruleId}`);
        expect(found?.id).toBe(prior?.id);
        expect(found?.revision).toBe((prior?.revision ?? 0) + 1);
        await assertRuleTask({
          getService,
          taskId,
          enabled: false,
        });
      }
    });
  });
};
