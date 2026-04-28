/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import { MAX_SEARCH_RULES_SEARCH_TERM_LENGTH } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_management/api/rules/search_rules/request_schema_validation';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets, reviewPrebuiltRulesToUpgrade } from '../../../../utils';
import { setUpRuleUpgrade } from '../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';

/**
 * Granular-filter coverage for the upgrade-review endpoint: KQL filter + legacy
 * search + facet aggregations + field selection. Mirrors the install-review
 * granular coverage, adjusted for the alert-SO KQL field paths that the upgrade
 * endpoint queries against.
 */
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const deps = { es, supertest, log };

  describe('@ess @serverless @skipInServerlessMKI review prebuilt rules upgrade - granular filters', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    const setUpThreeUpgradeableRules = async () => {
      await setUpRuleUpgrade({
        assets: [
          {
            installed: {
              rule_id: 'rule-a',
              type: 'query',
              name: 'Phishing detection',
              tags: ['tag-a'],
              version: 1,
            },
            patch: {},
            upgrade: {
              rule_id: 'rule-a',
              type: 'query',
              name: 'Phishing detection v2',
              tags: ['tag-a'],
              version: 2,
            },
          },
          {
            installed: {
              rule_id: 'rule-b',
              type: 'query',
              name: 'Malware detection',
              tags: ['tag-a', 'tag-b'],
              version: 1,
            },
            patch: {},
            upgrade: {
              rule_id: 'rule-b',
              type: 'query',
              name: 'Malware detection v2',
              tags: ['tag-a', 'tag-b'],
              version: 2,
            },
          },
          {
            installed: {
              rule_id: 'rule-c',
              type: 'query',
              name: 'Unrelated rule',
              tags: ['tag-c'],
              version: 1,
            },
            patch: {},
            upgrade: {
              rule_id: 'rule-c',
              type: 'query',
              name: 'Unrelated rule v2',
              tags: ['tag-c'],
              version: 2,
            },
          },
        ],
        deps,
      });
    };

    describe('KQL filter', () => {
      it('filters upgradeable rules by tags', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: 'alert.attributes.tags: "tag-b"',
        });

        expect(response.total).toBe(1);
        expect(response.rules.map((r) => r.rule_id)).toEqual(['rule-b']);
      });

      it('ANDs multiple tags', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: '(alert.attributes.tags: "tag-a") AND (alert.attributes.tags: "tag-b")',
        });

        expect(response.total).toBe(1);
        expect(response.rules.map((r) => r.rule_id)).toEqual(['rule-b']);
      });

      it('returns an empty page for a filter that matches nothing', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: 'alert.attributes.tags: "tag-does-not-exist"',
        });

        expect(response.total).toBe(0);
        expect(response.rules).toEqual([]);
      });

      it('returns 400 for invalid KQL filter', async () => {
        const response = (await reviewPrebuiltRulesToUpgrade(
          supertest,
          { filter: 'alert.attributes.name: (' },
          400
        )) as unknown as { status_code: number; message: string[] };
        expect(response.status_code).toBe(400);
        expect(response.message.some((m) => m.includes('invalid KQL filter'))).toBe(true);
      });
    });

    describe('Legacy search', () => {
      it('filters upgradeable rules by free-text search on name', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          search: { term: 'phishing' },
        });

        expect(response.total).toBe(1);
        expect(response.rules.map((r) => r.rule_id)).toEqual(['rule-a']);
      });

      it('ANDs the KQL filter with the legacy search term', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: 'alert.attributes.tags: "tag-a"',
          search: { term: 'malware', mode: 'legacy' },
        });

        expect(response.total).toBe(1);
        expect(response.rules.map((r) => r.rule_id)).toEqual(['rule-b']);
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

    describe('Aggregations', () => {
      it('returns facet counts for tags when aggregations.counts is set', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          aggregations: { counts: ['tags'] },
        });

        expect(response.total).toBe(3);
        const tagsCounts = response.counts?.tags as Record<string, number> | undefined;
        expect(tagsCounts).toBeDefined();
        // rule-a + rule-b both have tag-a; only rule-b has tag-b; only rule-c has tag-c
        expect(tagsCounts?.['tag-a']).toBe(2);
        expect(tagsCounts?.['tag-b']).toBe(1);
        expect(tagsCounts?.['tag-c']).toBe(1);
      });

      it('filter intersects with aggregations.counts', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: 'alert.attributes.tags: "tag-a"',
          aggregations: { counts: ['tags'] },
        });

        expect(response.total).toBe(2);
        const tagsCounts = response.counts?.tags as Record<string, number> | undefined;
        expect(tagsCounts).toBeDefined();
        expect(tagsCounts?.['tag-a']).toBe(2);
        expect(tagsCounts?.['tag-b']).toBe(1);
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

    describe('Field selection', () => {
      it('narrows current_rule / target_rule payloads to the requested fields plus baseline identity fields', async () => {
        await setUpRuleUpgrade({
          assets: [
            {
              installed: {
                rule_id: 'rule-a',
                type: 'query',
                name: 'Initial name',
                tags: ['tag-a'],
                description: 'Initial description',
                version: 1,
              },
              patch: {},
              upgrade: {
                rule_id: 'rule-a',
                type: 'query',
                name: 'Updated name',
                tags: ['tag-a'],
                description: 'Updated description',
                version: 2,
              },
            },
          ],
          deps,
        });

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          fields: ['tags'],
        });

        expect(response.rules).toHaveLength(1);
        const [entry] = response.rules;
        const currentKeys = Object.keys(entry.current_rule);
        const targetKeys = Object.keys(entry.target_rule);

        // Requested field is present.
        expect(currentKeys).toContain('tags');
        expect(targetKeys).toContain('tags');

        // Baseline identity fields are always preserved on both sides.
        for (const baseline of ['rule_id', 'id', 'version', 'type', 'name']) {
          expect(currentKeys).toContain(baseline);
          expect(targetKeys).toContain(baseline);
        }

        // Non-requested, non-baseline fields are filtered out. `description` is a
        // recognizable leaf that isn't in the baseline set.
        expect(currentKeys).not.toContain('description');
        expect(targetKeys).not.toContain('description');

        // The three-way diff entries are always preserved, even when `fields` narrows
        // the flat rule payloads. `description` changed so it should still be listed here.
        expect(Object.keys(entry.diff.fields)).toContain('description');
      });
    });

    describe('Scoping by signature rule_id via KQL', () => {
      it('scopes the upgradeable set to a single rule via `alert.attributes.params.ruleId`', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: 'alert.attributes.params.ruleId: "rule-a"',
        });

        expect(response.total).toBe(1);
        expect(response.rules.map((r) => r.rule_id)).toEqual(['rule-a']);
      });

      it('composes a ruleId scope with a tag filter', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter:
            '(alert.attributes.params.ruleId: ("rule-a" OR "rule-b")) AND (alert.attributes.tags: "tag-b")',
        });

        expect(response.total).toBe(1);
        expect(response.rules.map((r) => r.rule_id)).toEqual(['rule-b']);
      });

      it('returns an empty page for an unknown ruleId scope', async () => {
        await setUpThreeUpgradeableRules();

        const response = await reviewPrebuiltRulesToUpgrade(supertest, {
          filter: 'alert.attributes.params.ruleId: "does-not-exist"',
        });

        expect(response.total).toBe(0);
        expect(response.rules).toEqual([]);
      });
    });

    describe('Sorting', () => {
      it('applies the first sort item as the field/order for the upgradeable set', async () => {
        await setUpThreeUpgradeableRules();

        const ascResponse = await reviewPrebuiltRulesToUpgrade(supertest, {
          sort: [{ field: 'name', order: 'asc' }],
        });
        const descResponse = await reviewPrebuiltRulesToUpgrade(supertest, {
          sort: [{ field: 'name', order: 'desc' }],
        });

        const ascOrder = ascResponse.rules.map((r) => r.current_rule.name);
        const descOrder = descResponse.rules.map((r) => r.current_rule.name);

        expect(ascOrder).toEqual([...ascOrder].sort());
        expect(descOrder).toEqual([...ascOrder].sort().reverse());
      });
    });
  });
};
