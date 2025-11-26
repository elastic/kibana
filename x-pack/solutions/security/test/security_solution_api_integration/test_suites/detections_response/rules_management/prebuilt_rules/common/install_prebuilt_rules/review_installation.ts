/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
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
          // TODO: Fix types here - page and per_page shouldn't be required
          page: 1,
          per_page: 20,
          sort: [{ field: 'name', order: 'asc' }],
        });

        expect(ascSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, name: 'Rule 1' }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, name: 'Rule 2' }),
          expect.objectContaining({ rule_id: 'rule-3', version: 1, name: 'Rule 3' }),
        ]);

        const descSortResponse = await reviewPrebuiltRulesToInstall(supertest, {
          page: 1,
          per_page: 20,
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
          page: 1,
          per_page: 20,
          sort: [{ field: 'severity', order: 'asc' }],
        });

        expect(ascSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-2', version: 1, severity: 'low' }),
          expect.objectContaining({ rule_id: 'rule-1', version: 2, severity: 'medium' }),
          expect.objectContaining({ rule_id: 'rule-4', version: 1, severity: 'high' }),
          expect.objectContaining({ rule_id: 'rule-3', version: 1, severity: 'critical' }),
        ]);

        const descSortResponse = await reviewPrebuiltRulesToInstall(supertest, {
          page: 1,
          per_page: 20,
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
          page: 1,
          per_page: 20,
          sort: [{ field: 'risk_score', order: 'asc' }],
        });

        expect(ascSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-1', version: 1, risk_score: 1 }),
          expect.objectContaining({ rule_id: 'rule-3', version: 1, risk_score: 11 }),
          expect.objectContaining({ rule_id: 'rule-2', version: 1, risk_score: 100 }),
        ]);

        const descSortResponse = await reviewPrebuiltRulesToInstall(supertest, {
          page: 1,
          per_page: 20,
          sort: [{ field: 'risk_score', order: 'desc' }],
        });

        expect(descSortResponse.rules).toEqual([
          expect.objectContaining({ rule_id: 'rule-2', version: 1, risk_score: 100 }),
          expect.objectContaining({ rule_id: 'rule-3', version: 1, risk_score: 11 }),
          expect.objectContaining({ rule_id: 'rule-1', version: 1, risk_score: 1 }),
        ]);
      });
    });
  });
};
