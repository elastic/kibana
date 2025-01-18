/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObject,
  installPrebuiltRules,
  // createPrebuiltRuleAssetSavedObjects,
  reviewPrebuiltRulesToUpgrade,
  // patchRule,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  patchRule,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI review prebuilt rules updates', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe(`the endpoint stats -`, () => {
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, name: 'A' }),
        createRuleAssetSavedObject({ rule_id: 'rule-2', version: 1, name: 'A' }),
        createRuleAssetSavedObject({ rule_id: 'rule-3', version: 1, name: 'A' }),
      ];

      it('should show how many rules have upgrades', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const updatedRuleAssetSavedObjects = ['rule-1', 'rule-2', 'rule-3'].map((ruleId) =>
          createRuleAssetSavedObject({
            rule_id: ruleId,
            name: 'A',
            version: 2,
          })
        );

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(3);
        expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
        expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
      });

      it('should show how many rules have updates with conflicts', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        // Customize a scalar array field on the installed rules to generate a solvable conflict
        for (const ruleId of ['rule-1', 'rule-2', 'rule-3']) {
          await patchRule(supertest, log, {
            rule_id: ruleId,
            tags: ['one', 'two', 'four'],
          });
        }

        const updatedRuleAssetSavedObjects = ['rule-1', 'rule-2', 'rule-3'].map((ruleId) =>
          createRuleAssetSavedObject({
            rule_id: ruleId,
            name: 'A',
            version: 2,
            tags: ['one', 'two', 'FOUR'],
          })
        );

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(3);
        expect(reviewResponse.stats.num_rules_with_conflicts).toBe(3);
        expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
      });

      it('should show how many rules have updates with non-solvable conflicts', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        // Customize a scalar array field on the installed rules to generate a solvable conflict
        for (const ruleId of ['rule-1', 'rule-2', 'rule-3']) {
          await patchRule(supertest, log, {
            rule_id: ruleId,
            tags: ['one', 'two', 'four'],
          });
        }

        // Customize a single-line field on two installed rules to generate a non-solvable conflict
        for (const ruleId of ['rule-2', 'rule-3']) {
          await patchRule(supertest, log, {
            rule_id: ruleId,
            name: 'B',
          });
        }

        const updatedRuleAssetSavedObjects = ['rule-1', 'rule-2', 'rule-3'].map((ruleId) =>
          createRuleAssetSavedObject({
            rule_id: ruleId,
            name: 'C',
            version: 2,
            tags: ['one', 'two', 'FOUR'],
          })
        );

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(3);
        expect(reviewResponse.stats.num_rules_with_conflicts).toBe(3);
        expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(2);
      });
    });
  });
};
