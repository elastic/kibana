/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  AllFieldsDiff,
  KqlQueryType,
  RuleUpdateProps,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  getPrebuiltRuleMock,
  getPrebuiltThreatMatchRuleMock,
} from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObject,
  installPrebuiltRules,
  createPrebuiltRuleAssetSavedObjects,
  reviewPrebuiltRulesToUpgrade,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  updateRule,
  patchRule,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI review prebuilt rules updates from package with mock rule assets', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe(`kql_query fields`, () => {
      const getQueryRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({
          rule_id: 'rule-1',
          version: 1,
          type: 'query',
          query: 'query string = true',
          language: 'kuery',
          filters: [],
        }),
      ];

      const getSavedQueryRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({
          rule_id: 'rule-1',
          version: 1,
          type: 'saved_query',
          saved_id: 'saved-query-id',
        }),
      ];

      describe("when rule field doesn't have an update and has no custom value - scenario AAA", () => {
        describe('when all versions are inline query types', () => {
          it('should not show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Add a v2 rule asset to make the upgrade possible, do NOT update the related kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligible for update but kql_query field is NOT returned
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when all versions are saved query types', () => {
          it('should not show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getSavedQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Add a v2 rule asset to make the upgrade possible, do NOT update the related kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'saved_query',
                saved_id: 'saved-query-id',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligible for update but kql_query field is NOT returned
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when all query versions have different surrounding whitespace', () => {
          it('should not show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'query',
              query: '\nquery string = true',
              language: 'kuery',
              filters: [],
              saved_id: undefined,
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, do NOT update the related kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'query string = true\n',
                language: 'kuery',
                filters: [],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligible for update but kql_query field is NOT returned
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when all query versions have filters with alias fields set to null', () => {
          it('should not show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 1,
                type: 'query',
                query: 'query string = true',
                language: 'kuery',
                filters: [
                  {
                    meta: {
                      negate: false,
                      disabled: false,
                      type: 'phrase',
                      key: 'test',
                      params: {
                        query: 'value',
                      },
                    },
                    query: {
                      term: {
                        field: 'value',
                      },
                    },
                  },
                ],
              }),
            ]);
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'query',
              query: 'query string = true',
              language: 'kuery',
              filters: [
                {
                  meta: {
                    alias: null,
                    negate: false,
                    disabled: false,
                    type: 'phrase',
                    key: 'test',
                    params: {
                      query: 'value',
                    },
                  },
                  query: {
                    term: {
                      field: 'value',
                    },
                  },
                },
              ],
              saved_id: undefined,
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, do NOT update the related kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'query string = true',
                language: 'kuery',
                filters: [
                  {
                    meta: {
                      negate: false,
                      disabled: false,
                      type: 'phrase',
                      key: 'test',
                      params: {
                        query: 'value',
                      },
                    },
                    query: {
                      term: {
                        field: 'value',
                      },
                    },
                  },
                ],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligible for update but kql_query field is NOT returned
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });
      });

      describe("when rule field doesn't have an update but has a custom value - scenario ABA", () => {
        describe('when current version is inline query type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getSavedQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'query',
              query: 'query string = true',
              language: 'kuery',
              filters: [],
              saved_id: undefined,
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, do NOT update the related kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'saved_query',
                saved_id: 'saved-query-id',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that kql_query diff field is returned but field does not have an update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              current_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              target_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              merged_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NONE,
              has_update: false,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1); // `type` is considered to be a conflict
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
          });
        });

        describe('when current version is saved query type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'saved_query',
              query: undefined,
              language: undefined,
              filters: undefined,
              saved_id: 'saved-query-id',
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, do NOT update the related kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that kql_query diff field is returned but field does not have an update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              current_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              target_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              merged_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NONE,
              has_update: false,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1); // `type` is considered to be a conflict
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
          });
        });
      });

      describe('when rule field has an update but does not have a custom value - scenario AAB', () => {
        describe('when all versions are inline query type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'query string = false',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              current_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              target_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              merged_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              conflict: ThreeWayDiffConflict.NONE,
              has_update: true,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when all versions are saved query type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getSavedQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'saved_query',
                saved_id: 'new-saved-query-id',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              current_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              target_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'new-saved-query-id',
              },
              merged_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'new-saved-query-id',
              },
              diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              conflict: ThreeWayDiffConflict.NONE,
              has_update: true,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });
      });

      describe('when rule field has an update and a custom value that are the same - scenario ABB', () => {
        describe('when all versions are inline query type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              query: 'query string = false',
            });

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update and contains kql_query field
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              current_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              target_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              merged_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NONE,
              has_update: false,
              has_base_version: true,
            });
            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when all versions are saved query types', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getSavedQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'saved_query',
              saved_id: 'new-saved-query-id',
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'saved_query',
                saved_id: 'new-saved-query-id',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update and contains kql_query field
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              current_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'new-saved-query-id',
              },
              target_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'new-saved-query-id',
              },
              merged_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'new-saved-query-id',
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NONE,
              has_update: false,
              has_base_version: true,
            });
            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });
      });

      describe('when rule field has an update and a custom value that are different - scenario ABC', () => {
        describe('when current version is different type than base and target', () => {
          it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'saved_query',
              query: undefined,
              language: undefined,
              filters: undefined,
              saved_id: 'saved-query-id',
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and kql_query field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              current_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              target_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              merged_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NON_SOLVABLE,
              has_update: true,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is also considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(2); // `type` is also considered to be a conflict
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(2);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
          });
        });

        describe('when all versions are inline query type', () => {
          it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              query: 'query string = false',
            });

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'query string = true',
                language: 'kuery',
                filters: [{ field: 'query' }],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and kql_query field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              current_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              target_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [{ field: 'query' }],
              },
              merged_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NON_SOLVABLE,
              has_update: true,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
          });
        });

        describe('when all versions are saved query type', () => {
          it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getSavedQueryRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'saved_query',
              saved_id: 'new-saved-query-id',
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'saved_query',
                saved_id: 'even-newer-saved-query-id',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and kql_query field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'saved-query-id',
              },
              current_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'new-saved-query-id',
              },
              target_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'even-newer-saved-query-id',
              },
              merged_version: {
                type: KqlQueryType.saved_query,
                saved_query_id: 'new-saved-query-id',
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NON_SOLVABLE,
              has_update: true,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
          });
        });

        describe('when rule type is threat match', () => {
          it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                ...getPrebuiltThreatMatchRuleMock(),
                threat_filters: [],
              } as PrebuiltRuleAsset),
            ]);
            await installPrebuiltRules(es, supertest);

            // Customize a threat_query on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltThreatMatchRuleMock(),
              rule_id: 'rule-1',
              threat_query: '*',
              threat_filters: [],
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, update a threat_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                ...getPrebuiltThreatMatchRuleMock(),
                threat_query: `*:'new query'`,
                threat_filters: [],
                version: 2,
              } as PrebuiltRuleAsset),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and threat_query field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.threat_query).toEqual({
              base_version: {
                type: KqlQueryType.inline_query,
                query: '*:*',
                language: 'kuery',
                filters: [],
              },
              current_version: {
                type: KqlQueryType.inline_query,
                query: '*',
                language: 'kuery',
                filters: [],
              },
              target_version: {
                type: KqlQueryType.inline_query,
                query: `*:'new query'`,
                language: 'kuery',
                filters: [],
              },
              merged_version: {
                type: KqlQueryType.inline_query,
                query: '*',
                language: 'kuery',
                filters: [],
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NON_SOLVABLE,
              has_update: true,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
          });
        });

        describe('when rule type is threshold', () => {
          it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 1,
                type: 'threshold',
                query: 'query string = true',
                threshold: {
                  field: 'some.field',
                  value: 4,
                },
              }),
            ]);
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'threshold',
              query: 'query string = false',
              threshold: {
                field: 'some.field',
                value: 4,
              },
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'threshold',
                query: 'new query string = true',
                threshold: {
                  field: 'some.field',
                  value: 4,
                },
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and kql_query field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              current_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              target_version: {
                type: KqlQueryType.inline_query,
                query: 'new query string = true',
                language: 'kuery',
                filters: [],
              },
              merged_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NON_SOLVABLE,
              has_update: true,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
          });
        });

        describe('when rule type is new_terms', () => {
          it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 1,
                type: 'new_terms',
                query: 'query string = true',
                new_terms_fields: ['user.name'],
                history_window_start: 'now-7d',
              }),
            ]);
            await installPrebuiltRules(es, supertest);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'new_terms',
              query: 'query string = false',
              new_terms_fields: ['user.name'],
              history_window_start: 'now-7d',
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'new_terms',
                query: 'new query string = true',
                new_terms_fields: ['user.name'],
                history_window_start: 'now-7d',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and kql_query field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              base_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              },
              current_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              target_version: {
                type: KqlQueryType.inline_query,
                query: 'new query string = true',
                language: 'kuery',
                filters: [],
              },
              merged_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NON_SOLVABLE,
              has_update: true,
              has_base_version: true,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
          });
        });
      });

      describe('when rule base version does not exist', () => {
        describe('when rule field has an update and a custom value that are the same - scenario -AA', () => {
          it('should not show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createPrebuiltRuleAssetSavedObjects(es, getQueryRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Clear previous rule assets
            await deleteAllPrebuiltRuleAssets(es, log);

            // Add a v2 rule asset to make the upgrade possible, but keep kql_query field unchanged
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'query string = true',
                language: 'kuery',
                filters: [],
              }),
            ];
            await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // but does NOT contain kql_query field
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when rule field has an update and a custom value that are different - scenario -AB', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createPrebuiltRuleAssetSavedObjects(es, getQueryRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Clear previous rule assets
            await deleteAllPrebuiltRuleAssets(es, log);

            // Customize a kql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'query',
              query: 'query string = false',
              language: 'kuery',
              filters: [],
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, update a kql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query',
                query: 'new query string = true',
                language: 'kuery',
                filters: [],
              }),
            ];
            await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and kql_query field update does not have a conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.kql_query).toEqual({
              current_version: {
                type: KqlQueryType.inline_query,
                query: 'query string = false',
                language: 'kuery',
                filters: [],
              },
              target_version: {
                type: KqlQueryType.inline_query,
                query: 'new query string = true',
                language: 'kuery',
                filters: [],
              },
              merged_version: {
                type: KqlQueryType.inline_query,
                query: 'new query string = true',
                language: 'kuery',
                filters: [],
              },
              diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              conflict: ThreeWayDiffConflict.SOLVABLE,
              has_update: true,
              has_base_version: false,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2);
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1); // query
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });
      });
    });
  });
};
