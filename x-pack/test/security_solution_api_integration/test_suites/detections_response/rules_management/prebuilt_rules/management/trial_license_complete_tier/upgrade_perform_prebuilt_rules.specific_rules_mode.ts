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
  ThreatMatchRuleCreateFields,
  RuleResponse,
  ModeEnum,
  PickVersionValues,
  RuleEqlQuery,
  EqlRule,
  FIELDS_TO_UPGRADE_TO_CURRENT_VERSION,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import { ThreatMatchRule } from '@kbn/security-solution-plugin/common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObjectOfType,
  installPrebuiltRules,
  performUpgradePrebuiltRules,
  patchRule,
  getInstalledRules,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  reviewPrebuiltRulesToUpgrade,
  createRuleAssetSavedObject,
  getWebHookAction,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  describe('@ess @serverless @skipInServerlessMKI Perform Prebuilt Rules Upgrades - mode: SPECIFIC_RULES', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    const CURRENT_NAME = 'My current name';
    const CURRENT_TAGS = ['current', 'tags'];
    const TARGET_NAME = 'My target name';
    const TARGET_TAGS = ['target', 'tags'];

    describe('successful updates', () => {
      const queryRule = createRuleAssetSavedObjectOfType<QueryRuleCreateFields>('query');
      const eqlRule = createRuleAssetSavedObjectOfType<EqlRuleCreateFields>('eql');
      const esqlRule = createRuleAssetSavedObjectOfType<EsqlRuleCreateFields>('esql');

      const basePrebuiltAssets = [queryRule, eqlRule, esqlRule];

      const targetPrebuiltAssets = basePrebuiltAssets.map((ruleAssetSavedObject) => {
        const targetObject = cloneDeep(ruleAssetSavedObject);
        targetObject['security-rule'].version += 1;
        targetObject['security-rule'].name = TARGET_NAME;
        targetObject['security-rule'].tags = TARGET_TAGS;
        return targetObject;
      });

      it('upgrades specific rules to their BASE versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        const rulesToUpgrade = basePrebuiltAssets.map((rule) => ({
          rule_id: rule['security-rule'].rule_id,
          revision: 0,
          version: rule['security-rule'].version + 1,
        }));

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'BASE',
          rules: rulesToUpgrade,
        });

        const expectedResults = basePrebuiltAssets.map((asset) => ({
          rule_id: asset['security-rule'].rule_id,
          version: asset['security-rule'].version + 1,
          name: asset['security-rule'].name,
          tags: asset['security-rule'].tags,
        }));

        expect(performUpgradeResponse.summary.succeeded).toEqual(basePrebuiltAssets.length);

        performUpgradeResponse.results.updated.forEach((updatedRule) => {
          const expected = expectedResults.find((r) => r.rule_id === updatedRule.rule_id);
          expect(updatedRule.version).toEqual(expected?.version);
          expect(updatedRule.name).toEqual(expected?.name);
          expect(updatedRule.tags).toEqual(expected?.tags);
        });

        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        expectedResults.forEach((expected) => {
          const installedRule = installedRulesMap.get(expected.rule_id);
          expect(installedRule?.name).toEqual(expected.name);
          expect(installedRule?.tags).toEqual(expected.tags);
        });
      });

      it('upgrades specific rules to their CURRENT versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        for (const baseRule of basePrebuiltAssets) {
          await patchRule(supertest, log, {
            rule_id: baseRule['security-rule'].rule_id,
            name: CURRENT_NAME,
            tags: CURRENT_TAGS,
          });
        }

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        const rulesToUpgrade = basePrebuiltAssets.map((rule) => ({
          rule_id: rule['security-rule'].rule_id,
          revision: 1,
          version: rule['security-rule'].version + 1,
        }));

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'CURRENT',
          rules: rulesToUpgrade,
        });

        const expectedResults = basePrebuiltAssets.map((asset) => ({
          rule_id: asset['security-rule'].rule_id,
          name: CURRENT_NAME,
          tags: CURRENT_TAGS,
        }));

        expect(performUpgradeResponse.summary.succeeded).toEqual(basePrebuiltAssets.length);

        performUpgradeResponse.results.updated.forEach((updatedRule) => {
          const expected = expectedResults.find((r) => r.rule_id === updatedRule.rule_id);
          expect(updatedRule.name).toEqual(expected?.name);
          expect(updatedRule.tags).toEqual(expected?.tags);
        });

        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        expectedResults.forEach((expected) => {
          const installedRule = installedRulesMap.get(expected.rule_id);
          expect(installedRule?.name).toEqual(expected.name);
          expect(installedRule?.tags).toEqual(expected.tags);
        });
      });

      it('upgrades specific rules to their TARGET versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        const rulesToUpgrade = basePrebuiltAssets.map((rule) => ({
          rule_id: rule['security-rule'].rule_id,
          revision: 0,
          version: rule['security-rule'].version + 1,
        }));

        const expectedResults = basePrebuiltAssets.map((asset) => ({
          rule_id: asset['security-rule'].rule_id,
          name: TARGET_NAME,
          tags: TARGET_TAGS,
        }));

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'TARGET',
          rules: rulesToUpgrade,
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(basePrebuiltAssets.length);

        performUpgradeResponse.results.updated.forEach((updatedRule) => {
          const expected = expectedResults.find((r) => r.rule_id === updatedRule.rule_id);
          expect(updatedRule.name).toEqual(expected?.name);
          expect(updatedRule.tags).toEqual(expected?.tags);
        });

        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        expectedResults.forEach((expected) => {
          const installedRule = installedRulesMap.get(expected.rule_id);
          expect(installedRule?.name).toEqual(expected.name);
          expect(installedRule?.tags).toEqual(expected.tags);
        });
      });

      it('upgrades specific rules to their MERGED versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        const expectedResults = reviewResponse.rules.map((upgradeInfo) => ({
          rule_id: upgradeInfo.rule_id,
          name: upgradeInfo.diff.fields.name?.merged_version,
          tags: upgradeInfo.diff.fields.tags?.merged_version,
        }));

        const rulesToUpgrade = basePrebuiltAssets.map((rule) => ({
          rule_id: rule['security-rule'].rule_id,
          revision: 0,
          version: rule['security-rule'].version + 1,
        }));

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'MERGED',
          rules: rulesToUpgrade,
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(basePrebuiltAssets.length);

        performUpgradeResponse.results.updated.forEach((updatedRule) => {
          const expected = expectedResults.find((r) => r.rule_id === updatedRule.rule_id);
          expect(updatedRule.name).toEqual(expected?.name);
          expect(updatedRule.tags).toEqual(expected?.tags);
        });

        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        expectedResults.forEach((expected) => {
          const installedRule = installedRulesMap.get(expected.rule_id);
          expect(installedRule?.name).toEqual(expected.name);
          expect(installedRule?.tags).toEqual(expected.tags);
        });
      });

      it('upgrades specific rules to their TARGET versions but overrides some fields with `fields` in the request payload', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        const rulesToUpgrade = basePrebuiltAssets.map((rule) => ({
          rule_id: rule['security-rule'].rule_id,
          revision: 0,
          version: rule['security-rule'].version + 1,
          fields: {
            name: { pick_version: 'BASE' as PickVersionValues },
          },
        }));

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'TARGET',
          rules: rulesToUpgrade,
        });

        const expectedResults = basePrebuiltAssets.map((asset) => ({
          rule_id: asset['security-rule'].rule_id,
          name: asset['security-rule'].name,
          tags: TARGET_TAGS,
        }));

        expect(performUpgradeResponse.summary.succeeded).toEqual(basePrebuiltAssets.length);

        performUpgradeResponse.results.updated.forEach((updatedRule) => {
          const expected = expectedResults.find((r) => r.rule_id === updatedRule.rule_id);
          expect(updatedRule.name).toEqual(expected?.name);
          expect(updatedRule.tags).toEqual(expected?.tags);
        });

        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        expectedResults.forEach((expected) => {
          const installedRule = installedRulesMap.get(expected.rule_id);
          expect(installedRule?.name).toEqual(expected.name);
          expect(installedRule?.tags).toEqual(expected.tags);
        });
      });

      it('upgrades specific rules with different pick_version at global, rule, and field levels', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        for (const baseRule of basePrebuiltAssets) {
          await patchRule(supertest, log, {
            rule_id: baseRule['security-rule'].rule_id,
            name: CURRENT_NAME,
            tags: CURRENT_TAGS,
          });
        }

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, targetPrebuiltAssets);

        const rulesToUpgrade = [
          {
            rule_id: basePrebuiltAssets[0]['security-rule'].rule_id,
            revision: 1,
            version: basePrebuiltAssets[0]['security-rule'].version + 1,
            pick_version: 'CURRENT' as PickVersionValues,
          },
          {
            rule_id: basePrebuiltAssets[1]['security-rule'].rule_id,
            revision: 1,
            version: basePrebuiltAssets[1]['security-rule'].version + 1,
            fields: {
              name: { pick_version: 'TARGET' as PickVersionValues },
              tags: { pick_version: 'BASE' as PickVersionValues },
            },
          },
          {
            rule_id: basePrebuiltAssets[2]['security-rule'].rule_id,
            revision: 1,
            version: basePrebuiltAssets[2]['security-rule'].version + 1,
          },
        ];

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'BASE',
          rules: rulesToUpgrade,
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(3);
        const updatedRulesMap = createIdToRuleMap(performUpgradeResponse.results.updated);

        const expectedResults = [
          { name: CURRENT_NAME, tags: CURRENT_TAGS },
          { name: TARGET_NAME, tags: basePrebuiltAssets[1]['security-rule'].tags },
          {
            name: basePrebuiltAssets[2]['security-rule'].name,
            tags: basePrebuiltAssets[2]['security-rule'].tags,
          },
        ];

        basePrebuiltAssets.forEach((asset, index) => {
          const ruleId = asset['security-rule'].rule_id;
          const updatedRule = updatedRulesMap.get(ruleId);
          expect(updatedRule?.name).toEqual(expectedResults[index].name);
          expect(updatedRule?.tags).toEqual(expectedResults[index].tags);
        });

        const installedRules = await getInstalledRules(supertest);
        const installedRulesMap = createIdToRuleMap(installedRules.data);

        basePrebuiltAssets.forEach((asset, index) => {
          const ruleId = asset['security-rule'].rule_id;
          const installedRule = installedRulesMap.get(ruleId);
          expect(installedRule?.name).toEqual(expectedResults[index].name);
          expect(installedRule?.tags).toEqual(expectedResults[index].tags);
        });
      });

      it('successfully resolves a non-resolvable conflict by using pick_version:RESOLVED for that field', async () => {
        const baseEqlRule = createRuleAssetSavedObjectOfType<EqlRuleCreateFields>('eql');
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [baseEqlRule]);
        await installPrebuiltRules(es, supertest);

        // Patch the installed rule to edit its query
        const patchedQuery = 'sequence by process.name [MY CURRENT QUERY]';
        await patchRule(supertest, log, {
          rule_id: baseEqlRule['security-rule'].rule_id,
          query: patchedQuery,
        });

        // Create a new version of the prebuilt rule asset with a different query and generate the conflict
        const targetEqlRule = cloneDeep(baseEqlRule);
        targetEqlRule['security-rule'].version += 1;
        targetEqlRule['security-rule'].query = 'sequence by process.name [MY TARGET QUERY]';
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetEqlRule]);

        const resolvedValue = {
          query: 'sequence by process.name [MY RESOLVED QUERY]',
          language: 'eql',
          filters: [],
        };

        // Perform the upgrade with manual conflict resolution
        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'MERGED',
          rules: [
            {
              rule_id: baseEqlRule['security-rule'].rule_id,
              revision: 1,
              version: baseEqlRule['security-rule'].version + 1,
              fields: {
                eql_query: {
                  pick_version: 'RESOLVED',
                  resolved_value: resolvedValue as RuleEqlQuery,
                },
              },
            },
          ],
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(1);
        const updatedRule = performUpgradeResponse.results.updated[0] as EqlRule;
        expect(updatedRule.rule_id).toEqual(baseEqlRule['security-rule'].rule_id);
        expect(updatedRule.query).toEqual(resolvedValue.query);
        expect(updatedRule.filters).toEqual(resolvedValue.filters);
        expect(updatedRule.language).toEqual(resolvedValue.language);

        const installedRules = await getInstalledRules(supertest);
        const installedRule = installedRules.data.find(
          (rule) => rule.rule_id === baseEqlRule['security-rule'].rule_id
        ) as EqlRule;
        expect(installedRule?.query).toEqual(resolvedValue.query);
        expect(installedRule?.filters).toEqual(resolvedValue.filters);
        expect(installedRule?.language).toEqual(resolvedValue.language);
      });
    });

    describe('edge cases and unhappy paths', () => {
      const queryRule = createRuleAssetSavedObject({
        type: 'query',
        language: 'kuery',
        rule_id: 'query-rule',
      });
      const eqlRule = createRuleAssetSavedObject({
        type: 'eql',
        language: 'eql',
        rule_id: 'eql-rule',
      });

      const basePrebuiltAssets = [queryRule, eqlRule];

      it('rejects updates when rule type changes and pick_version is not TARGET at all levels', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        const targetMLRule = createRuleAssetSavedObject({
          rule_id: queryRule['security-rule'].rule_id,
          version: queryRule['security-rule'].version + 1,
          type: 'machine_learning',
          machine_learning_job_id: 'job_id',
          anomaly_threshold: 1,
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetMLRule]);

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'BASE',
          rules: [
            {
              rule_id: queryRule['security-rule'].rule_id,
              revision: 0,
              version: queryRule['security-rule'].version + 1,
            },
          ],
        });

        expect(performUpgradeResponse.summary.failed).toEqual(1);
        expect(performUpgradeResponse.errors[0].message).toContain(
          'Rule update for rule query-rule has a rule type change'
        );
      });

      it('rejects updates when incompatible fields are provided for a rule type', async () => {
        const baseEqlRule = createRuleAssetSavedObjectOfType<EqlRuleCreateFields>('eql');
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [baseEqlRule]);
        await installPrebuiltRules(es, supertest);

        // Create a new version of the prebuilt rule asset with a different query and generate the conflict
        const targetEqlRule = cloneDeep(baseEqlRule);
        targetEqlRule['security-rule'].version += 1;
        targetEqlRule['security-rule'].query = 'sequence by process.name [MY TARGET QUERY]';
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetEqlRule]);

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'TARGET',
          rules: [
            {
              rule_id: baseEqlRule['security-rule'].rule_id,
              revision: 0,
              version: baseEqlRule['security-rule'].version + 1,
              fields: {
                machine_learning_job_id: { pick_version: 'TARGET' },
              },
            },
          ],
        });

        expect(performUpgradeResponse.summary.failed).toEqual(1);
        expect(performUpgradeResponse.errors[0].message).toContain(
          "machine_learning_job_id is not a valid upgradeable field for type 'eql'"
        );
      });

      it('rejects updates with NON_SOLVABLE conflicts when using MERGED pick_version', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        await patchRule(supertest, log, {
          rule_id: queryRule['security-rule'].rule_id,
          name: CURRENT_NAME,
        });

        const targetQueryRule = cloneDeep(queryRule);
        targetQueryRule['security-rule'].version += 1;
        targetQueryRule['security-rule'].name = TARGET_NAME;

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetQueryRule]);

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'MERGED',
          rules: [
            {
              rule_id: queryRule['security-rule'].rule_id,
              revision: 1,
              version: queryRule['security-rule'].version + 1,
            },
          ],
        });

        expect(performUpgradeResponse.summary.failed).toEqual(1);
        expect(performUpgradeResponse.errors[0].message).toContain(
          `Automatic merge calculation for field 'name' in rule of rule_id ${performUpgradeResponse.errors[0].rules[0].rule_id} resulted in a conflict. Please resolve the conflict manually or choose another value for 'pick_version'`
        );
      });

      it('allows updates with NON_SOLVABLE conflicts when specific fields have non-MERGED pick_version', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        await patchRule(supertest, log, {
          rule_id: queryRule['security-rule'].rule_id,
          name: CURRENT_NAME,
        });

        const targetQueryRule = cloneDeep(queryRule);
        targetQueryRule['security-rule'].version += 1;
        targetQueryRule['security-rule'].name = TARGET_NAME;

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetQueryRule]);

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'MERGED',
          rules: [
            {
              rule_id: queryRule['security-rule'].rule_id,
              revision: 1,
              version: queryRule['security-rule'].version + 1,
              fields: {
                name: { pick_version: 'TARGET' },
              },
            },
          ],
        });

        expect(performUpgradeResponse.summary.succeeded).toEqual(1);
        expect(performUpgradeResponse.results.updated[0].name).toEqual(TARGET_NAME);

        const installedRules = await getInstalledRules(supertest);
        const installedRule = installedRules.data.find(
          (rule) => rule.rule_id === queryRule['security-rule'].rule_id
        );
        expect(installedRule?.name).toEqual(TARGET_NAME);
      });

      it('rejects updates for specific fields with MERGED pick_version and NON_SOLVABLE conflicts', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, basePrebuiltAssets);
        await installPrebuiltRules(es, supertest);

        await patchRule(supertest, log, {
          rule_id: queryRule['security-rule'].rule_id,
          name: CURRENT_NAME,
        });

        const targetQueryRule = cloneDeep(queryRule);
        targetQueryRule['security-rule'].version += 1;
        targetQueryRule['security-rule'].name = TARGET_NAME;

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetQueryRule]);

        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'TARGET',
          rules: [
            {
              rule_id: queryRule['security-rule'].rule_id,
              revision: 1,
              version: queryRule['security-rule'].version + 1,
              fields: {
                name: { pick_version: 'MERGED' },
              },
            },
          ],
        });

        expect(performUpgradeResponse.summary.failed).toEqual(1);
        expect(performUpgradeResponse.errors[0].message).toContain(
          `Automatic merge calculation for field 'name' in rule of rule_id ${performUpgradeResponse.errors[0].rules[0].rule_id} resulted in a conflict. Please resolve the conflict manually or choose another value for 'pick_version'.`
        );
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
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'TARGET',
          rules: [
            {
              rule_id: baseRule['security-rule'].rule_id,
              revision: 1,
              version: baseRule['security-rule'].version + 1,
            },
          ],
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

      it('preserves FIELDS_TO_UPGRADE_TO_CURRENT_VERSION when fields are attempted to be updated via resolved values', async () => {
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

        // Set current values for FIELDS_TO_UPGRADE_TO_CURRENT_VERSION
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

        // Create resolved values different from current values
        const resolvedValues: { [key: string]: unknown } = {
          alert_suppression: {
            group_by: ['test'],
            duration: { value: 10, unit: 'm' as const },
          },
        };

        const fields = Object.fromEntries(
          Object.keys(resolvedValues).map((field) => [
            field,
            {
              pick_version: 'RESOLVED' as PickVersionValues,
              resolved_value: resolvedValues[field],
            },
          ])
        );

        // Perform the upgrade with resolved values
        const performUpgradeResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          pick_version: 'TARGET',
          rules: [
            {
              rule_id: baseRule['security-rule'].rule_id,
              revision: 1,
              version: baseRule['security-rule'].version + 1,
              fields,
            },
          ],
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
