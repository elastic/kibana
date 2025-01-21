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

export function threatIndexField({ getService }: FtrProviderContext): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const deps = {
    es,
    supertest,
    log,
  };

  describe('preview rule upgrade for "threat_index" field', () => {
    it('does NOT return non-customized field without an upgrade (AAA diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'threat_match',
            threat_index: ['indexA'],
          },
          patch: {},
          upgrade: {
            type: 'threat_match',
            threat_index: ['indexA'],
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
        threat_index: expect.anything(),
      });
    });

    it('returns non-customized field with an upgrade (AAB diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'threat_match',
            threat_index: ['indexA'],
          },
          patch: {},
          upgrade: {
            type: 'threat_match',
            threat_index: ['indexB'],
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
        threat_index: {
          base_version: ['indexA'],
          current_version: ['indexA'],
          target_version: ['indexB'],
          merged_version: ['indexB'],
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
            type: 'threat_match',
            threat_index: ['indexA'],
          },
          patch: {
            type: 'threat_match',
            threat_index: ['indexB'],
          },
          upgrade: {
            type: 'threat_match',
            threat_index: ['indexA'],
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
        threat_index: {
          base_version: ['indexA'],
          current_version: ['indexB'],
          target_version: ['indexA'],
          merged_version: ['indexB'],
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
            type: 'threat_match',
            threat_index: ['indexA'],
          },
          patch: {
            type: 'threat_match',
            threat_index: ['indexB'],
          },
          upgrade: {
            type: 'threat_match',
            threat_index: ['indexB'],
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
        threat_index: {
          base_version: ['indexA'],
          current_version: ['indexB'],
          target_version: ['indexB'],
          merged_version: ['indexB'],
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
            type: 'threat_match',
            threat_index: ['indexA'],
          },
          patch: {
            type: 'threat_match',
            threat_index: ['indexD'],
          },
          upgrade: {
            type: 'threat_match',
            threat_index: ['indexB', 'indexC'],
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
        threat_index: {
          base_version: ['indexA'],
          current_version: ['indexD'],
          target_version: ['indexB', 'indexC'],
          merged_version: ['indexD', 'indexB', 'indexC'],
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
              type: 'threat_match',
              threat_index: ['indexA'],
            },
            patch: {
              type: 'threat_match',
              threat_index: ['indexD'],
            },
            upgrade: {
              type: 'threat_match',
              threat_index: ['indexD'],
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
          threat_index: expect.anything(),
        });
      });

      it('returns customized field with an matching upgrade (-AB diff case)', async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'threat_match',
              threat_index: ['indexA'],
            },
            patch: {
              type: 'threat_match',
              threat_index: ['indexD'],
            },
            upgrade: {
              type: 'threat_match',
              threat_index: ['indexB', 'indexC'],
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
          threat_index: {
            current_version: ['indexD'],
            target_version: ['indexB', 'indexC'],
            merged_version: ['indexB', 'indexC'],
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
