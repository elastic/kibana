/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getCustomQueryRuleParams, importRules } from '../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI concurrent rule imports', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('imports two overlapping requests with distinct rule_ids', async () => {
      const [first, second] = await Promise.all([
        importRules({
          getService,
          rules: [
            getCustomQueryRuleParams({
              rule_id: 'concurrent-distinct-1',
              name: 'Concurrent distinct 1',
              enabled: false,
            }),
          ],
          overwrite: false,
        }),
        importRules({
          getService,
          rules: [
            getCustomQueryRuleParams({
              rule_id: 'concurrent-distinct-2',
              name: 'Concurrent distinct 2',
              enabled: false,
            }),
          ],
          overwrite: false,
        }),
      ]);

      expect(first).toMatchObject({
        success: true,
        success_count: 1,
        errors: [],
      });
      expect(second).toMatchObject({
        success: true,
        success_count: 1,
        errors: [],
      });

      const { body } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: 10,
            filter: 'alert.attributes.params.ruleId: concurrent-distinct-*',
          },
        })
        .expect(200);

      expect(body.total).toBe(2);

      const { body: firstRule } = await detectionsApi
        .readRule({ query: { rule_id: 'concurrent-distinct-1' } })
        .expect(200);
      const { body: secondRule } = await detectionsApi
        .readRule({ query: { rule_id: 'concurrent-distinct-2' } })
        .expect(200);

      expect(firstRule.name).toBe('Concurrent distinct 1');
      expect(secondRule.name).toBe('Concurrent distinct 2');
    });

    it('handles overlapping imports that share a rule_id without overwrite', async () => {
      const sharedId = 'concurrent-shared-rule';
      const rule = getCustomQueryRuleParams({
        rule_id: sharedId,
        name: 'Concurrent shared',
        enabled: false,
      });

      const [first, second] = await Promise.all([
        importRules({ getService, rules: [rule], overwrite: false }),
        importRules({ getService, rules: [rule], overwrite: false }),
      ]);

      const responses = [first, second];
      const totalSuccess = responses.reduce((sum, response) => sum + response.success_count, 0);

      // Legacy import has a TOCTOU race on rule_id uniqueness: both requests
      // may succeed and leave two rules with the same rule_id. Also valid is
      // one create + one 409 conflict. Never expect a hard 500.
      expect(totalSuccess).toBeGreaterThanOrEqual(1);
      expect(totalSuccess).toBeLessThanOrEqual(2);

      for (const response of responses) {
        expect(response.rules_count).toBe(1);
        if (response.success_count === 0) {
          expect(response.errors.length).toBeGreaterThan(0);
          expect(response.errors[0].rule_id).toBe(sharedId);
          expect(response.errors[0].error.status_code).toBe(409);
          expect(response.errors[0].error.message).toBe('Rule with this rule_id already exists');
        }
      }

      const { body } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: 10,
            filter: `alert.attributes.params.ruleId: "${sharedId}"`,
          },
        })
        .expect(200);

      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.total).toBeLessThanOrEqual(2);
      expect(body.data.every((item: { rule_id: string }) => item.rule_id === sharedId)).toBe(true);
    });

    it('handles overlapping overwrite imports that share a rule_id', async () => {
      const sharedId = 'concurrent-overwrite-rule';
      const names = ['Overwrite A', 'Overwrite B'] as const;

      const original = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: sharedId,
          name: 'Original',
          enabled: false,
        })
      );

      const [first, second] = await Promise.all(
        names.map((name) =>
          importRules({
            getService,
            rules: [
              getCustomQueryRuleParams({
                rule_id: sharedId,
                name,
                enabled: false,
              }),
            ],
            overwrite: true,
          })
        )
      );

      // Soft contract: each request stays HTTP 200-shaped (importRules asserts
      // status), reports one rule, and never fails both. Do not assert which
      // writer wins or that both succeed — last-write-wins is racy by design.
      const responses = [first, second];
      for (const response of responses) {
        expect(response.rules_count).toBe(1);
        expect(response.success_count).toBeGreaterThanOrEqual(0);
        expect(response.success_count).toBeLessThanOrEqual(1);
        if (response.success_count === 0) {
          expect(response.errors.length).toBeGreaterThan(0);
        }
      }

      const totalSuccess = responses.reduce((sum, response) => sum + response.success_count, 0);
      expect(totalSuccess).toBeGreaterThanOrEqual(1);
      expect(totalSuccess).toBeLessThanOrEqual(2);

      const { body } = await detectionsApi
        .findRules({
          query: {
            page: 1,
            per_page: 10,
            filter: `alert.attributes.params.ruleId: "${sharedId}"`,
          },
        })
        .expect(200);

      expect(body.total).toBe(1);
      expect(body.data[0].rule_id).toBe(sharedId);
      expect(body.data[0].id).toBe(original.id);
      expect(names).toContain(body.data[0].name);
    });
  });
};
