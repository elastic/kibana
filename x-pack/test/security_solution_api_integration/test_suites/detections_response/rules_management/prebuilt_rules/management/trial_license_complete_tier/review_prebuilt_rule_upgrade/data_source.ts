/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  DataSourceType,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import { reviewPrebuiltRulesToUpgrade } from '../../../../../utils';
import { setUpRuleUpgrade } from '../../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';

export function dataSourceField({ getService }: FtrProviderContext): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const deps = {
    es,
    supertest,
    log,
  };

  describe('preview rule upgrade for "data_source" field with index patterns', () => {
    it('does NOT return non-customized field without an upgrade (AAA diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            index: ['indexA'],
          },
          patch: {},
          upgrade: {
            type: 'query',
            index: ['indexA'],
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
        data_source: expect.anything(),
      });
    });

    it('returns non-customized field with an upgrade (AAB diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            index: ['indexA'],
          },
          patch: {},
          upgrade: {
            type: 'query',
            index: ['indexB'],
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
        data_source: {
          base_version: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
          current_version: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
          target_version: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
          merged_version: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
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
            index: ['indexA'],
          },
          patch: {
            index: ['indexB'],
          },
          upgrade: {
            type: 'query',
            index: ['indexA'],
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
        data_source: {
          base_version: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
          current_version: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
          target_version: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
          merged_version: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
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
            index: ['indexA'],
          },
          patch: {
            index: ['indexB'],
          },
          upgrade: {
            type: 'query',
            index: ['indexB'],
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
        data_source: {
          base_version: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
          current_version: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
          target_version: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
          merged_version: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      });
    });

    it('returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            index: ['indexA'],
          },
          patch: {
            index: ['indexB'],
          },
          upgrade: {
            type: 'query',
            index: ['indexA', 'indexC'],
          },
        },
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
        data_source: {
          base_version: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
          current_version: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
          target_version: {
            type: DataSourceType.index_patterns,
            index_patterns: ['indexA', 'indexC'],
          },
          merged_version: {
            type: DataSourceType.index_patterns,
            index_patterns: ['indexB', 'indexC'],
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
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
              index: ['indexA'],
            },
            patch: {
              index: ['indexB'],
            },
            upgrade: {
              type: 'query',
              index: ['indexB'],
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
          data_source: expect.anything(),
        });
      });

      it('returns customized field with an matching upgrade (-AB diff case)', async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'query',
              index: ['indexA'],
            },
            patch: {
              index: ['indexB'],
            },
            upgrade: {
              type: 'query',
              index: ['indexA', 'indexC'],
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
          data_source: {
            current_version: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
            target_version: {
              type: DataSourceType.index_patterns,
              index_patterns: ['indexA', 'indexC'],
            },
            merged_version: {
              type: DataSourceType.index_patterns,
              index_patterns: ['indexA', 'indexC'],
            },
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

  describe('preview rule upgrade for "data_source" field with data view', () => {
    it('does NOT return non-customized field without an upgrade (AAA diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            data_view_id: 'dataViewA',
          },
          patch: {},
          upgrade: {
            type: 'query',
            data_view_id: 'dataViewA',
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
        data_source: expect.anything(),
      });
    });

    it('returns non-customized field with an upgrade (AAB diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'query',
            data_view_id: 'dataViewA',
          },
          patch: {},
          upgrade: {
            type: 'query',
            data_view_id: 'dataViewB',
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
        data_source: {
          base_version: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
          current_version: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
          target_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
          merged_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
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
            data_view_id: 'dataViewA',
          },
          patch: {
            data_view_id: 'dataViewB',
          },
          upgrade: {
            type: 'query',
            data_view_id: 'dataViewA',
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
        data_source: {
          base_version: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
          current_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
          target_version: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
          merged_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
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
            data_view_id: 'dataViewA',
          },
          patch: {
            data_view_id: 'dataViewB',
          },
          upgrade: {
            type: 'query',
            data_view_id: 'dataViewB',
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
        data_source: {
          base_version: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
          current_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
          target_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
          merged_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
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
            data_view_id: 'dataViewA',
          },
          patch: {
            data_view_id: 'dataViewB',
          },
          upgrade: {
            type: 'query',
            data_view_id: 'dataViewC',
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
        data_source: {
          base_version: { type: DataSourceType.data_view, data_view_id: 'dataViewA' },
          current_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
          target_version: { type: DataSourceType.data_view, data_view_id: 'dataViewC' },
          merged_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
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
              data_view_id: 'dataViewA',
            },
            patch: {
              data_view_id: 'dataViewB',
            },
            upgrade: {
              type: 'query',
              data_view_id: 'dataViewB',
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
          data_source: expect.anything(),
        });
      });

      it('returns customized field with an matching upgrade (-AB diff case)', async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'query',
              data_view_id: 'dataViewA',
            },
            patch: {
              data_view_id: 'dataViewB',
            },
            upgrade: {
              type: 'query',
              data_view_id: 'dataViewC',
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
          data_source: {
            current_version: { type: DataSourceType.data_view, data_view_id: 'dataViewB' },
            target_version: { type: DataSourceType.data_view, data_view_id: 'dataViewC' },
            merged_version: { type: DataSourceType.data_view, data_view_id: 'dataViewC' },
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
