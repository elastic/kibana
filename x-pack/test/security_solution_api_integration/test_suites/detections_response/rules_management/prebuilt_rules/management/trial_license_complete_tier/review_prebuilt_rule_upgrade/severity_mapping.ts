/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import { reviewPrebuiltRulesToUpgrade } from '../../../../../utils';
import { setUpRuleUpgrade } from '../../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';

export function severityMappingField({ getService }: FtrProviderContext): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const deps = {
    es,
    supertest,
    log,
  };

  describe('preview rule upgrade for "severity_mapping" field', () => {
    it('does NOT return non-customized field without an upgrade (AAA diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldA',
                operator: 'equals',
                severity: 'low',
                value: '10',
              },
            ],
          },
          patch: {},
          upgrade: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldA',
                operator: 'equals',
                severity: 'low',
                value: '10',
              },
            ],
          },
        },
        deps,
      });

      const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

      expect(reviewResponse.rules).toHaveLength(1);
      expect(reviewResponse.stats).toMatchObject({
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      });
      expect(reviewResponse.rules[0].diff).toMatchObject({
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      });
      expect(reviewResponse.rules[0].diff.fields).not.toMatchObject({
        severity_mapping: expect.anything(),
      });
    });

    it('returns non-customized field with an upgrade (AAB diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldA',
                operator: 'equals',
                severity: 'low',
                value: '10',
              },
            ],
          },
          patch: {},
          upgrade: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                severity: 'high',
                value: '20',
              },
            ],
          },
        },
        deps,
      });

      const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

      expect(reviewResponse.rules).toHaveLength(1);
      expect(reviewResponse.stats).toMatchObject({
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      });
      expect(reviewResponse.rules[0].diff).toMatchObject({
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      });
      expect(reviewResponse.rules[0].diff.fields).toMatchObject({
        severity_mapping: {
          base_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              severity: 'low',
              value: '10',
            },
          ],
          current_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              severity: 'low',
              value: '10',
            },
          ],
          target_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              severity: 'high',
              value: '20',
            },
          ],
          merged_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              severity: 'high',
              value: '20',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      });
    });

    it('returns customized field without an upgrade (ABA diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldA',
                operator: 'equals',
                severity: 'low',
                value: '10',
              },
            ],
          },
          patch: {
            severity_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                severity: 'medium',
                value: '30',
              },
            ],
          },
          upgrade: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldA',
                operator: 'equals',
                severity: 'low',
                value: '10',
              },
            ],
          },
        },
        deps,
      });

      const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

      expect(reviewResponse.rules).toHaveLength(1);
      expect(reviewResponse.stats).toMatchObject({
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      });
      expect(reviewResponse.rules[0].diff).toMatchObject({
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      });
      expect(reviewResponse.rules[0].diff.fields).toMatchObject({
        severity_mapping: {
          base_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              severity: 'low',
              value: '10',
            },
          ],
          current_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              severity: 'medium',
              value: '30',
            },
          ],
          target_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              severity: 'low',
              value: '10',
            },
          ],
          merged_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              severity: 'medium',
              value: '30',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      });
    });

    it('returns customized field with a matching upgrade (ABB diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldA',
                operator: 'equals',
                severity: 'low',
                value: '10',
              },
            ],
          },
          patch: {
            severity_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                severity: 'medium',
                value: '30',
              },
            ],
          },
          upgrade: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                severity: 'medium',
                value: '30',
              },
            ],
          },
        },
        deps,
      });

      const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

      expect(reviewResponse.rules).toHaveLength(1);
      expect(reviewResponse.stats).toMatchObject({
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      });
      expect(reviewResponse.rules[0].diff).toMatchObject({
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      });
      expect(reviewResponse.rules[0].diff.fields).toMatchObject({
        severity_mapping: {
          base_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              severity: 'low',
              value: '10',
            },
          ],
          current_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              severity: 'medium',
              value: '30',
            },
          ],
          target_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              severity: 'medium',
              value: '30',
            },
          ],
          merged_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              severity: 'medium',
              value: '30',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      });
    });

    it('returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldA',
                operator: 'equals',
                severity: 'low',
                value: '10',
              },
            ],
          },
          patch: {
            severity_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                severity: 'medium',
                value: '30',
              },
            ],
          },
          upgrade: {
            type: 'query',
            severity_mapping: [
              {
                field: 'fieldC',
                operator: 'equals',
                severity: 'high',
                value: '50',
              },
            ],
          },
        },
        deps,
      });

      const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

      expect(reviewResponse.rules).toHaveLength(1);
      expect(reviewResponse.stats).toMatchObject({
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      });
      expect(reviewResponse.rules[0].diff).toMatchObject({
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      });
      expect(reviewResponse.rules[0].diff.fields).toMatchObject({
        severity_mapping: {
          base_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              severity: 'low',
              value: '10',
            },
          ],
          current_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              severity: 'medium',
              value: '30',
            },
          ],
          target_version: [
            {
              field: 'fieldC',
              operator: 'equals',
              severity: 'high',
              value: '50',
            },
          ],
          merged_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              severity: 'medium',
              value: '30',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      });
    });

    describe('without historical versions', () => {
      it('does NOT return a customized field with the matching upgrade (-AA diff case)', async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'query',
              severity_mapping: [
                {
                  field: 'fieldA',
                  operator: 'equals',
                  severity: 'low',
                  value: '10',
                },
              ],
            },
            patch: {
              severity_mapping: [
                {
                  field: 'fieldB',
                  operator: 'equals',
                  severity: 'medium',
                  value: '30',
                },
              ],
            },
            upgrade: {
              type: 'query',
              severity_mapping: [
                {
                  field: 'fieldB',
                  operator: 'equals',
                  severity: 'medium',
                  value: '30',
                },
              ],
            },
          },
          removeInstalledAssets: true,
          deps,
        });

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(reviewResponse.rules).toHaveLength(1);
        expect(reviewResponse.stats).toMatchObject({
          num_rules_to_upgrade_total: 1,
          num_rules_with_conflicts: 0,
          num_rules_with_non_solvable_conflicts: 0,
        });
        expect(reviewResponse.rules[0].diff).toMatchObject({
          num_fields_with_updates: 1,
          num_fields_with_conflicts: 0,
          num_fields_with_non_solvable_conflicts: 0,
        });
        expect(reviewResponse.rules[0].diff.fields).not.toMatchObject({
          severity_mapping: expect.anything(),
        });
      });

      it('returns customized field with an matching upgrade (-AB diff case)', async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'query',
              severity_mapping: [
                {
                  field: 'fieldA',
                  operator: 'equals',
                  severity: 'low',
                  value: '10',
                },
              ],
            },
            patch: {
              severity_mapping: [
                {
                  field: 'fieldB',
                  operator: 'equals',
                  severity: 'medium',
                  value: '30',
                },
              ],
            },
            upgrade: {
              type: 'query',
              severity_mapping: [
                {
                  field: 'fieldC',
                  operator: 'equals',
                  severity: 'high',
                  value: '50',
                },
              ],
            },
          },
          removeInstalledAssets: true,
          deps,
        });

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(reviewResponse.rules).toHaveLength(1);
        expect(reviewResponse.stats).toMatchObject({
          num_rules_to_upgrade_total: 1,
          num_rules_with_conflicts: 1,
          num_rules_with_non_solvable_conflicts: 0,
        });
        expect(reviewResponse.rules[0].diff).toMatchObject({
          num_fields_with_updates: 2,
          num_fields_with_conflicts: 1,
          num_fields_with_non_solvable_conflicts: 0,
        });
        expect(reviewResponse.rules[0].diff.fields).toMatchObject({
          severity_mapping: {
            current_version: [
              {
                field: 'fieldB',
                operator: 'equals',
                severity: 'medium',
                value: '30',
              },
            ],
            target_version: [
              {
                field: 'fieldC',
                operator: 'equals',
                severity: 'high',
                value: '50',
              },
            ],
            merged_version: [
              {
                field: 'fieldC',
                operator: 'equals',
                severity: 'high',
                value: '50',
              },
            ],
            diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.SOLVABLE,
            has_update: true,
            has_base_version: false,
          },
        });
      });
    });
  });
}
