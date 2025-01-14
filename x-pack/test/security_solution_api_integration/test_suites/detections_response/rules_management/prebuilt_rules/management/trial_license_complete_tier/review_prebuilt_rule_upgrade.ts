/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  DataSourceType,
  KqlQueryType,
  RuleFieldsDiff,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  reviewPrebuiltRulesToUpgrade,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { setUpRuleUpgrade } from '../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';

interface FieldTestData {
  name: string;
  assets: Parameters<typeof setUpRuleUpgrade>[0]['assets'];
  expectedFieldsDiff: Partial<RuleFieldsDiff>;
  expectedStats: Record<string, unknown>;
  expectedFieldsDiffStats: Record<string, unknown>;
}

const FIELDS_TEST_DATA: Record<string, FieldTestData[]> = {
  // Common fields
  name: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          name: 'Original name',
        },
        patch: {},
        upgrade: {
          type: 'query',
          name: 'Updated name',
        },
      },
      expectedFieldsDiff: {
        name: {
          base_version: 'Original name',
          current_version: 'Original name',
          target_version: 'Updated name',
          merged_version: 'Updated name',
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          name: 'Original name',
        },
        patch: {
          name: 'Customized name',
        },
        upgrade: {
          type: 'query',
          name: 'Original name',
        },
      },
      expectedFieldsDiff: {
        name: {
          base_version: 'Original name',
          current_version: 'Customized name',
          target_version: 'Original name',
          merged_version: 'Customized name',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          name: 'Original name',
        },
        patch: {
          name: 'Updated name',
        },
        upgrade: {
          type: 'query',
          name: 'Updated name',
        },
      },
      expectedFieldsDiff: {
        name: {
          base_version: 'Original name',
          current_version: 'Updated name',
          target_version: 'Updated name',
          merged_version: 'Updated name',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          name: 'Original name',
        },
        patch: {
          name: 'Customized name',
        },
        upgrade: {
          type: 'query',
          name: 'Updated name',
        },
      },
      expectedFieldsDiff: {
        name: {
          base_version: 'Original name',
          current_version: 'Customized name',
          target_version: 'Updated name',
          merged_version: 'Customized name',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  description: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          description: 'Original description',
        },
        patch: {},
        upgrade: {
          type: 'query',
          description: 'Updated description',
        },
      },
      expectedFieldsDiff: {
        description: {
          base_version: 'Original description',
          current_version: 'Original description',
          target_version: 'Updated description',
          merged_version: 'Updated description',
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          description: 'Original description',
        },
        patch: {
          description: 'Customized description',
        },
        upgrade: {
          type: 'query',
          description: 'Original description',
        },
      },
      expectedFieldsDiff: {
        description: {
          base_version: 'Original description',
          current_version: 'Customized description',
          target_version: 'Original description',
          merged_version: 'Customized description',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          description: 'Original description',
        },
        patch: {
          description: 'Updated description',
        },
        upgrade: {
          type: 'query',
          description: 'Updated description',
        },
      },
      expectedFieldsDiff: {
        description: {
          base_version: 'Original description',
          current_version: 'Updated description',
          target_version: 'Updated description',
          merged_version: 'Updated description',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 2',
        },
        patch: {
          description:
            'Customized description\nOriginal description line 1\nOriginal description line 2',
        },
        upgrade: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 3',
        },
      },
      expectedFieldsDiff: {
        description: {
          base_version: 'Original description line 1\nOriginal description line 2',
          current_version:
            'Customized description\nOriginal description line 1\nOriginal description line 2',
          target_version: 'Original description line 1\nOriginal description line 3',
          merged_version:
            'Customized description\nOriginal description line 1\nOriginal description line 3',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          description: 'Original description',
        },
        patch: {
          description: 'Customized description',
        },
        upgrade: {
          type: 'query',
          description: 'Updated description',
        },
      },
      expectedFieldsDiff: {
        description: {
          base_version: 'Original description',
          current_version: 'Customized description',
          target_version: 'Updated description',
          merged_version: 'Customized description',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  tags: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          tags: ['tagA'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          tags: ['tagB'],
        },
      },
      expectedFieldsDiff: {
        tags: {
          base_version: ['tagA'],
          current_version: ['tagA'],
          target_version: ['tagB'],
          merged_version: ['tagB'],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          tags: ['tagA'],
        },
        patch: {
          tags: ['tagC'],
        },
        upgrade: {
          type: 'query',
          tags: ['tagA'],
        },
      },
      expectedFieldsDiff: {
        tags: {
          base_version: ['tagA'],
          current_version: ['tagC'],
          target_version: ['tagA'],
          merged_version: ['tagC'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          tags: ['tagA'],
        },
        patch: {
          tags: ['tagB'],
        },
        upgrade: {
          type: 'query',
          tags: ['tagB'],
        },
      },
      expectedFieldsDiff: {
        tags: {
          base_version: ['tagA'],
          current_version: ['tagB'],
          target_version: ['tagB'],
          merged_version: ['tagB'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          tags: ['tagA'],
        },
        patch: {
          tags: ['tagB'],
        },
        upgrade: {
          type: 'query',
          tags: ['tagC'],
        },
      },
      expectedFieldsDiff: {
        tags: {
          base_version: ['tagA'],
          current_version: ['tagB'],
          target_version: ['tagC'],
          merged_version: ['tagB', 'tagC'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
  ],
  severity: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          severity: 'low',
        },
        patch: {},
        upgrade: {
          type: 'query',
          severity: 'medium',
        },
      },
      expectedFieldsDiff: {
        severity: {
          base_version: 'low',
          current_version: 'low',
          target_version: 'medium',
          merged_version: 'medium',
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          severity: 'low',
        },
        patch: {
          severity: 'high',
        },
        upgrade: {
          type: 'query',
          severity: 'low',
        },
      },
      expectedFieldsDiff: {
        severity: {
          base_version: 'low',
          current_version: 'high',
          target_version: 'low',
          merged_version: 'high',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          severity: 'low',
        },
        patch: {
          severity: 'high',
        },
        upgrade: {
          type: 'query',
          severity: 'high',
        },
      },
      expectedFieldsDiff: {
        severity: {
          base_version: 'low',
          current_version: 'high',
          target_version: 'high',
          merged_version: 'high',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          severity: 'low',
        },
        patch: {
          severity: 'medium',
        },
        upgrade: {
          type: 'query',
          severity: 'high',
        },
      },
      expectedFieldsDiff: {
        severity: {
          base_version: 'low',
          current_version: 'medium',
          target_version: 'high',
          merged_version: 'medium',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  severity_mapping: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
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
              value: '20',
            },
          ],
        },
      },
      expectedFieldsDiff: {
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
              field: 'fieldA',
              operator: 'equals',
              severity: 'low',
              value: '20',
            },
          ],
          merged_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              severity: 'low',
              value: '20',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
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
              severity: 'low',
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
      expectedFieldsDiff: {
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
              severity: 'low',
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
              severity: 'low',
              value: '30',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  risk_score: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          risk_score: 10,
        },
        patch: {},
        upgrade: {
          type: 'query',
          risk_score: 50,
        },
      },
      expectedFieldsDiff: {
        risk_score: {
          base_version: 10,
          current_version: 10,
          target_version: 50,
          merged_version: 50,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          risk_score: 10,
        },
        patch: {
          risk_score: 30,
        },
        upgrade: {
          type: 'query',
          risk_score: 10,
        },
      },
      expectedFieldsDiff: {
        risk_score: {
          base_version: 10,
          current_version: 30,
          target_version: 10,
          merged_version: 30,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          risk_score: 10,
        },
        patch: {
          risk_score: 40,
        },
        upgrade: {
          type: 'query',
          risk_score: 40,
        },
      },
      expectedFieldsDiff: {
        risk_score: {
          base_version: 10,
          current_version: 40,
          target_version: 40,
          merged_version: 40,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          risk_score: 10,
        },
        patch: {
          risk_score: 50,
        },
        upgrade: {
          type: 'query',
          risk_score: 30,
        },
      },
      expectedFieldsDiff: {
        risk_score: {
          base_version: 10,
          current_version: 50,
          target_version: 30,
          merged_version: 50,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  risk_score_mapping: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '20',
              risk_score: 20,
            },
          ],
        },
      },
      expectedFieldsDiff: {
        risk_score_mapping: {
          base_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
          current_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
          target_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '20',
              risk_score: 20,
            },
          ],
          merged_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '20',
              risk_score: 20,
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
        patch: {
          risk_score_mapping: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
        },
        upgrade: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
      },
      expectedFieldsDiff: {
        risk_score_mapping: {
          base_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
          current_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
          target_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
          merged_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
        patch: {
          risk_score_mapping: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
        },
        upgrade: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
        },
      },
      expectedFieldsDiff: {
        risk_score_mapping: {
          base_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
          current_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
          target_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
          merged_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
        patch: {
          risk_score_mapping: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
        },
        upgrade: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldC',
              operator: 'equals',
              value: '50',
              risk_score: 50,
            },
          ],
        },
      },
      expectedFieldsDiff: {
        risk_score_mapping: {
          base_version: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
          current_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
          target_version: [
            {
              field: 'fieldC',
              operator: 'equals',
              value: '50',
              risk_score: 50,
            },
          ],
          merged_version: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  references: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          references: ['http://url-1'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          references: ['http://url-1', 'http://url-2'],
        },
      },
      expectedFieldsDiff: {
        references: {
          base_version: ['http://url-1'],
          current_version: ['http://url-1'],
          target_version: ['http://url-1', 'http://url-2'],
          merged_version: ['http://url-1', 'http://url-2'],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          references: ['http://url-1'],
        },
        patch: {
          references: ['http://url-1', 'http://url-2'],
        },
        upgrade: {
          type: 'query',
          references: ['http://url-1'],
        },
      },
      expectedFieldsDiff: {
        references: {
          base_version: ['http://url-1'],
          current_version: ['http://url-1', 'http://url-2'],
          target_version: ['http://url-1'],
          merged_version: ['http://url-1', 'http://url-2'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          references: ['http://url-1'],
        },
        patch: {
          references: ['http://url-1', 'http://url-2'],
        },
        upgrade: {
          type: 'query',
          references: ['http://url-1', 'http://url-2'],
        },
      },
      expectedFieldsDiff: {
        references: {
          base_version: ['http://url-1'],
          current_version: ['http://url-1', 'http://url-2'],
          target_version: ['http://url-1', 'http://url-2'],
          merged_version: ['http://url-1', 'http://url-2'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          references: ['http://url-1'],
        },
        patch: {
          references: ['http://url-3'],
        },
        upgrade: {
          type: 'query',
          references: ['http://url-1', 'http://url-2'],
        },
      },
      expectedFieldsDiff: {
        references: {
          base_version: ['http://url-1'],
          current_version: ['http://url-3'],
          target_version: ['http://url-1', 'http://url-2'],
          merged_version: ['http://url-3', 'http://url-2'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
  ],
  false_positives: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          false_positives: ['example1'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          false_positives: ['example1', 'example2'],
        },
      },
      expectedFieldsDiff: {
        false_positives: {
          base_version: ['example1'],
          current_version: ['example1'],
          target_version: ['example1', 'example2'],
          merged_version: ['example1', 'example2'],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          false_positives: ['example1'],
        },
        patch: {
          false_positives: ['example1', 'example2'],
        },
        upgrade: {
          type: 'query',
          false_positives: ['example1'],
        },
      },
      expectedFieldsDiff: {
        false_positives: {
          base_version: ['example1'],
          current_version: ['example1', 'example2'],
          target_version: ['example1'],
          merged_version: ['example1', 'example2'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          false_positives: ['example1'],
        },
        patch: {
          false_positives: ['example1', 'example2'],
        },
        upgrade: {
          type: 'query',
          false_positives: ['example1', 'example2'],
        },
      },
      expectedFieldsDiff: {
        false_positives: {
          base_version: ['example1'],
          current_version: ['example1', 'example2'],
          target_version: ['example1', 'example2'],
          merged_version: ['example1', 'example2'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          false_positives: ['example1'],
        },
        patch: {
          false_positives: ['example3'],
        },
        upgrade: {
          type: 'query',
          false_positives: ['example1', 'example2'],
        },
      },
      expectedFieldsDiff: {
        false_positives: {
          base_version: ['example1'],
          current_version: ['example3'],
          target_version: ['example1', 'example2'],
          merged_version: ['example3'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  threat: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
      },
      expectedFieldsDiff: {
        threat: {
          base_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
          current_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
          target_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
          merged_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
        patch: {
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
        upgrade: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
      },
      expectedFieldsDiff: {
        threat: {
          base_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
          current_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
          target_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
          merged_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
        patch: {
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
        upgrade: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
      },
      expectedFieldsDiff: {
        threat: {
          base_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
          current_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
          target_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
          merged_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
        },
        patch: {
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
        },
        upgrade: {
          type: 'query',
          threat: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticC',
                id: 'tacticC',
                reference: 'reference',
              },
            },
          ],
        },
      },
      expectedFieldsDiff: {
        threat: {
          base_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticA',
                id: 'tacticA',
                reference: 'reference',
              },
            },
          ],
          current_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
          target_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticC',
                id: 'tacticC',
                reference: 'reference',
              },
            },
          ],
          merged_version: [
            {
              framework: 'something',
              tactic: {
                name: 'tacticB',
                id: 'tacticB',
                reference: 'reference',
              },
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  note: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          note: 'some note',
        },
        patch: {},
        upgrade: {
          type: 'query',
          note: 'new note',
        },
      },
      expectedFieldsDiff: {
        note: {
          base_version: 'some note',
          current_version: 'some note',
          target_version: 'new note',
          merged_version: 'new note',
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          note: 'some note',
        },
        patch: {
          note: 'updated note',
        },
        upgrade: {
          type: 'query',
          note: 'some note',
        },
      },
      expectedFieldsDiff: {
        note: {
          base_version: 'some note',
          current_version: 'updated note',
          target_version: 'some note',
          merged_version: 'updated note',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          note: 'some note',
        },
        patch: {
          note: 'updated note',
        },
        upgrade: {
          type: 'query',
          note: 'updated note',
        },
      },
      expectedFieldsDiff: {
        note: {
          base_version: 'some note',
          current_version: 'updated note',
          target_version: 'updated note',
          merged_version: 'updated note',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          note: 'line 1\nline 2',
        },
        patch: {
          note: 'Customized line\nline 1\nline 2',
        },
        upgrade: {
          type: 'query',
          note: 'line 1\nline 3',
        },
      },
      expectedFieldsDiff: {
        note: {
          base_version: 'line 1\nline 2',
          current_version: 'Customized line\nline 1\nline 2',
          target_version: 'line 1\nline 3',
          merged_version: 'Customized line\nline 1\nline 3',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          note: 'some note',
        },
        patch: {
          note: 'customized note',
        },
        upgrade: {
          type: 'query',
          note: 'updated note',
        },
      },
      expectedFieldsDiff: {
        note: {
          base_version: 'some note',
          current_version: 'customized note',
          target_version: 'updated note',
          merged_version: 'customized note',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  setup: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          setup: 'some setup',
        },
        patch: {},
        upgrade: {
          type: 'query',
          setup: 'new setup',
        },
      },
      expectedFieldsDiff: {
        setup: {
          base_version: 'some setup',
          current_version: 'some setup',
          target_version: 'new setup',
          merged_version: 'new setup',
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          setup: 'some setup',
        },
        patch: {
          setup: 'updated setup',
        },
        upgrade: {
          type: 'query',
          setup: 'some setup',
        },
      },
      expectedFieldsDiff: {
        setup: {
          base_version: 'some setup',
          current_version: 'updated setup',
          target_version: 'some setup',
          merged_version: 'updated setup',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          setup: 'some setup',
        },
        patch: {
          setup: 'updated setup',
        },
        upgrade: {
          type: 'query',
          setup: 'updated setup',
        },
      },
      expectedFieldsDiff: {
        setup: {
          base_version: 'some setup',
          current_version: 'updated setup',
          target_version: 'updated setup',
          merged_version: 'updated setup',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          setup: 'line 1\nline 2',
        },
        patch: {
          setup: 'Customized line\nline 1\nline 2',
        },
        upgrade: {
          type: 'query',
          setup: 'line 1\nline 3',
        },
      },
      expectedFieldsDiff: {
        setup: {
          base_version: 'line 1\nline 2',
          current_version: 'Customized line\nline 1\nline 2',
          target_version: 'line 1\nline 3',
          merged_version: 'Customized line\nline 1\nline 3',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          setup: 'some setup',
        },
        patch: {
          setup: 'customized setup',
        },
        upgrade: {
          type: 'query',
          setup: 'updated setup',
        },
      },
      expectedFieldsDiff: {
        setup: {
          base_version: 'some setup',
          current_version: 'customized setup',
          target_version: 'updated setup',
          merged_version: 'customized setup',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  related_integrations: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
          ],
        },
      },
      expectedFieldsDiff: {
        related_integrations: {
          base_version: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
          current_version: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
          target_version: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
          ],
          merged_version: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
        patch: {
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
        },
        upgrade: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
      },
      expectedFieldsDiff: {
        related_integrations: {
          base_version: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
          current_version: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
          target_version: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
          merged_version: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
        patch: {
          related_integrations: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
        },
        upgrade: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
        },
      },
      expectedFieldsDiff: {
        related_integrations: {
          base_version: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
          current_version: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
          target_version: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
          merged_version: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
        },
        patch: {
          related_integrations: [
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
        },
        upgrade: {
          type: 'query',
          related_integrations: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
            {
              package: 'packageB',
              version: '^2.0.0',
            },
          ],
        },
      },
      expectedFieldsDiff: {
        related_integrations: {
          base_version: [
            {
              package: 'packageA',
              version: '^1.0.0',
            },
          ],
          current_version: [
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
          target_version: [
            {
              package: 'packageA',
              version: '^2.0.0',
            },
            {
              package: 'packageB',
              version: '^2.0.0',
            },
          ],
          merged_version: [
            {
              package: 'packageB',
              version: '^1.0.0',
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  required_fields: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
            },
          ],
        },
      },
      expectedFieldsDiff: {
        required_fields: {
          base_version: [
            {
              name: 'fieldA',
              type: 'string',
              ecs: false,
            },
          ],
          current_version: [
            {
              name: 'fieldA',
              type: 'string',
              ecs: false,
            },
          ],
          target_version: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
          merged_version: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        },
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
      },
      expectedFieldsDiff: {
        required_fields: {
          base_version: [
            {
              name: 'fieldA',
              type: 'string',
              ecs: false,
            },
          ],
          current_version: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
          target_version: [
            {
              name: 'fieldA',
              type: 'string',
              ecs: false,
            },
          ],
          merged_version: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        },
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
            },
          ],
        },
      },
      expectedFieldsDiff: {
        required_fields: {
          base_version: [
            {
              name: 'fieldA',
              type: 'string',
              ecs: false,
            },
          ],
          current_version: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
          target_version: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
          merged_version: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        },
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldC',
              type: 'string',
            },
          ],
        },
      },
      expectedFieldsDiff: {
        required_fields: {
          base_version: [
            {
              name: 'fieldA',
              type: 'string',
              ecs: false,
            },
          ],
          current_version: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
          target_version: [
            {
              name: 'fieldC',
              type: 'string',
              ecs: false,
            },
          ],
          merged_version: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  rule_schedule: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
        patch: {},
        upgrade: {
          type: 'query',
          interval: '5m',
          from: 'now-15m',
          to: 'now',
        },
      },
      expectedFieldsDiff: {
        rule_schedule: {
          base_version: {
            interval: '5m',
            lookback: '300s',
          },
          current_version: {
            interval: '5m',
            lookback: '300s',
          },
          target_version: {
            interval: '5m',
            lookback: '600s',
          },
          merged_version: {
            interval: '5m',
            lookback: '600s',
          },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
        patch: {
          from: 'now-20m',
        },
        upgrade: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
      },
      expectedFieldsDiff: {
        rule_schedule: {
          base_version: {
            interval: '5m',
            lookback: '300s',
          },
          current_version: {
            interval: '5m',
            lookback: '900s',
          },
          target_version: {
            interval: '5m',
            lookback: '300s',
          },
          merged_version: {
            interval: '5m',
            lookback: '900s',
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
        patch: {
          from: 'now-20m',
        },
        upgrade: {
          type: 'query',
          interval: '5m',
          from: 'now-20m',
          to: 'now',
        },
      },
      expectedFieldsDiff: {
        rule_schedule: {
          base_version: {
            interval: '5m',
            lookback: '300s',
          },
          current_version: {
            interval: '5m',
            lookback: '900s',
          },
          target_version: {
            interval: '5m',
            lookback: '900s',
          },
          merged_version: {
            interval: '5m',
            lookback: '900s',
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
        patch: {
          from: 'now-20m',
        },
        upgrade: {
          type: 'query',
          interval: '5m',
          from: 'now-15m',
          to: 'now',
        },
      },
      expectedFieldsDiff: {
        rule_schedule: {
          base_version: {
            interval: '5m',
            lookback: '300s',
          },
          current_version: {
            interval: '5m',
            lookback: '900s',
          },
          target_version: {
            interval: '5m',
            lookback: '600s',
          },
          merged_version: {
            interval: '5m',
            lookback: '900s',
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  max_signals: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          max_signals: 100,
        },
        patch: {},
        upgrade: {
          type: 'query',
          max_signals: 150,
        },
      },
      expectedFieldsDiff: {
        max_signals: {
          base_version: 100,
          current_version: 100,
          target_version: 150,
          merged_version: 150,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          max_signals: 100,
        },
        patch: {
          max_signals: 130,
        },
        upgrade: {
          type: 'query',
          max_signals: 100,
        },
      },
      expectedFieldsDiff: {
        max_signals: {
          base_version: 100,
          current_version: 130,
          target_version: 100,
          merged_version: 130,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          max_signals: 100,
        },
        patch: {
          max_signals: 150,
        },
        upgrade: {
          type: 'query',
          max_signals: 150,
        },
      },
      expectedFieldsDiff: {
        max_signals: {
          base_version: 100,
          current_version: 150,
          target_version: 150,
          merged_version: 150,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          max_signals: 100,
        },
        patch: {
          max_signals: 130,
        },
        upgrade: {
          type: 'query',
          max_signals: 150,
        },
      },
      expectedFieldsDiff: {
        max_signals: {
          base_version: 100,
          current_version: 130,
          target_version: 150,
          merged_version: 130,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  rule_name_override: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          rule_name_override: 'fieldB',
        },
      },
      expectedFieldsDiff: {
        rule_name_override: {
          base_version: { field_name: 'fieldA' },
          current_version: { field_name: 'fieldA' },
          target_version: { field_name: 'fieldB' },
          merged_version: { field_name: 'fieldB' },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
        patch: {
          rule_name_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
      },
      expectedFieldsDiff: {
        rule_name_override: {
          base_version: { field_name: 'fieldA' },
          current_version: { field_name: 'fieldB' },
          target_version: { field_name: 'fieldA' },
          merged_version: { field_name: 'fieldB' },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
        patch: {
          rule_name_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          rule_name_override: 'fieldB',
        },
      },
      expectedFieldsDiff: {
        rule_name_override: {
          base_version: { field_name: 'fieldA' },
          current_version: { field_name: 'fieldB' },
          target_version: { field_name: 'fieldB' },
          merged_version: { field_name: 'fieldB' },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
        patch: {
          rule_name_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          rule_name_override: 'fieldC',
        },
      },
      expectedFieldsDiff: {
        rule_name_override: {
          base_version: { field_name: 'fieldA' },
          current_version: { field_name: 'fieldB' },
          target_version: { field_name: 'fieldC' },
          merged_version: { field_name: 'fieldB' },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  timestamp_override: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          timestamp_override: 'fieldB',
        },
      },
      expectedFieldsDiff: {
        timestamp_override: {
          base_version: { field_name: 'fieldA', fallback_disabled: false },
          current_version: { field_name: 'fieldA', fallback_disabled: false },
          target_version: { field_name: 'fieldB', fallback_disabled: false },
          merged_version: { field_name: 'fieldB', fallback_disabled: false },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
        patch: {
          timestamp_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
      },
      expectedFieldsDiff: {
        timestamp_override: {
          base_version: { field_name: 'fieldA', fallback_disabled: false },
          current_version: { field_name: 'fieldB', fallback_disabled: false },
          target_version: { field_name: 'fieldA', fallback_disabled: false },
          merged_version: { field_name: 'fieldB', fallback_disabled: false },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
        patch: {
          timestamp_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          timestamp_override: 'fieldB',
        },
      },
      expectedFieldsDiff: {
        timestamp_override: {
          base_version: { field_name: 'fieldA', fallback_disabled: false },
          current_version: { field_name: 'fieldB', fallback_disabled: false },
          target_version: { field_name: 'fieldB', fallback_disabled: false },
          merged_version: { field_name: 'fieldB', fallback_disabled: false },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
        patch: {
          timestamp_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          timestamp_override: 'fieldC',
        },
      },
      expectedFieldsDiff: {
        timestamp_override: {
          base_version: { field_name: 'fieldA', fallback_disabled: false },
          current_version: { field_name: 'fieldB', fallback_disabled: false },
          target_version: { field_name: 'fieldC', fallback_disabled: false },
          merged_version: { field_name: 'fieldB', fallback_disabled: false },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  timeline_template: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
      },
      expectedFieldsDiff: {
        timeline_template: {
          base_version: { timeline_id: 'A', timeline_title: 'timelineA' },
          current_version: { timeline_id: 'A', timeline_title: 'timelineA' },
          target_version: { timeline_id: 'B', timeline_title: 'timelineB' },
          merged_version: { timeline_id: 'B', timeline_title: 'timelineB' },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
        patch: {
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
        upgrade: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
      },
      expectedFieldsDiff: {
        timeline_template: {
          base_version: { timeline_id: 'A', timeline_title: 'timelineA' },
          current_version: { timeline_id: 'B', timeline_title: 'timelineB' },
          target_version: { timeline_id: 'A', timeline_title: 'timelineA' },
          merged_version: { timeline_id: 'B', timeline_title: 'timelineB' },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
        patch: {
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
        upgrade: {
          type: 'query',
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
      },
      expectedFieldsDiff: {
        timeline_template: {
          base_version: { timeline_id: 'A', timeline_title: 'timelineA' },
          current_version: { timeline_id: 'B', timeline_title: 'timelineB' },
          target_version: { timeline_id: 'B', timeline_title: 'timelineB' },
          merged_version: { timeline_id: 'B', timeline_title: 'timelineB' },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          timeline_id: 'A',
          timeline_title: 'timelineA',
        },
        patch: {
          timeline_id: 'B',
          timeline_title: 'timelineB',
        },
        upgrade: {
          type: 'query',
          timeline_id: 'C',
          timeline_title: 'timelineC',
        },
      },
      expectedFieldsDiff: {
        timeline_template: {
          base_version: { timeline_id: 'A', timeline_title: 'timelineA' },
          current_version: { timeline_id: 'B', timeline_title: 'timelineB' },
          target_version: { timeline_id: 'C', timeline_title: 'timelineC' },
          merged_version: { timeline_id: 'B', timeline_title: 'timelineB' },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  building_block: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          building_block_type: 'default',
        },
        patch: {},
        upgrade: {
          type: 'query',
          building_block_type: undefined,
        },
      },
      expectedFieldsDiff: {
        // @ts-expect-error testing versions equals undefined
        building_block: {
          base_version: { type: 'default' },
          current_version: { type: 'default' },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          building_block_type: 'default',
        },
        patch: {
          building_block_type: '',
        },
        upgrade: {
          type: 'query',
          building_block_type: 'default',
        },
      },
      expectedFieldsDiff: {
        // @ts-expect-error testing versions equals undefined
        building_block: {
          base_version: { type: 'default' },
          target_version: { type: 'default' },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          building_block_type: 'default',
        },
        patch: {
          building_block_type: 'custom',
        },
        upgrade: {
          type: 'query',
          building_block_type: 'custom',
        },
      },
      expectedFieldsDiff: {
        building_block: {
          base_version: { type: 'default' },
          current_version: { type: 'custom' },
          target_version: { type: 'custom' },
          merged_version: { type: 'custom' },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          building_block_type: 'default',
        },
        patch: {
          building_block_type: 'custom',
        },
        upgrade: {
          type: 'query',
          building_block_type: undefined,
        },
      },
      expectedFieldsDiff: {
        // @ts-expect-error testing versions equals undefined
        building_block: {
          base_version: { type: 'default' },
          current_version: { type: 'custom' },
          merged_version: { type: 'custom' },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  investigation_fields: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
        patch: {},
        upgrade: {
          type: 'query',
          investigation_fields: { field_names: ['fieldB'] },
        },
      },
      expectedFieldsDiff: {
        investigation_fields: {
          base_version: { field_names: ['fieldA'] },
          current_version: { field_names: ['fieldA'] },
          target_version: { field_names: ['fieldB'] },
          merged_version: { field_names: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
        patch: {
          investigation_fields: { field_names: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
      },
      expectedFieldsDiff: {
        investigation_fields: {
          base_version: { field_names: ['fieldA'] },
          current_version: { field_names: ['fieldB'] },
          target_version: { field_names: ['fieldA'] },
          merged_version: { field_names: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
        patch: {
          investigation_fields: { field_names: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          investigation_fields: { field_names: ['fieldB'] },
        },
      },
      expectedFieldsDiff: {
        investigation_fields: {
          base_version: { field_names: ['fieldA'] },
          current_version: { field_names: ['fieldB'] },
          target_version: { field_names: ['fieldB'] },
          merged_version: { field_names: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
        patch: {
          investigation_fields: { field_names: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          investigation_fields: { field_names: ['fieldC'] },
        },
      },
      expectedFieldsDiff: {
        investigation_fields: {
          base_version: { field_names: ['fieldA'] },
          current_version: { field_names: ['fieldB'] },
          target_version: { field_names: ['fieldC'] },
          merged_version: { field_names: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  'data_source (index patterns)': [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
  ],
  'data_source (data view)': [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  alert_suppression: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
        patch: {},
        upgrade: {
          type: 'query',
          alert_suppression: { group_by: ['fieldB'] },
        },
      },
      expectedFieldsDiff: {
        alert_suppression: {
          base_version: { group_by: ['fieldA'] },
          current_version: { group_by: ['fieldA'] },
          target_version: { group_by: ['fieldB'] },
          merged_version: { group_by: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
        patch: {
          alert_suppression: { group_by: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
      },
      expectedFieldsDiff: {
        alert_suppression: {
          base_version: { group_by: ['fieldA'] },
          current_version: { group_by: ['fieldB'] },
          target_version: { group_by: ['fieldA'] },
          merged_version: { group_by: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
        patch: {
          alert_suppression: { group_by: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          alert_suppression: { group_by: ['fieldB'] },
        },
      },
      expectedFieldsDiff: {
        alert_suppression: {
          base_version: { group_by: ['fieldA'] },
          current_version: { group_by: ['fieldB'] },
          target_version: { group_by: ['fieldB'] },
          merged_version: { group_by: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
        patch: {
          alert_suppression: { group_by: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          alert_suppression: { group_by: ['fieldC'] },
        },
      },
      expectedFieldsDiff: {
        alert_suppression: {
          base_version: { group_by: ['fieldA'] },
          current_version: { group_by: ['fieldB'] },
          target_version: { group_by: ['fieldC'] },
          merged_version: { group_by: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  // Custom Query, Saved Query, Threat Match, Threshold, New Terms
  kql_query: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'query',
          query: 'process.name:*.exe',
          language: 'kuery',
        },
        patch: {},
        upgrade: {
          type: 'query',
          query: 'process.name:*.sys',
          language: 'kuery',
        },
      },
      expectedFieldsDiff: {
        kql_query: {
          base_version: {
            query: 'process.name:*.exe',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          current_version: {
            query: 'process.name:*.exe',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          target_version: {
            query: 'process.name:*.sys',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          merged_version: {
            query: 'process.name:*.sys',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'query',
          query: 'process.name:*.exe',
          language: 'kuery',
        },
        patch: {
          query: '*:*',
        },
        upgrade: {
          type: 'query',
          query: 'process.name:*.exe',
          language: 'kuery',
        },
      },
      expectedFieldsDiff: {
        kql_query: {
          base_version: {
            query: 'process.name:*.exe',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          current_version: {
            query: '*:*',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          target_version: {
            query: 'process.name:*.exe',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          merged_version: {
            query: '*:*',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'query',
          query: 'process.name:*.exe',
          language: 'kuery',
        },
        patch: {
          query: '*:*',
        },
        upgrade: {
          type: 'query',
          query: '*:*',
          language: 'kuery',
        },
      },
      expectedFieldsDiff: {
        kql_query: {
          base_version: {
            query: 'process.name:*.exe',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          current_version: {
            query: '*:*',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          target_version: {
            query: '*:*',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          merged_version: {
            query: '*:*',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'query',
          query: 'process.name:*.exe',
          language: 'kuery',
        },
        patch: {
          query: '*:*',
        },
        upgrade: {
          type: 'query',
          query: 'process.name:*.sys',
          language: 'kuery',
        },
      },
      expectedFieldsDiff: {
        kql_query: {
          base_version: {
            query: 'process.name:*.exe',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          current_version: {
            query: '*:*',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          target_version: {
            query: 'process.name:*.sys',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          merged_version: {
            query: '*:*',
            language: 'kuery',
            type: KqlQueryType.inline_query,
            filters: [],
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  // EQL
  eql_query: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  // ES|QL
  esql_query: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
        patch: {},
        upgrade: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
      },
      expectedFieldsDiff: {
        esql_query: {
          base_version: {
            query: 'FROM indexA METADATA _id',
            language: 'esql',
          },
          current_version: {
            query: 'FROM indexA METADATA _id',
            language: 'esql',
          },
          target_version: {
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          merged_version: {
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
        patch: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
        upgrade: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
      },
      expectedFieldsDiff: {
        esql_query: {
          base_version: {
            query: 'FROM indexA METADATA _id',
            language: 'esql',
          },
          current_version: {
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          target_version: {
            query: 'FROM indexA METADATA _id',
            language: 'esql',
          },
          merged_version: {
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
        patch: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
        upgrade: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
      },
      expectedFieldsDiff: {
        esql_query: {
          base_version: {
            query: 'FROM indexA METADATA _id',
            language: 'esql',
          },
          current_version: {
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          target_version: {
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          merged_version: {
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
        patch: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
        upgrade: {
          type: 'esql',
          query: 'FROM indexC METADATA _id',
          language: 'esql',
        },
      },
      expectedFieldsDiff: {
        esql_query: {
          base_version: {
            query: 'FROM indexA METADATA _id',
            language: 'esql',
          },
          current_version: {
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          target_version: {
            query: 'FROM indexC METADATA _id',
            language: 'esql',
          },
          merged_version: {
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  // Threat Match
  threat_index: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)',
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
      expectedFieldsDiff: {
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
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
  ],
  threat_query: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
      },
      expectedFieldsDiff: {
        threat_query: {
          base_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.exe',
            language: 'kuery',
            filters: [],
          },
          current_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.exe',
            language: 'kuery',
            filters: [],
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.sys',
            language: 'kuery',
            filters: [],
          },
          merged_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.sys',
            language: 'kuery',
            filters: [],
          },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
        patch: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
        upgrade: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
      },
      expectedFieldsDiff: {
        threat_query: {
          base_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.exe',
            language: 'kuery',
            filters: [],
          },
          current_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.sys',
            language: 'kuery',
            filters: [],
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.exe',
            language: 'kuery',
            filters: [],
          },
          merged_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.sys',
            language: 'kuery',
            filters: [],
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
        patch: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
        upgrade: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
      },
      expectedFieldsDiff: {
        threat_query: {
          base_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.exe',
            language: 'kuery',
            filters: [],
          },
          current_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.sys',
            language: 'kuery',
            filters: [],
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.sys',
            language: 'kuery',
            filters: [],
          },
          merged_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.sys',
            language: 'kuery',
            filters: [],
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
        patch: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
        upgrade: {
          type: 'threat_match',
          threat_query: 'process.name:*.com',
        },
      },
      expectedFieldsDiff: {
        threat_query: {
          base_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.exe',
            language: 'kuery',
            filters: [],
          },
          current_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.sys',
            language: 'kuery',
            filters: [],
          },
          target_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.com',
            language: 'kuery',
            filters: [],
          },
          merged_version: {
            type: KqlQueryType.inline_query,
            query: 'process.name:*.sys',
            language: 'kuery',
            filters: [],
          },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  threat_mapping: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
      },
      expectedFieldsDiff: {
        threat_mapping: {
          base_version: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
          current_version: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
          target_version: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          merged_version: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
        patch: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
        upgrade: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
      },
      expectedFieldsDiff: {
        threat_mapping: {
          base_version: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
          current_version: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          target_version: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
          merged_version: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
        patch: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
        upgrade: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
      },
      expectedFieldsDiff: {
        threat_mapping: {
          base_version: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
          current_version: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          target_version: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          merged_version: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
        patch: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
        upgrade: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldC', value: 'fieldZ' }] }],
        },
      },
      expectedFieldsDiff: {
        threat_mapping: {
          base_version: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
          current_version: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          target_version: [{ entries: [{ type: 'mapping', field: 'fieldC', value: 'fieldZ' }] }],
          merged_version: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  threat_indicator_path: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
      },
      expectedFieldsDiff: {
        threat_indicator_path: {
          base_version: 'fieldA',
          current_version: 'fieldA',
          target_version: 'fieldB',
          merged_version: 'fieldB',
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
        patch: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
        upgrade: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
      },
      expectedFieldsDiff: {
        threat_indicator_path: {
          base_version: 'fieldA',
          current_version: 'fieldB',
          target_version: 'fieldA',
          merged_version: 'fieldB',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
        patch: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
        upgrade: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
      },
      expectedFieldsDiff: {
        threat_indicator_path: {
          base_version: 'fieldA',
          current_version: 'fieldB',
          target_version: 'fieldB',
          merged_version: 'fieldB',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
        patch: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
        upgrade: {
          type: 'threat_match',
          threat_indicator_path: 'fieldC',
        },
      },
      expectedFieldsDiff: {
        threat_indicator_path: {
          base_version: 'fieldA',
          current_version: 'fieldB',
          target_version: 'fieldC',
          merged_version: 'fieldB',
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  // Threshold
  threshold: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
        patch: {},
        upgrade: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
      },
      expectedFieldsDiff: {
        threshold: {
          base_version: { value: 10, field: ['fieldA'] },
          current_version: { value: 10, field: ['fieldA'] },
          target_version: { value: 10, field: ['fieldB'] },
          merged_version: { value: 10, field: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
        patch: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
        upgrade: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
      },
      expectedFieldsDiff: {
        threshold: {
          base_version: { value: 10, field: ['fieldA'] },
          current_version: { value: 10, field: ['fieldB'] },
          target_version: { value: 10, field: ['fieldA'] },
          merged_version: { value: 10, field: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
        patch: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
        upgrade: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
      },
      expectedFieldsDiff: {
        threshold: {
          base_version: { value: 10, field: ['fieldA'] },
          current_version: { value: 10, field: ['fieldB'] },
          target_version: { value: 10, field: ['fieldB'] },
          merged_version: { value: 10, field: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
        patch: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
        upgrade: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldC' },
        },
      },
      expectedFieldsDiff: {
        threshold: {
          base_version: { value: 10, field: ['fieldA'] },
          current_version: { value: 10, field: ['fieldB'] },
          target_version: { value: 10, field: ['fieldC'] },
          merged_version: { value: 10, field: ['fieldB'] },
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  // Machine Learning
  machine_learning_job_id: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
        patch: {},
        upgrade: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
      },
      expectedFieldsDiff: {
        machine_learning_job_id: {
          base_version: ['jobA'],
          current_version: ['jobA'],
          target_version: ['jobB'],
          merged_version: ['jobB'],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
        patch: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
        upgrade: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
      },
      expectedFieldsDiff: {
        machine_learning_job_id: {
          base_version: ['jobA'],
          current_version: ['jobB'],
          target_version: ['jobA'],
          merged_version: ['jobB'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
        patch: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
        upgrade: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
      },
      expectedFieldsDiff: {
        machine_learning_job_id: {
          base_version: ['jobA'],
          current_version: ['jobB'],
          target_version: ['jobB'],
          merged_version: ['jobB'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
        patch: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
        upgrade: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobC',
        },
      },
      expectedFieldsDiff: {
        machine_learning_job_id: {
          base_version: ['jobA'],
          current_version: ['jobB'],
          target_version: ['jobC'],
          merged_version: ['jobB'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  anomaly_threshold: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
        patch: {},
        upgrade: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
      },
      expectedFieldsDiff: {
        anomaly_threshold: {
          base_version: 10,
          current_version: 10,
          target_version: 20,
          merged_version: 20,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
        patch: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
        upgrade: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
      },
      expectedFieldsDiff: {
        anomaly_threshold: {
          base_version: 10,
          current_version: 20,
          target_version: 10,
          merged_version: 20,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
        patch: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
        upgrade: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
      },
      expectedFieldsDiff: {
        anomaly_threshold: {
          base_version: 10,
          current_version: 20,
          target_version: 20,
          merged_version: 20,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)',
      assets: {
        installed: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
        patch: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
        upgrade: {
          type: 'machine_learning',
          anomaly_threshold: 30,
        },
      },
      expectedFieldsDiff: {
        anomaly_threshold: {
          base_version: 10,
          current_version: 20,
          target_version: 30,
          merged_version: 20,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 1,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 1,
      },
    },
  ],
  // New Terms
  new_terms_fields: [
    {
      name: 'returns non-customized field with an upgrade (AAB diff case)',
      assets: {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {},
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
      },
      expectedFieldsDiff: {
        new_terms_fields: {
          base_version: ['fieldA'],
          current_version: ['fieldA'],
          target_version: ['fieldB'],
          merged_version: ['fieldB'],
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Target,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field without an upgrade (ABA diff case)',
      assets: {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
      },
      expectedFieldsDiff: {
        new_terms_fields: {
          base_version: ['fieldA'],
          current_version: ['fieldB'],
          target_version: ['fieldA'],
          merged_version: ['fieldB'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with a matching upgrade (ABB diff case)',
      assets: {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
      },
      expectedFieldsDiff: {
        new_terms_fields: {
          base_version: ['fieldA'],
          current_version: ['fieldB'],
          target_version: ['fieldB'],
          merged_version: ['fieldB'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 0,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 1,
        num_fields_with_conflicts: 0,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)',
      assets: {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldA', 'fieldC'],
        },
      },
      expectedFieldsDiff: {
        new_terms_fields: {
          base_version: ['fieldA'],
          current_version: ['fieldB'],
          target_version: ['fieldA', 'fieldC'],
          merged_version: ['fieldB', 'fieldC'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
    {
      name: 'returns customized field with an upgrade resulting in a conflict (ABC diff case, solvable conflict)',
      assets: {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldC'],
        },
      },
      expectedFieldsDiff: {
        new_terms_fields: {
          base_version: ['fieldA'],
          current_version: ['fieldB'],
          target_version: ['fieldC'],
          merged_version: ['fieldB', 'fieldC'],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
          has_base_version: true,
        },
      },
      expectedStats: {
        num_rules_to_upgrade_total: 1,
        num_rules_with_conflicts: 1,
        num_rules_with_non_solvable_conflicts: 0,
      },
      expectedFieldsDiffStats: {
        num_fields_with_updates: 2,
        num_fields_with_conflicts: 1,
        num_fields_with_non_solvable_conflicts: 0,
      },
    },
  ],
};

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

    const deps = { es, supertest, log };

    for (const [fieldName, fieldTestDataArray] of Object.entries(FIELDS_TEST_DATA)) {
      describe(`review upgrade preview for "${fieldName}" field`, () => {
        for (const fieldTestData of fieldTestDataArray) {
          it(fieldTestData.name, async () => {
            await setUpRuleUpgrade({
              assets: fieldTestData.assets,
              deps,
            });

            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);

            expect(reviewResponse.rules).toHaveLength(1);
            expect(reviewResponse.stats).toMatchObject(fieldTestData.expectedStats);
            expect(reviewResponse.rules[0].diff).toMatchObject(
              fieldTestData.expectedFieldsDiffStats
            );
            expect(reviewResponse.rules[0].diff.fields).toMatchObject(
              fieldTestData.expectedFieldsDiff
            );
          });
        }
      });
    }
  });
};
