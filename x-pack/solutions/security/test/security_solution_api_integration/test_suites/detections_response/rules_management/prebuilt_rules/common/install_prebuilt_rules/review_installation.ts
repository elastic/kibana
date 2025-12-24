/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObject,
  deleteAllPrebuiltRuleAssets,
  reviewPrebuiltRulesToInstall,
} from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Review installation using mocked prebuilt rule assets', () => {
    beforeEach(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    describe('Using endpoint without providing all parameters', () => {
      it('called without parameters - returns all rules', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest);

        expect(response).toMatchObject({
          rules: [
            expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
            expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
          ],
          page: 1,
          per_page: 10_000,
        });
      });

      it('called with an empty object - returns all rules', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest, {});

        expect(response).toMatchObject({
          rules: [
            expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
            expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
          ],
          page: 1,
          per_page: 10_000,
        });
      });

      it('called with `per_page` only - respects `per_page` parameter', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest, {
          per_page: 1,
        });

        expect(response).toMatchObject({
          rules: [expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' })],
          page: 1,
          per_page: 1,
        });
      });
    });

    describe('Pagination', () => {
      it('returns page and per_page passed in the request', async () => {
        const response = await reviewPrebuiltRulesToInstall(supertest, {
          page: 1,
          per_page: 5,
        });

        expect(response).toMatchObject({
          page: 1,
          per_page: 5,
        });

        const response2 = await reviewPrebuiltRulesToInstall(supertest, {
          page: 2,
          per_page: 20,
        });

        expect(response2).toMatchObject({
          page: 2,
          per_page: 20,
        });
      });

      it('returns the correct number of rules per page', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-3', version: 1 }),
        ];
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest, {
          page: 1,
          per_page: 2,
        });

        expect(response.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1 }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1 }),
        ]);

        const response2 = await reviewPrebuiltRulesToInstall(supertest, {
          page: 2,
          per_page: 2,
        });

        expect(response2.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-3', version: 1 }),
        ]);
      });
    });

    describe('Counts', () => {
      it('when filter matches all rules, number of installable rules is the same as the number of rules matching the filter', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { name: { include: ['Rule'] } } },
        });

        expect(response).toMatchObject({
          stats: {
            num_rules_to_install: 2,
          },
          total: 2,
        });
      });

      it('when filter is not provided, number of installable rules is the same as the number of rules matching the filter', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1 }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest);

        expect(response).toMatchObject({
          stats: {
            num_rules_to_install: 2,
          },
          total: 2,
        });
      });

      it('when some rules are filtered out, number of installable rules is bigger than the number of rules matching the filter', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, tags: ['tag-a', 'tag-b'] }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, tags: ['tag-b'] }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { tags: { include: ['tag-a'] } } },
        });

        expect(response).toMatchObject({
          stats: {
            num_rules_to_install: 2,
          },
          total: 1,
        });
      });
    });

    describe('Tags', () => {
      it('returns tags from all installable rules even if a filter is provided', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, tags: ['tag-a', 'tag-b'] }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, tags: ['tag-b'] }),
          createRuleAssetSavedObject({ rule_id: 'rule-3', version: 1, tags: ['tag-c'] }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { tags: { include: ['tag-a'] } } },
        });

        expect(response.stats.tags).toEqual(['tag-a', 'tag-b', 'tag-c']);
      });

      it('tags are sorted alphabetically', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({
            rule_id: 'rule-1',
            version: 1,
            tags: ['tag-b', 'tag-a', 'tag-c'],
          }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest);

        expect(response.stats.tags).toEqual(['tag-a', 'tag-b', 'tag-c']);
      });
    });

    describe('Sorting', () => {
      it('sorts rules by name', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
          createRuleAssetSavedObject({ rule_id: 'rule-3', version: 1, name: 'Rule 3' }),
        ];
        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const ascSortResponse = await reviewPrebuiltRulesToInstall(supertest, {
          sort: [{ field: 'name', order: 'asc' }],
        });

        expect(ascSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
          expect.objectContaining({ rule_id: 'rule-3', version: 1, name: 'Rule 3' }),
        ]);

        const descSortResponse = await reviewPrebuiltRulesToInstall(supertest, {
          sort: [{ field: 'name', order: 'desc' }],
        });

        expect(descSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-3', version: 1, name: 'Rule 3' }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
          expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
        ]);
      });

      it('sorts rules by severity', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, severity: 'low' }),
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 2, severity: 'medium' }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, severity: 'low' }),
          createRuleAssetSavedObject({ rule_id: 'rule-3', version: 1, severity: 'critical' }),
          createRuleAssetSavedObject({ rule_id: 'rule-4', version: 1, severity: 'high' }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const ascSortResponse = await reviewPrebuiltRulesToInstall(supertest, {
          sort: [{ field: 'severity', order: 'asc' }],
        });

        expect(ascSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-2', version: 1, severity: 'low' }),
          expect.objectContaining({ rule_id: 'rule-1', version: 2, severity: 'medium' }),
          expect.objectContaining({ rule_id: 'rule-4', version: 1, severity: 'high' }),
          expect.objectContaining({ rule_id: 'rule-3', version: 1, severity: 'critical' }),
        ]);

        const descSortResponse = await reviewPrebuiltRulesToInstall(supertest, {
          sort: [{ field: 'severity', order: 'desc' }],
        });

        expect(descSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-3', version: 1, severity: 'critical' }),
          expect.objectContaining({ rule_id: 'rule-4', version: 1, severity: 'high' }),
          expect.objectContaining({ rule_id: 'rule-1', version: 2, severity: 'medium' }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, severity: 'low' }),
        ]);
      });

      it('sorts rules by risk score', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, risk_score: 1 }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, risk_score: 100 }),
          createRuleAssetSavedObject({ rule_id: 'rule-3', version: 1, risk_score: 11 }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const ascSortResponse = await reviewPrebuiltRulesToInstall(supertest, {
          sort: [{ field: 'risk_score', order: 'asc' }],
        });

        expect(ascSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, risk_score: 1 }),
          expect.objectContaining({ rule_id: 'rule-3', version: 1, risk_score: 11 }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, risk_score: 100 }),
        ]);

        const descSortResponse = await reviewPrebuiltRulesToInstall(supertest, {
          sort: [{ field: 'risk_score', order: 'desc' }],
        });

        expect(descSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-2', version: 1, risk_score: 100 }),
          expect.objectContaining({ rule_id: 'rule-3', version: 1, risk_score: 11 }),
          expect.objectContaining({ rule_id: 'rule-1', version: 1, risk_score: 1 }),
        ]);
      });
    });

    describe('Filtering', () => {
      it('no filter provided', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest);

        expect(response.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ]);
      });

      it('filters rules by name - empty filter provided', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const emptyNameResponse = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { name: {} } },
        });

        expect(emptyNameResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ]);

        const emptyNameResponse2 = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { name: { include: [] } } },
        });

        expect(emptyNameResponse2.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ]);

        const emptyNameResponse3 = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { name: { include: [''] } } },
        });

        expect(emptyNameResponse3.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
        ]);
      });

      it('filters rules by name - wildcard matching', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'My rule 1' }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, name: 'My rule 2' }),
          createRuleAssetSavedObject({ rule_id: 'rule-3', version: 1, name: 'My rule 3' }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const wildcardResponse = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { name: { include: ['My rule 1'] } } },
        });

        expect(wildcardResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'My rule 1' }),
        ]);

        const wildcardResponse2 = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { name: { include: ['rule'] } } },
        });

        expect(wildcardResponse2.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'My rule 1' }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'My rule 2' }),
          expect.objectContaining({ rule_id: 'rule-3', version: 1, name: 'My rule 3' }),
        ]);
      });

      it('filters rules by tags - empty filter provided', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, tags: ['tag-a', 'tag-b'] }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, tags: ['tag-b', 'tag-c'] }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const emptyTagResponse = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { tags: { include: [] } } },
        });

        expect(emptyTagResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, tags: ['tag-a', 'tag-b'] }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, tags: ['tag-b', 'tag-c'] }),
        ]);
      });

      it('filters rules by tags - single tag', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, tags: ['tag-a', 'tag-b'] }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, tags: ['tag-b', 'tag-c'] }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const singleTagResponse = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { tags: { include: ['tag-a'] } } },
        });

        expect(singleTagResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, tags: ['tag-a', 'tag-b'] }),
        ]);

        const singleTagResponse2 = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { tags: { include: ['tag-b'] } } },
        });

        expect(singleTagResponse2.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, tags: ['tag-a', 'tag-b'] }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, tags: ['tag-b', 'tag-c'] }),
        ]);

        const singleTagResponse3 = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { tags: { include: ['tag-d'] } } },
        });

        expect(singleTagResponse3.rules).toEqual([]);
      });

      it('filters rules by tags - multiple tags use AND logic', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, tags: ['tag-a', 'tag-b'] }),
          createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, tags: ['tag-b', 'tag-c'] }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const multipleTagsResponse = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { tags: { include: ['tag-a', 'tag-b'] } } },
        });

        expect(multipleTagsResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, tags: ['tag-a', 'tag-b'] }),
        ]);

        const multipleTagsResponse2 = await reviewPrebuiltRulesToInstall(supertest, {
          filter: { fields: { tags: { include: ['tag-a', 'tag-c'] } } },
        });

        expect(multipleTagsResponse2.rules).toEqual([]);
      });
    });

    describe('Sorting and filtering together', () => {
      it('correctly applies sorting and filtering when both are provided', async () => {
        const ruleAssets = [
          createRuleAssetSavedObject({
            rule_id: 'rule-1',
            version: 1,
            name: 'Rule 1',
            tags: ['tag-a', 'tag-b'],
          }),
          createRuleAssetSavedObject({
            rule_id: 'rule-2',
            version: 1,
            name: 'Rule 2',
            tags: ['tag-b', 'tag-c'],
          }),
          createRuleAssetSavedObject({
            rule_id: 'rule-3',
            version: 1,
            name: 'Rule 3',
            tags: ['tag-c'],
          }),
        ];

        await createPrebuiltRuleAssetSavedObjects(es, ruleAssets);

        const response = await reviewPrebuiltRulesToInstall(supertest, {
          sort: [{ field: 'name', order: 'desc' }],
          filter: { fields: { tags: { include: ['tag-b'] } } },
        });

        expect(response.rules).toEqual([
          expect.objectContaining({
            rule_id: 'rule-2',
            version: 1,
            name: 'Rule 2',
            tags: ['tag-b', 'tag-c'],
          }),
          expect.objectContaining({
            rule_id: 'rule-1',
            version: 1,
            name: 'Rule 1',
            tags: ['tag-a', 'tag-b'],
          }),
        ]);
      });
    });
  });
};
