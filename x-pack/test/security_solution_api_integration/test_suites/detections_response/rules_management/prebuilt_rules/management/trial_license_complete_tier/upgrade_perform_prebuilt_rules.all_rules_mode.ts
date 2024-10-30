/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type SuperTest from 'supertest';
import { cloneDeep } from 'lodash';
import {
  QueryRuleCreateFields,
  EqlRuleCreateFields,
  EsqlRuleCreateFields,
  RuleResponse,
  ThreatMatchRuleCreateFields,
  ThreatMatchRule,
  FIELDS_TO_UPGRADE_TO_CURRENT_VERSION,
  ModeEnum,
  AllFieldsDiff,
  DataSourceIndexPatterns,
  QueryRule,
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
  getWebHookAction,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

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
          mode: ModeEnum.ALL_RULES,
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
          mode: ModeEnum.ALL_RULES,
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
          mode: ModeEnum.ALL_RULES,
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
          mode: ModeEnum.ALL_RULES,
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

      it('correctly upgrades rules with DataSource diffs to their MERGED versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [queryRule]);
        await installPrebuiltRules(es, supertest);

        const targetObject = cloneDeep(queryRule);
        targetObject['security-rule'].version += 1;
        targetObject['security-rule'].name = TARGET_NAME;
        targetObject['security-rule'].tags = TARGET_TAGS;
        targetObject['security-rule'].index = ['auditbeat-*'];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetObject]);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        const ruleDiffFields = reviewResponse.rules[0].diff.fields as AllFieldsDiff;

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'MERGED',
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(1);

        const installedRules = await getInstalledRules(supertest);
        const installedRule = installedRules.data[0] as QueryRule;

        expect(installedRule.name).toEqual(ruleDiffFields.name.merged_version);
        expect(installedRule.tags).toEqual(ruleDiffFields.tags.merged_version);

        // Check that the updated rules has an `index` field which equals the output of the diff algorithm
        // for the DataSource diffable field, and that the data_view_id is correspondingly set to undefined.
        expect(installedRule.index).toEqual(
          (ruleDiffFields.data_source.merged_version as DataSourceIndexPatterns).index_patterns
        );
        expect(installedRule.data_view_id).toBe(undefined);
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
          mode: ModeEnum.ALL_RULES,
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
          mode: ModeEnum.ALL_RULES,
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

      it('preserves FIELDS_TO_UPGRADE_TO_CURRENT_VERSION when upgrading to TARGET version with undefined fields', async () => {
        const baseRule =
          createRuleAssetSavedObjectOfType<ThreatMatchRuleCreateFields>('threat_match');
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [baseRule]);
        await installPrebuiltRules(es, supertest);

        const ruleId = baseRule['security-rule'].rule_id;

        const installedBaseRule = (
          await securitySolutionApi.readRule({
            query: {
              rule_id: ruleId,
            },
          })
        ).body as ThreatMatchRule;

        // Patch the installed rule to set all FIELDS_TO_UPGRADE_TO_CURRENT_VERSION to some defined value
        const currentValues: { [key: string]: unknown } = {
          enabled: true,
          exceptions_list: [
            {
              id: 'test-list',
              list_id: 'test-list',
              type: 'detection',
              namespace_type: 'single',
            } as const,
          ],
          alert_suppression: {
            group_by: ['host.name'],
            duration: { value: 5, unit: 'm' as const },
          },
          actions: [await createAction(supertest)],
          response_actions: [
            {
              params: {
                command: 'isolate' as const,
                comment: 'comment',
              },
              action_type_id: '.endpoint' as const,
            },
          ],
          meta: { some_key: 'some_value' },
          output_index: '.siem-signals-default',
          namespace: 'default',
          concurrent_searches: 5,
          items_per_search: 100,
        };

        await securitySolutionApi.updateRule({
          body: {
            ...installedBaseRule,
            ...currentValues,
            id: undefined,
          },
        });

        // Create a target version with undefined values for these fields
        const targetRule = cloneDeep(baseRule);
        targetRule['security-rule'].version += 1;
        FIELDS_TO_UPGRADE_TO_CURRENT_VERSION.forEach((field) => {
          // @ts-expect-error
          targetRule['security-rule'][field] = undefined;
        });
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetRule]);

        // Perform the upgrade
        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'TARGET',
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(1);
        const upgradedRule = performUpgradeResponse.results.updated[0] as ThreatMatchRule;

        // Check that all FIELDS_TO_UPGRADE_TO_CURRENT_VERSION still have their "current" values
        FIELDS_TO_UPGRADE_TO_CURRENT_VERSION.forEach((field) => {
          expect(upgradedRule[field]).toEqual(currentValues[field]);
        });

        // Verify the installed rule
        const installedRules = await getInstalledRules(supertest);
        const installedRule = installedRules.data.find(
          (rule) => rule.rule_id === baseRule['security-rule'].rule_id
        ) as ThreatMatchRule;

        FIELDS_TO_UPGRADE_TO_CURRENT_VERSION.forEach((field) => {
          expect(installedRule[field]).toEqual(currentValues[field]);
        });
      });
    });
  });
};

function createIdToRuleMap(rules: Array<PrebuiltRuleAsset | RuleResponse>) {
  return new Map(rules.map((rule) => [rule.rule_id, rule]));
}

async function createAction(supertest: SuperTest.Agent) {
  const createConnector = async (payload: Record<string, unknown>) =>
    (
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'true')
        .send(payload)
        .expect(200)
    ).body;

  const createWebHookConnector = () => createConnector(getWebHookAction());

  const webHookAction = await createWebHookConnector();

  const defaultRuleAction = {
    id: webHookAction.id,
    action_type_id: '.webhook' as const,
    group: 'default' as const,
    params: {
      body: '{"test":"a default action"}',
    },
    frequency: {
      notifyWhen: 'onThrottleInterval' as const,
      summary: true,
      throttle: '1h' as const,
    },
    uuid: 'd487ec3d-05f2-44ad-8a68-11c97dc92202',
  };

  return defaultRuleAction;
}
