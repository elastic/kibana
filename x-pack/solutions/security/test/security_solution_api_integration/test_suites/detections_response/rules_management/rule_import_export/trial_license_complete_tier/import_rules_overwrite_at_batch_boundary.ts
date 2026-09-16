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
import { getCustomQueryRuleParams, importRules, importRulesWithSuccess } from '../../../utils';

/**
 * Pure overwrite across chunks. Sized above main import chunking (50) and
 * planned rewrite batches (300–500). See bulk-update readiness in the import
 * FTR coverage report / https://github.com/elastic/kibana/issues/275204
 */
const RULE_COUNT = 568;

/** Matches `RULE_IMPORT_BATCH_SIZE` — one route chunk / one alerting bulk. */
const BATCH_SIZE = 200;

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

      // Ends/starts of 200-rule chunks plus a few mids — not every rule.
      const sampleIndexes = [0, 50, 199, 200, 300, 399, 400, 500, RULE_COUNT - 1];
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
      const enableIds = range(BATCH_SIZE / 2).map((i) => `overwrite-batch-enable-${i}`);
      const disableIds = range(BATCH_SIZE / 2).map((i) => `overwrite-batch-disable-${i}`);

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

      const mid = Math.floor(enableIds.length / 2);
      const sampleEnable = [enableIds[0], enableIds[mid], enableIds[enableIds.length - 1]];
      const sampleDisable = [disableIds[0], disableIds[mid], disableIds[disableIds.length - 1]];

      for (const ruleId of sampleEnable) {
        const found = body.data.find((rule: { rule_id: string }) => rule.rule_id === ruleId);
        expect(found?.enabled).toBe(true);
        expect(found?.name).toBe(`Enabled ${ruleId}`);
      }
      for (const ruleId of sampleDisable) {
        const found = body.data.find((rule: { rule_id: string }) => rule.rule_id === ruleId);
        expect(found?.enabled).toBe(false);
        expect(found?.name).toBe(`Disabled ${ruleId}`);
      }
    });
  });
};
