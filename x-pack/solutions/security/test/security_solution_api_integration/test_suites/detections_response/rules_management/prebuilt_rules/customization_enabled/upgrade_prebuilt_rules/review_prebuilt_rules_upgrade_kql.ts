/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import { MAX_SEARCH_RULES_SEARCH_TERM_LENGTH } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets, reviewPrebuiltRulesToUpgrade } from '../../../../utils';
import { setUpRuleUpgrade } from '../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const deps = {
    es,
    supertest,
    log,
  };

  describe('@ess @serverless @skipInServerlessMKI review prebuilt rules upgrade - KQL filtering, search_after, aggregations, search term', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    const seedThreeUpgradeableRules = async () => {
      await setUpRuleUpgrade({
        assets: [
          {
            installed: {
              rule_id: 'rule-alpha',
              type: 'query',
              name: 'Alpha installed',
              tags: ['tag-a', 'tag-b'],
              version: 1,
            },
            patch: {},
            upgrade: {
              rule_id: 'rule-alpha',
              type: 'query',
              name: 'Alpha upgraded',
              tags: ['tag-a', 'tag-b'],
              version: 2,
            },
          },
          {
            installed: {
              rule_id: 'rule-beta',
              type: 'query',
              name: 'Beta installed',
              tags: ['tag-b'],
              version: 1,
            },
            patch: {},
            upgrade: {
              rule_id: 'rule-beta',
              type: 'query',
              name: 'Beta upgraded',
              tags: ['tag-b'],
              version: 2,
            },
          },
          {
            installed: {
              rule_id: 'rule-gamma',
              type: 'query',
              name: 'Gamma installed',
              tags: ['tag-c'],
              version: 1,
            },
            patch: {},
            upgrade: {
              rule_id: 'rule-gamma',
              type: 'query',
              name: 'Gamma upgraded',
              tags: ['tag-c'],
              version: 2,
            },
          },
        ],
        deps,
      });
    };

    describe('KQL filter', () => {
      it('filters by alert.attributes.name', async () => {
        await seedThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: 'alert.attributes.name: "Alpha installed"',
        });

        expect(response.total).toBe(1);
        expect(response.rules).toEqual([
          expect.objectContaining({
            current_rule: expect.objectContaining({ rule_id: 'rule-alpha' }),
          }),
        ]);
      });

      it('filters by alert.attributes.tags (AND semantics)', async () => {
        await seedThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: '(alert.attributes.tags: "tag-a") AND (alert.attributes.tags: "tag-b")',
        });

        expect(response.total).toBe(1);
        expect(response.rules).toEqual([
          expect.objectContaining({
            current_rule: expect.objectContaining({ rule_id: 'rule-alpha' }),
          }),
        ]);
      });

      it('returns 400 for invalid KQL filter', async () => {
        const response = (await reviewPrebuiltRulesToUpgrade(
          supertest,
          { filter: 'alert.attributes.name: (' },
          400
        )) as unknown as { status_code: number; message: string[] };

        expect(response).toMatchObject({
          status_code: 400,
          message: expect.any(Array),
        });
        expect(response.message.some((m) => m.includes('invalid KQL filter'))).toBe(true);
      });
    });

    describe('Search term', () => {
      it('matches rules by name substring via the legacy search term', async () => {
        await seedThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          search: { term: 'beta' },
        });

        expect(response.total).toBe(1);
        expect(response.rules).toEqual([
          expect.objectContaining({
            current_rule: expect.objectContaining({ rule_id: 'rule-beta' }),
          }),
        ]);
      });

      it('ANDs the filter with the legacy search term', async () => {
        await seedThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: 'alert.attributes.tags: "tag-b"',
          search: { term: 'alpha', mode: 'legacy' },
        });

        expect(response.total).toBe(1);
        expect(response.rules).toEqual([
          expect.objectContaining({
            current_rule: expect.objectContaining({ rule_id: 'rule-alpha' }),
          }),
        ]);
      });

      it('returns 400 when search.term exceeds max length', async () => {
        const response = (await reviewPrebuiltRulesToUpgrade(
          supertest,
          { search: { term: 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH + 1) } },
          400
        )) as unknown as { status_code: number; message: string[] };

        expect(response.status_code).toBe(400);
        expect(
          response.message.some((m) =>
            m.includes(
              `search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`
            )
          )
        ).toBe(true);
      });
    });

    describe('search_after pagination', () => {
      it('returns 400 when search_after is provided without sort_field and sort_order', async () => {
        const response = (await reviewPrebuiltRulesToUpgrade(
          supertest,
          { search_after: ['nonsense-sort-token'] },
          400
        )) as unknown as { status_code: number; message: string[] };

        expect(response.status_code).toBe(400);
        expect(
          response.message.some((m) =>
            m.includes('when search_after is provided, sort_field and sort_order must be set')
          )
        ).toBe(true);
      });

      it('paginates via offset when no search_after cursor is supplied', async () => {
        await seedThreeUpgradeableRules();

        const first = await reviewPrebuiltRulesToUpgrade(supertest, {
          page: 1,
          per_page: 1,
          sort_field: 'name',
          sort_order: 'asc',
        });

        expect(first.rules).toHaveLength(1);
        expect(first.total).toBe(3);
        expect(first.rules[0]?.current_rule.name).toBe('Alpha installed');

        const second = await reviewPrebuiltRulesToUpgrade(supertest, {
          page: 2,
          per_page: 1,
          sort_field: 'name',
          sort_order: 'asc',
        });

        expect(second.rules).toHaveLength(1);
        expect(second.rules[0]?.current_rule.name).toBe('Beta installed');
      });

      it('continues pagination via search_after cursor', async () => {
        await seedThreeUpgradeableRules();

        const first = await reviewPrebuiltRulesToUpgrade(supertest, {
          per_page: 1,
          sort_field: 'name',
          sort_order: 'asc',
        });

        expect(first.rules).toHaveLength(1);
        expect(first.rules[0]?.current_rule.name).toBe('Alpha installed');

        const firstSearchAfter = first.search_after;

        const second = await reviewPrebuiltRulesToUpgrade(supertest, {
          per_page: 1,
          sort_field: 'name',
          sort_order: 'asc',
          search_after: firstSearchAfter,
        });

        expect(second.rules).toHaveLength(1);
        expect(second.rules[0]?.current_rule.name).toBe('Beta installed');
      });
    });

    describe('Aggregations', () => {
      it('returns facet counts for tags when aggregations.counts is set', async () => {
        await seedThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          aggregations: { counts: ['tags'] },
        });

        expect(response.total).toBe(3);
        const tagsCounts = response.counts?.tags as Record<string, number> | undefined;
        expect(tagsCounts).toBeDefined();
        expect(tagsCounts?.['tag-a']).toBe(1);
        expect(tagsCounts?.['tag-b']).toBe(2);
        expect(tagsCounts?.['tag-c']).toBe(1);
      });

      it('intersects the filter with aggregations.counts', async () => {
        await seedThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: 'alert.attributes.tags: "tag-b"',
          aggregations: { counts: ['tags'] },
        });

        expect(response.total).toBe(2);
        const tagsCounts = response.counts?.tags as Record<string, number> | undefined;
        expect(tagsCounts).toBeDefined();
        expect(tagsCounts?.['tag-b']).toBe(2);
        expect(tagsCounts?.['tag-a']).toBe(1);
        expect(tagsCounts?.['tag-c']).toBeUndefined();
      });

      it('returns 400 when aggregations.counts contains duplicates', async () => {
        const response = (await reviewPrebuiltRulesToUpgrade(
          supertest,
          { aggregations: { counts: ['tags', 'tags'] } },
          400
        )) as unknown as { status_code: number };
        expect(response.status_code).toBe(400);
      });
    });

    describe('rule_ids restriction', () => {
      it('restricts results to the provided installed rule saved object ids', async () => {
        await seedThreeUpgradeableRules();

        const all = await reviewPrebuiltRulesToUpgrade(supertest);
        expect(all.total).toBe(3);
        const betaRule = all.rules.find((rule) => rule.current_rule.rule_id === 'rule-beta');
        expect(betaRule).toBeDefined();

        const betaSoId = betaRule?.id;
        if (!betaSoId) {
          throw new Error('Expected beta rule to have a saved object id');
        }

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          rule_ids: [betaSoId],
        });

        expect(response.total).toBe(1);
        expect(response.rules).toEqual([
          expect.objectContaining({
            current_rule: expect.objectContaining({ rule_id: 'rule-beta' }),
          }),
        ]);
      });
    });
  });
};
