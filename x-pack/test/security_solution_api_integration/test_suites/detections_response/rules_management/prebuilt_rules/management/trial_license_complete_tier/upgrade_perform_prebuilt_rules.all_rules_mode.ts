/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { cloneDeep } from 'lodash';
import {
  QueryRuleCreateFields,
  EqlRuleCreateFields,
  EsqlRuleCreateFields,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObjectOfType,
  installPrebuiltRules,
  performUpgradePrebuiltRules,
  patchRule,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  reviewPrebuiltRulesToUpgrade,
  getInstalledRules,
  createRuleAssetSavedObject,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Perform Prebuilt Rules Upgrades - mode: ALL_RULES', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    const CURRENT_NAME = 'My current name';
    const CURRENT_TAGS = ['current', 'tags'];
    const TARGET_NAME = 'My target name';
    const TARGET_TAGS = ['target', 'tags'];

    describe(`successful updates`, () => {
      const queryRule = createRuleAssetSavedObjectOfType<QueryRuleCreateFields>('query');
      const eqlRule = createRuleAssetSavedObjectOfType<EqlRuleCreateFields>('eql');
      const esqlRule = createRuleAssetSavedObjectOfType<EsqlRuleCreateFields>('esql');

      const basePrebuiltAssets = [queryRule, eqlRule, esqlRule];
      const basePrebuiltAssetsMap = createIdToRuleMap(
        basePrebuiltAssets.map((r) => r['security-rule'])
      );

      const targetPrebuiltAssets = basePrebuiltAssets.map((ruleAssetSavedObject) => {
        const targetObject = cloneDeep(ruleAssetSavedObject);
        targetObject['security-rule'].version += 1;
        targetObject['security-rule'].name = TARGET_NAME;
        targetObject['security-rule'].tags = TARGET_TAGS;

        return targetObject;
      });

      it('upgrades all upgreadeable rules fields to their BASE versions', async () => {
        // Install base prebuilt detection rule
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        // Create new versions of the assets of the installed rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        // Perform the upgrade, all rules' fields to their BASE versions
        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: 'ALL_RULES',
          pick_version: 'BASE',
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(3);
        performUpgradeResponse.results.updated.forEach((updatedRule) => {
          const matchingBaseAsset = basePrebuiltAssetsMap.get(updatedRule.rule_id);
          if (!matchingBaseAsset) {
            throw new Error(`Could not find matching base asset for rule ${updatedRule.rule_id}`);
          }

          // Rule Version should be incremented by 1
          // Rule Name and Tags should match the base asset's values, not the Target asset's values
          expect(updatedRule.version).toEqual(matchingBaseAsset.version + 1);
          expect(updatedRule.name).toEqual(matchingBaseAsset.name);
          expect(updatedRule.tags).toEqual(matchingBaseAsset.tags);
        });

        // Get installed rules
        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        for (const [ruleId, installedRule] of installedRulesMap) {
          const matchingBaseAsset = basePrebuiltAssetsMap.get(ruleId);
          expect(installedRule.name).toEqual(matchingBaseAsset?.name);
          expect(installedRule.tags).toEqual(matchingBaseAsset?.tags);
        }
      });

      it('upgrades all upgreadeable rules fields to their CURRENT versions', async () => {
        // Install base prebuilt detection rule
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        // Patch all 3 installed rules to create a current version for each
        for (const baseRule of basePrebuiltAssets) {
          await patchRule(supertest, log, {
            rule_id: baseRule['security-rule'].rule_id,
            name: CURRENT_NAME,
            tags: CURRENT_TAGS,
          });
        }

        // Create new versions of the assets of the installed rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        // Perform the upgrade, all rules' fields to their CURRENT versions
        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: 'ALL_RULES',
          pick_version: 'CURRENT',
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(3);

        performUpgradeResponse.results.updated.forEach((updatedRule) => {
          const matchingBaseAsset = basePrebuiltAssetsMap.get(updatedRule.rule_id);
          // Rule Version should be incremented by 1
          // Rule Query should match the current's version query
          if (matchingBaseAsset) {
            expect(updatedRule.version).toEqual(matchingBaseAsset.version + 1);
            expect(updatedRule.name).toEqual(CURRENT_NAME);
            expect(updatedRule.tags).toEqual(CURRENT_TAGS);
          } else {
            throw new Error(`Matching base asset not found for rule_id: ${updatedRule.rule_id}`);
          }
        });

        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        for (const [_, installedRule] of installedRulesMap) {
          expect(installedRule.name).toEqual(CURRENT_NAME);
          expect(installedRule.tags).toEqual(CURRENT_TAGS);
        }
      });

      it('upgrades all upgreadeable rules fields to their TARGET versions', async () => {
        // Install base prebuilt detection rule
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        // Patch all 3 installed rules to create a current version for each
        for (const baseRule of basePrebuiltAssets) {
          await patchRule(supertest, log, {
            rule_id: baseRule['security-rule'].rule_id,
            query: CURRENT_NAME,
            tags: CURRENT_TAGS,
          });
        }

        // Create new versions of the assets of the installed rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        // Perform the upgrade, all rules' fields to their CURRENT versions
        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: 'ALL_RULES',
          pick_version: 'TARGET',
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(3);

        performUpgradeResponse.results.updated.forEach((updatedRule) => {
          const matchingBaseAsset = basePrebuiltAssetsMap.get(updatedRule.rule_id);

          // Rule Version should be incremented by 1
          // Rule Query should match the current's version query
          if (matchingBaseAsset) {
            expect(updatedRule.version).toEqual(matchingBaseAsset.version + 1);
            expect(updatedRule.name).toEqual(TARGET_NAME);
            expect(updatedRule.tags).toEqual(TARGET_TAGS);
          } else {
            throw new Error(`Matching base asset not found for rule_id: ${updatedRule.rule_id}`);
          }
        });

        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        for (const [_, installedRule] of installedRulesMap) {
          expect(installedRule.name).toEqual(TARGET_NAME);
          expect(installedRule.tags).toEqual(TARGET_TAGS);
        }
      });

      it('upgrades all upgreadeable rules fields to their MERGED versions', async () => {
        // Install base prebuilt detection rule
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        // Create new versions of the assets of the installed rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        // Call the /upgrade/_review endpoint to save the calculated merged_versions
        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        const reviewRuleResponseMap = new Map(
          reviewResponse.rules.map((upgradeInfo) => [
            upgradeInfo.rule_id,
            {
              tags: upgradeInfo.diff.fields.tags?.merged_version,
              name: upgradeInfo.diff.fields.name?.merged_version,
            },
          ])
        );

        // Perform the upgrade, all rules' fields to their MERGED versions
        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: 'ALL_RULES',
          pick_version: 'MERGED',
        });
        const updatedRulesMap = createIdToRuleMap(performUpgradeResponse.results.updated);

        // All upgrades should succeed: neither query nor tags should have a merge conflict
        expect(performUpgradeResponse.summary.succeeded).toEqual(3);

        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        for (const [ruleId, installedRule] of installedRulesMap) {
          expect(installedRule.name).toEqual(updatedRulesMap.get(ruleId)?.name);
          expect(installedRule.name).toEqual(reviewRuleResponseMap.get(ruleId)?.name);
          expect(installedRule.tags).toEqual(updatedRulesMap.get(ruleId)?.tags);
          expect(installedRule.tags).toEqual(reviewRuleResponseMap.get(ruleId)?.tags);
        }
      });
    });

    describe('edge cases and unhappy paths', () => {
      const firstQueryRule = createRuleAssetSavedObject({
        type: 'query',
        language: 'kuery',
        rule_id: 'query-rule-1',
      });
      const secondQueryRule = createRuleAssetSavedObject({
        type: 'query',
        language: 'kuery',
        rule_id: 'query-rule-2',
      });
      const eqlRule = createRuleAssetSavedObject({
        type: 'eql',
        language: 'eql',
        rule_id: 'eql-rule',
      });

      const basePrebuiltAssets = [firstQueryRule, eqlRule, secondQueryRule];

      it('rejects all updates of rules which have a rule type change if the pick_version is not TARGET', async () => {
        // Install base prebuilt detection rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        // Mock a rule type change to 'ml' to the first two rules of the basePrebuiltAssets array
        const targetMLPrebuiltAssets = basePrebuiltAssets
          .slice(0, 2)
          .map((ruleAssetSavedObject) => {
            const targetObject = cloneDeep(ruleAssetSavedObject);

            return {
              ...targetObject,
              ...createRuleAssetSavedObject({
                rule_id: targetObject['security-rule'].rule_id,
                version: targetObject['security-rule'].version + 1,
                type: 'machine_learning',
                machine_learning_job_id: 'job_id',
                anomaly_threshold: 1,
              }),
            };
          });

        // Mock an normal update of the rule 'query-rule-2', with NO rule type change
        const targetAssetSameTypeUpdate = createRuleAssetSavedObject({
          type: 'query',
          language: 'kuery',
          rule_id: 'query-rule-2',
          version: 2,
        });

        // Create new versions of the assets of the installed rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
          ...targetMLPrebuiltAssets,
          targetAssetSameTypeUpdate,
        ]);

        // Perform the upgrade, all rules' fields to their BASE versions
        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: 'ALL_RULES',
          pick_version: 'BASE',
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(1); // update of same type
        expect(performUpgradeResponse.summary.failed).toEqual(2); // updates with rule type change

        expect(performUpgradeResponse.errors).toHaveLength(2);
        performUpgradeResponse.errors.forEach((error) => {
          const ruleId = error.rules[0].rule_id;
          expect(error.message).toContain(
            `Rule update for rule ${ruleId} has a rule type change. All 'pick_version' values for rule must match 'TARGET'`
          );
        });
      });

      it('rejects updates of rules with a pick_version of MERGED which have fields which result in conflicts in the three way diff calculations', async () => {
        // Install base prebuilt detection rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        // Patch all 3 installed rules to create a current version for each
        for (const baseRule of basePrebuiltAssets) {
          await patchRule(supertest, log, {
            rule_id: baseRule['security-rule'].rule_id,
            name: CURRENT_NAME,
            tags: CURRENT_TAGS,
          });
        }

        const targetPrebuiltAssets = basePrebuiltAssets.map((ruleAssetSavedObject) => {
          const targetObject = cloneDeep(ruleAssetSavedObject);
          targetObject['security-rule'].version += 1;
          targetObject['security-rule'].name = TARGET_NAME;
          targetObject['security-rule'].tags = TARGET_TAGS;

          return targetObject;
        });

        // Create new versions of the assets of the installed rules
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        // Perform the upgrade, all rules' fields to their MERGED versions
        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: 'ALL_RULES',
          pick_version: 'MERGED',
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(0); // all rules have conflicts
        expect(performUpgradeResponse.summary.failed).toEqual(3); // all rules have conflicts

        performUpgradeResponse.errors.forEach((error) => {
          const ruleId = error.rules[0].rule_id;
          expect(error.message).toContain(
            `Merge conflicts found in rule '${ruleId}' for fields: name, tags. Please resolve the conflict manually or choose another value for 'pick_version'`
          );
        });
      });
    });
  });
};

function createIdToRuleMap(rules: Array<PrebuiltRuleAsset | RuleResponse>) {
  return new Map(rules.map((rule) => [rule.rule_id, rule]));
}
