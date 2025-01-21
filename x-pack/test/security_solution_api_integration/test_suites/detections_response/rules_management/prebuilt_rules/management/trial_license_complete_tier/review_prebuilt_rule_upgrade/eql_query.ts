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

export function eqlQueryField({ getService }: FtrProviderContext): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const deps = {
    es,
    supertest,
    log,
  };

  describe('preview rule upgrade for "eql_query" field', () => {
    it('does NOT return non-customized field without an upgrade (AAA diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'eql',
            query: 'any where true',
            language: 'eql',
          },
          patch: {},
          upgrade: {
            type: 'eql',
            query: 'any where true',
            language: 'eql',
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
        eql_query: expect.anything(),
      });
    });

    it('returns non-customized field with an upgrade (AAB diff case)', async () => {
      await setUpRuleUpgrade({
        assets: {
          installed: {
            type: 'eql',
            query: 'any where true',
            language: 'eql',
          },
          patch: {},
          upgrade: {
            type: 'eql',
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
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
        eql_query: {
          base_version: {
            query: 'any where true',
            language: 'eql',
            filters: [],
          },
          current_version: {
            query: 'any where true',
            language: 'eql',
            filters: [],
          },
          target_version: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          merged_version: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
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
            type: 'eql',
            query: 'any where true',
            language: 'eql',
          },
          patch: {
            query: 'process where process.name == "regsvr32.exe"',
          },
          upgrade: {
            type: 'eql',
            query: 'any where true',
            language: 'eql',
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
        eql_query: {
          base_version: {
            query: 'any where true',
            language: 'eql',
            filters: [],
          },
          current_version: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          target_version: {
            query: 'any where true',
            language: 'eql',
            filters: [],
          },
          merged_version: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
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
            type: 'eql',
            query: 'any where true',
            language: 'eql',
          },
          patch: {
            query: 'process where process.name == "regsvr32.exe"',
          },
          upgrade: {
            type: 'eql',
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
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
        eql_query: {
          base_version: {
            query: 'any where true',
            language: 'eql',
            filters: [],
          },
          current_version: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          target_version: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          merged_version: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
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
            type: 'eql',
            query: 'any where true',
            language: 'eql',
          },
          patch: {
            query: 'host where host.name == "something"',
          },
          upgrade: {
            type: 'eql',
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
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
        eql_query: {
          base_version: {
            query: 'any where true',
            language: 'eql',
            filters: [],
          },
          current_version: {
            query: 'host where host.name == "something"',
            language: 'eql',
            filters: [],
          },
          target_version: {
            query: 'process where process.name == "regsvr32.exe"',
            language: 'eql',
            filters: [],
          },
          merged_version: {
            query: 'host where host.name == "something"',
            language: 'eql',
            filters: [],
          },
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
              type: 'eql',
              query: 'any where true',
              language: 'eql',
            },
            patch: {
              query: 'host where host.name == "something"',
            },
            upgrade: {
              type: 'eql',
              query: 'host where host.name == "something"',
              language: 'eql',
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
          eql_query: expect.anything(),
        });
      });

      it('returns customized field with an matching upgrade (-AB diff case)', async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'eql',
              query: 'any where true',
              language: 'eql',
            },
            patch: {
              query: 'host where host.name == "something"',
            },
            upgrade: {
              type: 'eql',
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
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
          eql_query: {
            current_version: {
              query: 'host where host.name == "something"',
              language: 'eql',
              filters: [],
            },
            target_version: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
            },
            merged_version: {
              query: 'process where process.name == "regsvr32.exe"',
              language: 'eql',
              filters: [],
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
}
