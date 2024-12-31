/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { cloneDeep } from 'lodash';
import type SuperTest from 'supertest';
import {
  ModeEnum,
  AllFieldsDiff,
  ThreatMatchRuleCreateFields,
  ThreatMatchRule,
  FIELDS_TO_UPGRADE_TO_CURRENT_VERSION,
  DataSourceIndexPatterns,
  QueryRule,
  QueryRuleCreateFields,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  NUMBER_FIELDS,
  SINGLE_LINE_STRING_FIELDS,
  SIMPLE_FIELDS,
  MULTI_LINE_STRING_FIELDS,
  SCALAR_ARRAY_FIELDS,
  KQL_QUERY_FIELDS,
} from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
import { Client } from '@elastic/elasticsearch';
import TestAgent from 'supertest/lib/agent';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
  performUpgradePrebuiltRules,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  reviewPrebuiltRulesToUpgrade,
  getInstalledRules,
  createRuleAssetSavedObjectOfType,
  updateRule,
  fetchRule,
  createRuleAssetSavedObject,
  patchRule,
  getWebHookAction,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import {
  SINGLE_LINE_STRING_FIELDS_MOCK_VALUES,
  SINGLE_LINE_FIELD_RULE_TYPE_MAPPING,
  SingleLineStringFieldTestValues,
  NUMBER_FIELD_RULE_TYPE_MAPPING,
  NUMBER_FIELDS_MOCK_VALUES,
  NumberFieldTestValues,
  SIMPLE_FIELD_RULE_TYPE_MAPPING,
  SIMPLE_FIELDS_MOCK_VALUES,
  SimpleFieldTestValues,
  MULTI_LINE_STRING_FIELDS_MOCK_VALUES,
  MULTI_LINE_FIELD_RULE_TYPE_MAPPING,
  MultiLineStringFieldTestValues,
  KQL_QUERY_FIELD_RULE_TYPE_MAPPING,
  KQL_QUERY_FIELDS_MOCK_VALUES,
  KqlQueryFieldTestValues,
  mapKQLQueryDiffableFieldToRuleFields,
  mapDiffableFieldToRuleFields,
  SCALAR_ARRAY_FIELD_RULE_TYPE_MAPPING,
  SCALAR_ARRAY_FIELDS_MOCK_VALUES,
  ScalarArrayFieldTestValues,
} from './upgrade_prebuilt_rules.mock_data';

type RuleTypeToFields =
  | typeof SINGLE_LINE_FIELD_RULE_TYPE_MAPPING
  | typeof MULTI_LINE_FIELD_RULE_TYPE_MAPPING
  | typeof NUMBER_FIELD_RULE_TYPE_MAPPING
  | typeof SCALAR_ARRAY_FIELD_RULE_TYPE_MAPPING
  | typeof KQL_QUERY_FIELD_RULE_TYPE_MAPPING
  | typeof SIMPLE_FIELD_RULE_TYPE_MAPPING;

type FieldType =
  | SINGLE_LINE_STRING_FIELDS
  | MULTI_LINE_STRING_FIELDS
  | NUMBER_FIELDS
  | SCALAR_ARRAY_FIELDS
  | KQL_QUERY_FIELDS
  | SIMPLE_FIELDS;

type TestValues =
  | SingleLineStringFieldTestValues
  | MultiLineStringFieldTestValues
  | NumberFieldTestValues
  | ScalarArrayFieldTestValues
  | KqlQueryFieldTestValues
  | SimpleFieldTestValues;

const createTestSuite = <T extends FieldType>(
  ruleType: keyof RuleTypeToFields,
  field: T,
  testValues: TestValues,
  mapperFunction: ((field: T, value: any) => Record<string, any>) | null,
  services: { es: Client; supertest: TestAgent; log: ToolingLog }
) => {
  const { es, supertest } = services;
  const { baseValue, customValue, updatedValue } = testValues;

  describe(`testing field: ${field}`, () => {
    // Map DiffableRuleFields to their respective fields from rule schema, where appropriate
    const getMappedFields = (version: TestValues) =>
      mapperFunction ? mapperFunction(field, version) : { [field]: version };

    const getRuleAssetSavedObjects = () => [
      createRuleAssetSavedObjectOfType(ruleType, {
        rule_id: 'rule-1',
        version: 1,
        ...getMappedFields(baseValue),
      }),
    ];

    describe('successful updates', () => {
      it('upgrades all upgreadeable rules fields to their BASE versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const targetRule = cloneDeep(getRuleAssetSavedObjects()[0]);
        targetRule['security-rule'].version += 1;
        Object.entries(getMappedFields(updatedValue)).forEach(([key, value]) => {
          (targetRule['security-rule'] as Record<string, unknown>)[key] = value;
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetRule]);

        const performResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'BASE',
        });

        expect(performResponse.summary.succeeded).toBe(1);
        expect(performResponse.summary.failed).toBe(0);

        const installedRules = await getInstalledRules(supertest);
        Object.entries(getMappedFields(baseValue)).forEach(([key, value]) => {
          expect((installedRules.data[0] as Record<string, unknown>)[key]).toStrictEqual(value);
        });
      });

      it('upgrades all upgreadeable rules fields to their CURRENT versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        await updateRule(supertest, {
          ...rule,
          id: undefined,
          ...getMappedFields(customValue),
        });

        const targetRule = cloneDeep(getRuleAssetSavedObjects()[0]);
        targetRule['security-rule'].version += 1;
        Object.entries(getMappedFields(updatedValue)).forEach(([key, value]) => {
          (targetRule['security-rule'] as Record<string, unknown>)[key] = value;
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetRule]);

        const performResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'CURRENT',
        });

        expect(performResponse.summary.succeeded).toBe(1);
        expect(performResponse.summary.failed).toBe(0);

        const installedRules = await getInstalledRules(supertest);
        Object.entries(getMappedFields(customValue)).forEach(([key, value]) => {
          expect((installedRules.data[0] as Record<string, unknown>)[key]).toStrictEqual(value);
        });
      });

      it('upgrades all upgreadeable rules fields to their TARGET versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const targetRule = cloneDeep(getRuleAssetSavedObjects()[0]);
        targetRule['security-rule'].version += 1;
        Object.entries(getMappedFields(updatedValue)).forEach(([key, value]) => {
          (targetRule['security-rule'] as Record<string, unknown>)[key] = value;
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetRule]);

        const performResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'TARGET',
        });

        expect(performResponse.summary.succeeded).toBe(1);
        expect(performResponse.summary.failed).toBe(0);

        const installedRules = await getInstalledRules(supertest);
        Object.entries(getMappedFields(updatedValue)).forEach(([key, value]) => {
          expect((installedRules.data[0] as Record<string, unknown>)[key]).toStrictEqual(value);
        });
      });

      it('upgrades all upgreadeable rules fields to their MERGED versions', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const targetRule = cloneDeep(getRuleAssetSavedObjects()[0]);
        targetRule['security-rule'].version += 1;
        Object.entries(getMappedFields(updatedValue)).forEach(([key, value]) => {
          (targetRule['security-rule'] as Record<string, unknown>)[key] = value;
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetRule]);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        const mergedVersion = (reviewResponse.rules[0].diff.fields as AllFieldsDiff)[field]
          ?.merged_version;

        const performResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'MERGED',
        });

        expect(performResponse.summary.succeeded).toBe(1);
        expect(performResponse.summary.failed).toBe(0);

        const installedRules = await getInstalledRules(supertest);
        Object.entries(getMappedFields(mergedVersion as unknown as TestValues)).forEach(
          ([key, value]) => {
            expect((installedRules.data[0] as Record<string, unknown>)[key]).toStrictEqual(value);
          }
        );
      });
    });

    describe('edge cases and unhappy paths', () => {
      it('rejects updates of rules with a pick_version of MERGED which have fields which result in conflicts', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        await updateRule(supertest, {
          ...rule,
          id: undefined,
          ...getMappedFields(customValue),
        });

        const targetRule = cloneDeep(getRuleAssetSavedObjects()[0]);
        targetRule['security-rule'].version += 1;
        Object.entries(getMappedFields(updatedValue)).forEach(([key, value]) => {
          (targetRule['security-rule'] as Record<string, unknown>)[key] = value;
        });

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, [targetRule]);

        const performResponse = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.ALL_RULES,
          pick_version: 'MERGED',
        });

        expect(performResponse.summary.succeeded).toBe(0);
        expect(performResponse.summary.failed).toBe(1);
        expect(performResponse.errors[0].message).toContain('Merge conflicts found');
      });
    });
  });
};

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  describe('@ess @serverless @skipInServerlessMKI Perform Prebuilt Rules Upgrades - ALL Rules mode - ', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe('Single Line String Fields - ', () => {
      Object.entries(SINGLE_LINE_FIELD_RULE_TYPE_MAPPING).forEach(([ruleType, fields]) => {
        describe(`${ruleType} rule`, () => {
          fields.forEach((field) => {
            const testValues =
              SINGLE_LINE_STRING_FIELDS_MOCK_VALUES[field as SINGLE_LINE_STRING_FIELDS];
            createTestSuite(
              ruleType as keyof RuleTypeToFields,
              field as SINGLE_LINE_STRING_FIELDS,
              testValues,
              null,
              { es, supertest, log }
            );
          });
        });
      });
    });

    describe('Multi Line String Fields - ', () => {
      Object.entries(MULTI_LINE_FIELD_RULE_TYPE_MAPPING).forEach(([ruleType, fields]) => {
        describe(`${ruleType} rule`, () => {
          fields.forEach((field) => {
            const testValues =
              MULTI_LINE_STRING_FIELDS_MOCK_VALUES[field as MULTI_LINE_STRING_FIELDS];
            createTestSuite(
              ruleType as keyof RuleTypeToFields,
              field as MULTI_LINE_STRING_FIELDS,
              testValues,
              null,
              { es, supertest, log }
            );
          });
        });
      });
    });

    describe('Number Fields - ', () => {
      Object.entries(NUMBER_FIELD_RULE_TYPE_MAPPING).forEach(([ruleType, fields]) => {
        describe(`${ruleType} rule`, () => {
          fields.forEach((field) => {
            const testValues = NUMBER_FIELDS_MOCK_VALUES[field as NUMBER_FIELDS];
            createTestSuite(
              ruleType as keyof RuleTypeToFields,
              field as NUMBER_FIELDS,
              testValues,
              null,
              {
                es,
                supertest,
                log,
              }
            );
          });
        });
      });
    });

    describe('Scalar Array Fields - ', () => {
      Object.entries(SCALAR_ARRAY_FIELD_RULE_TYPE_MAPPING).forEach(([ruleType, fields]) => {
        describe(`${ruleType} rule`, () => {
          fields.forEach((field) => {
            const testValues = SCALAR_ARRAY_FIELDS_MOCK_VALUES[field as SCALAR_ARRAY_FIELDS];
            createTestSuite(
              ruleType as keyof RuleTypeToFields,
              field as SCALAR_ARRAY_FIELDS,
              testValues,
              null,
              {
                es,
                supertest,
                log,
              }
            );
          });
        });
      });
    });

    describe('KQL Query Fields - ', () => {
      Object.entries(KQL_QUERY_FIELD_RULE_TYPE_MAPPING).forEach(([ruleType, fields]) => {
        describe(`${ruleType} rule`, () => {
          fields.forEach((field) => {
            const testValues = KQL_QUERY_FIELDS_MOCK_VALUES[field as KQL_QUERY_FIELDS];
            createTestSuite(
              ruleType as keyof RuleTypeToFields,
              field as KQL_QUERY_FIELDS,
              testValues,
              mapKQLQueryDiffableFieldToRuleFields,
              {
                es,
                supertest,
                log,
              }
            );
          });
        });
      });
    });

    describe('Simple Diff Algorithm Fields - ', () => {
      Object.entries(SIMPLE_FIELD_RULE_TYPE_MAPPING).forEach(([ruleType, fields]) => {
        describe(`${ruleType} rule`, () => {
          fields.forEach((field) => {
            const testValues = SIMPLE_FIELDS_MOCK_VALUES[field];
            createTestSuite(
              ruleType as keyof RuleTypeToFields,
              field as SIMPLE_FIELDS,
              testValues,
              mapDiffableFieldToRuleFields,
              {
                es,
                supertest,
                log,
              }
            );
          });
        });
      });
    });

    // TODO: Maybe move these scenarios to a different file?
    describe('Scenarios for all rule types', () => {
      const CURRENT_NAME = 'My current name';
      const CURRENT_TAGS = ['current', 'tags'];
      const TARGET_NAME = 'My target name';
      const TARGET_TAGS = ['target', 'tags'];

      describe(`successful updates`, () => {
        it('correctly upgrades rules with DataSource diffs to their MERGED versions', async () => {
          const queryRule = createRuleAssetSavedObjectOfType<QueryRuleCreateFields>('query');
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
  });
};

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
