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

      const sampleIndexes = [0, 50, 300, 500, RULE_COUNT - 1];
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
  });
};
