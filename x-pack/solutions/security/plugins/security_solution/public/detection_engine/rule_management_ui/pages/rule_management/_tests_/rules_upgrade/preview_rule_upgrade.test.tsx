/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, fireEvent, within, screen } from '@testing-library/react';
import { RulesPage } from '../..';
import type { RuleUpgradeStatsForReview } from '../../../../../../../common/api/detection_engine';
import {
  DataSourceType,
  KqlQueryType,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../../../../common/api/detection_engine';
import { reviewRuleUpgrade } from '../../../../../rule_management/api/api';
import { TestRuleUpgradeProviders } from './mock/test_rule_upgrade_provides';

// Enable Prebuilt Rules Customization feature
jest.mock('../../../../../../../common/experimental_features', () => {
  const actual = jest.requireActual('../../../../../../../common/experimental_features');

  return {
    ...actual,
    allowedExperimentalValues: {
      ...actual.allowedExperimentalValues,
      prebuiltRulesCustomizationEnabled: true,
    },
  };
});
jest.mock('../../../../../../detections/components/user_info');
jest.mock('../../../../../../detections/containers/detection_engine/lists/use_lists_config');
jest.mock('../../../../../rule_management/api/api', () => ({
  getPrebuiltRulesStatus: jest.fn().mockResolvedValue({
    stats: {
      num_prebuilt_rules_installed: 1,
      num_prebuilt_rules_to_install: 0,
      num_prebuilt_rules_to_upgrade: 1,
      num_prebuilt_rules_total_in_package: 1,
    },
  }),
  reviewRuleUpgrade: jest.fn().mockResolvedValue({
    stats: {
      num_rules_to_upgrade_total: 1,
      num_rules_with_conflicts: 0,
      num_rules_with_non_solvable_conflicts: 0,
      tags: [],
    },
    rules: [],
  }),
}));

const RULE_UPGRADE_PREVIEW_STATS_MOCK: RuleUpgradeStatsForReview = {
  num_rules_to_upgrade_total: 1,
  num_rules_with_conflicts: 0,
  num_rules_with_non_solvable_conflicts: 0,
  tags: [],
};

describe('Rule upgrade preview', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe.each([
    {
      ruleType: 'query',
      fieldName: 'name',
      humanizedFieldName: 'Name',
      initial: 'Name',
      customized: 'Custom name',
      upgrade: 'Updated name',
    },
    {
      ruleType: 'query',
      fieldName: 'description',
      humanizedFieldName: 'Description',
      initial: 'Initial description',
      customized: 'Custom description',
      upgrade: 'Updated description',
    },
    {
      ruleType: 'query',
      fieldName: 'severity',
      humanizedFieldName: 'Severity',
      initial: 'low',
      customized: 'medium',
      upgrade: 'high',
    },
    {
      ruleType: 'query',
      fieldName: 'severity_mapping',
      humanizedFieldName: 'Severity override',
      initial: [
        {
          field: 'fieldA',
          operator: 'equals',
          severity: 'low',
          value: '10',
        },
      ],
      customized: [
        {
          field: 'fieldB',
          operator: 'equals',
          severity: 'medium',
          value: '30',
        },
      ],
      upgrade: [
        {
          field: 'fieldC',
          operator: 'equals',
          severity: 'high',
          value: '50',
        },
      ],
    },
    {
      ruleType: 'query',
      fieldName: 'risk_score',
      humanizedFieldName: 'Risk Score',
      initial: 10,
      customized: 20,
      upgrade: 30,
    },
    {
      ruleType: 'query',
      fieldName: 'risk_score_mapping',
      humanizedFieldName: 'Risk score override',
      initial: [
        {
          field: 'fieldA',
          operator: 'equals',
          value: '10',
          risk_score: 10,
        },
      ],
      customized: [
        {
          field: 'fieldB',
          operator: 'equals',
          value: '30',
          risk_score: 30,
        },
      ],
      upgrade: [
        {
          field: 'fieldC',
          operator: 'equals',
          value: '50',
          risk_score: 50,
        },
      ],
    },
    {
      ruleType: 'query',
      fieldName: 'references',
      humanizedFieldName: 'Reference URLs',
      initial: ['http://url-1'],
      customized: ['http://url-2'],
      upgrade: ['http://url-3'],
    },
    {
      ruleType: 'query',
      fieldName: 'false_positives',
      humanizedFieldName: 'False Positives',
      initial: ['exampleA'],
      customized: ['exampleB'],
      upgrade: ['exampleC'],
    },
    {
      ruleType: 'query',
      fieldName: 'threat',
      humanizedFieldName: 'MITRE ATT&CK\u2122',
      initial: [
        {
          framework: 'something',
          tactic: {
            name: 'tacticA',
            id: 'tacticA',
            reference: 'reference',
          },
        },
      ],
      customized: [
        {
          framework: 'something',
          tactic: {
            name: 'tacticB',
            id: 'tacticB',
            reference: 'reference',
          },
        },
      ],
      upgrade: [
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
    {
      ruleType: 'query',
      fieldName: 'note',
      humanizedFieldName: 'Investigation guide',
      initial: 'Initial investigation guide',
      customized: 'Custom investigation guide',
      upgrade: 'Updated investigation guide',
    },
    {
      ruleType: 'query',
      fieldName: 'setup',
      humanizedFieldName: 'Setup',
      initial: 'Initial setup',
      customized: 'Custom setup',
      upgrade: 'Updated setup',
    },
    {
      ruleType: 'query',
      fieldName: 'related_integrations',
      humanizedFieldName: 'Related Integrations',
      initial: [
        {
          package: 'packageA',
          version: '^1.0.0',
        },
      ],
      customized: [
        {
          package: 'packageB',
          version: '^1.0.0',
        },
      ],
      upgrade: [
        {
          package: 'packageC',
          version: '^1.0.0',
        },
      ],
    },
    {
      ruleType: 'query',
      fieldName: 'required_fields',
      humanizedFieldName: 'Required fields',
      initial: [
        {
          name: 'fieldA',
          type: 'string',
          ecs: false,
        },
      ],
      customized: [
        {
          name: 'fieldB',
          type: 'string',
          ecs: false,
        },
      ],
      upgrade: [
        {
          name: 'fieldC',
          type: 'string',
          ecs: false,
        },
      ],
    },
    {
      ruleType: 'query',
      fieldName: 'rule_schedule',
      humanizedFieldName: 'Rule Schedule',
      initial: {
        interval: '5m',
        from: 'now-10m',
        to: 'now',
      },
      customized: {
        interval: '10m',
        from: 'now-1h',
        to: 'now',
      },
      upgrade: {
        interval: '15m',
        from: 'now-20m',
        to: 'now',
      },
    },
    {
      ruleType: 'query',
      fieldName: 'max_signals',
      humanizedFieldName: 'Max Signals',
      initial: 100,
      customized: 150,
      upgrade: 200,
    },
    {
      ruleType: 'query',
      fieldName: 'rule_schedule',
      humanizedFieldName: 'Rule Schedule',
      initial: { field_name: 'fieldA' },
      customized: { field_name: 'fieldB' },
      upgrade: { field_name: 'fieldC' },
    },
    {
      ruleType: 'query',
      fieldName: 'timestamp_override',
      humanizedFieldName: 'Timestamp override',
      initial: { field_name: 'fieldA', fallback_disabled: false },
      customized: { field_name: 'fieldB', fallback_disabled: false },
      upgrade: { field_name: 'fieldC', fallback_disabled: false },
    },
    {
      ruleType: 'query',
      fieldName: 'timeline_template',
      humanizedFieldName: 'Timeline template',
      initial: { timeline_id: 'A', timeline_title: 'timelineA' },
      customized: { timeline_id: 'B', timeline_title: 'timelineB' },
      upgrade: { timeline_id: 'C', timeline_title: 'timelineC' },
    },
    {
      ruleType: 'query',
      fieldName: 'building_block',
      humanizedFieldName: 'Building Block',
      initial: undefined,
      customized: { type: 'default' },
      upgrade: { type: 'default' },
    },
    {
      ruleType: 'query',
      fieldName: 'investigation_fields',
      humanizedFieldName: 'Custom highlighted fields',
      initial: { field_names: ['fieldA'] },
      customized: { field_names: ['fieldB'] },
      upgrade: { field_names: ['fieldC'] },
    },
    {
      ruleType: 'query',
      fieldName: 'data_source',
      humanizedFieldName: 'Data source',
      initial: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
      customized: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
      upgrade: { type: DataSourceType.index_patterns, index_patterns: ['indexC'] },
    },
    {
      ruleType: 'query',
      fieldName: 'data_source',
      humanizedFieldName: 'Data source',
      initial: { type: DataSourceType.data_view, data_view_id: 'data_view_A' },
      customized: { type: DataSourceType.data_view, data_view_id: 'data_view_B' },
      upgrade: { type: DataSourceType.data_view, data_view_id: 'data_view_C' },
    },
    {
      ruleType: 'query',
      fieldName: 'alert_suppression',
      humanizedFieldName: 'Alert suppression',
      initial: { group_by: ['fieldA'] },
      customized: { group_by: ['fieldB'] },
      upgrade: { group_by: ['fieldC'] },
    },
    {
      ruleType: 'query',
      fieldName: 'kql_query',
      humanizedFieldName: 'KQL query',
      initial: {
        query: '*:*',
        language: 'kuery',
        type: KqlQueryType.inline_query,
        filters: [],
      },
      customized: {
        query: 'process.name:*.sys',
        language: 'kuery',
        type: KqlQueryType.inline_query,
        filters: [],
      },
      upgrade: {
        query: 'process.name:*.exe',
        language: 'kuery',
        type: KqlQueryType.inline_query,
        filters: [],
      },
    },
    {
      ruleType: 'eql',
      fieldName: 'eql_query',
      humanizedFieldName: 'EQL query',
      initial: {
        query: 'any where true',
        language: 'eql',
        filters: [],
      },
      customized: {
        query: 'host where host.name == "something"',
        language: 'eql',
        filters: [],
      },
      upgrade: {
        query: 'process where process.name == "regsvr32.exe"',
        language: 'eql',
        filters: [],
      },
    },
    {
      ruleType: 'esql',
      fieldName: 'esql_query',
      humanizedFieldName: 'ESQL query',
      initial: {
        query: 'FROM indexA METADATA _id',
        language: 'esql',
      },
      customized: {
        query: 'FROM indexB METADATA _id',
        language: 'esql',
      },
      upgrade: {
        query: 'FROM indexA METADATA _id',
        language: 'esql',
      },
    },
    {
      ruleType: 'threat_match',
      fieldName: 'threat_index',
      humanizedFieldName: 'Indicator index patterns',
      initial: ['indexA'],
      customized: ['indexB'],
      upgrade: ['indexC'],
    },
    {
      ruleType: 'threat_match',
      fieldName: 'threat_query',
      humanizedFieldName: 'Indicator index query',
      initial: {
        type: KqlQueryType.inline_query,
        query: 'process.name:*.exe',
        language: 'kuery',
        filters: [],
      },
      customized: {
        type: KqlQueryType.inline_query,
        query: 'process.name:*.sys',
        language: 'kuery',
        filters: [],
      },
      upgrade: {
        type: KqlQueryType.inline_query,
        query: 'process.name:*.com',
        language: 'kuery',
        filters: [],
      },
    },
    {
      ruleType: 'threat_match',
      fieldName: 'threat_mapping',
      humanizedFieldName: 'Indicator mapping',
      initial: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
      customized: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
      upgrade: [{ entries: [{ type: 'mapping', field: 'fieldC', value: 'fieldZ' }] }],
    },
    {
      ruleType: 'threat_match',
      fieldName: 'threat_indicator_path',
      humanizedFieldName: 'Indicator prefix override',
      initial: 'fieldA',
      customized: 'fieldB',
      upgrade: 'fieldC',
    },
    {
      ruleType: 'threshold',
      fieldName: 'threshold',
      humanizedFieldName: 'Threshold',
      initial: { value: 10, field: 'fieldA' },
      customized: { value: 30, field: 'fieldB' },
      upgrade: { value: 40, field: 'fieldC' },
    },
    {
      ruleType: 'machine_learning',
      fieldName: 'machine_learning_job_id',
      humanizedFieldName: 'Machine Learning job',
      initial: ['jobA'],
      customized: ['jobB'],
      upgrade: ['jobC'],
    },
    {
      ruleType: 'machine_learning',
      fieldName: 'anomaly_threshold',
      humanizedFieldName: 'Anomaly score threshold',
      initial: 10,
      customized: 20,
      upgrade: 30,
    },
    {
      ruleType: 'new_terms',
      fieldName: 'new_terms_fields',
      humanizedFieldName: 'New Terms Fields',
      initial: ['fieldA'],
      customized: ['fieldB'],
      upgrade: ['fieldC'],
    },
    {
      ruleType: 'new_terms',
      fieldName: 'history_window_start',
      humanizedFieldName: 'History Window Size',
      initial: 'now-1h',
      customized: 'now-2h',
      upgrade: 'now-5h',
    },
  ])(
    '$fieldName ($ruleType rule)',
    ({ ruleType, fieldName, humanizedFieldName, initial, customized, upgrade }) => {
      it('previews non-customized field w/ an upgrade (AAB)', async () => {
        (reviewRuleUpgrade as jest.Mock).mockResolvedValue({
          stats: RULE_UPGRADE_PREVIEW_STATS_MOCK,
          rules: [
            {
              id: 'test-rule',
              rule_id: 'test-rule',
              current_rule: {
                rule_id: 'test-rule',
                type: ruleType,
                rule_source: {
                  type: 'external',
                  is_customized: false,
                },
              },
              target_rule: {
                rule_id: 'test-rule',
                type: ruleType,
              },
              diff: {
                num_fields_with_updates: 2, // tested field + version field
                num_fields_with_conflicts: 0,
                num_fields_with_non_solvable_conflicts: 0,
                fields: {
                  [fieldName]: {
                    base_version: initial,
                    current_version: initial,
                    target_version: upgrade,
                    merged_version: upgrade,
                    diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                    merge_outcome: ThreeWayMergeOutcome.Target,
                    has_base_version: true,
                    has_update: true,
                    conflict: ThreeWayDiffConflict.NONE,
                  },
                },
              },
              revision: 0,
            },
          ],
        });

        const { getByTestId } = render(<RulesPage />, {
          wrapper: TestRuleUpgradeProviders,
        });

        await openRuleUpgradeFlyout();

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expect(fieldUpgradeWrapper).toHaveTextContent(humanizedFieldName);
        expect(fieldUpgradeWrapper).toHaveTextContent('No conflicts');
        expect(within(fieldUpgradeWrapper).getByTitle('Ready for update')).toBeVisible();

        toggleFieldAccordion(fieldUpgradeWrapper);

        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });

      it('previews customized field w/o an upgrade (ABA)', async () => {
        (reviewRuleUpgrade as jest.Mock).mockResolvedValue({
          stats: RULE_UPGRADE_PREVIEW_STATS_MOCK,
          rules: [
            {
              id: 'test-rule',
              rule_id: 'test-rule',
              current_rule: {
                rule_id: 'test-rule',
                type: ruleType,
                rule_source: {
                  type: 'external',
                  is_customized: true,
                },
              },
              target_rule: {
                rule_id: 'test-rule',
                type: ruleType,
              },
              diff: {
                num_fields_with_updates: 1, // version field
                num_fields_with_conflicts: 0,
                num_fields_with_non_solvable_conflicts: 0,
                fields: {
                  [fieldName]: {
                    base_version: initial,
                    current_version: customized,
                    target_version: initial,
                    merged_version: customized,
                    diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
                    merge_outcome: ThreeWayMergeOutcome.Current,
                    has_base_version: true,
                    has_update: false,
                    conflict: ThreeWayDiffConflict.NONE,
                  },
                },
              },
              revision: 0,
            },
          ],
        });

        const { getByTestId } = render(<RulesPage />, {
          wrapper: TestRuleUpgradeProviders,
        });

        await openRuleUpgradeFlyout();

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expect(fieldUpgradeWrapper).toHaveTextContent(humanizedFieldName);
        expect(fieldUpgradeWrapper).toHaveTextContent('No update');
        expect(within(fieldUpgradeWrapper).getByTitle('Modified')).toBeVisible();

        toggleFieldAccordion(fieldUpgradeWrapper);

        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });

      it('previews customized field w/ the matching upgrade (ABB)', async () => {
        (reviewRuleUpgrade as jest.Mock).mockResolvedValue({
          stats: RULE_UPGRADE_PREVIEW_STATS_MOCK,
          rules: [
            {
              id: 'test-rule',
              rule_id: 'test-rule',
              current_rule: {
                rule_id: 'test-rule',
                type: ruleType,
                rule_source: {
                  type: 'external',
                  is_customized: true,
                },
              },
              target_rule: {
                rule_id: 'test-rule',
                type: ruleType,
              },
              diff: {
                num_fields_with_updates: 1, // version field
                num_fields_with_conflicts: 0,
                num_fields_with_non_solvable_conflicts: 0,
                fields: {
                  [fieldName]: {
                    base_version: initial,
                    current_version: upgrade,
                    target_version: upgrade,
                    merged_version: upgrade,
                    diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
                    merge_outcome: ThreeWayMergeOutcome.Current,
                    has_base_version: true,
                    has_update: false,
                    conflict: ThreeWayDiffConflict.NONE,
                  },
                },
              },
              revision: 0,
            },
          ],
        });

        const { getByTestId } = render(<RulesPage />, {
          wrapper: TestRuleUpgradeProviders,
        });

        await openRuleUpgradeFlyout();

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expect(fieldUpgradeWrapper).toHaveTextContent(humanizedFieldName);
        expect(fieldUpgradeWrapper).toHaveTextContent('Matching update');
        expect(within(fieldUpgradeWrapper).getByTitle('Modified')).toBeVisible();

        toggleFieldAccordion(fieldUpgradeWrapper);

        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });

      it('previews customized field w/ an upgrade resulting in a solvable conflict (ABC)', async () => {
        (reviewRuleUpgrade as jest.Mock).mockResolvedValue({
          stats: RULE_UPGRADE_PREVIEW_STATS_MOCK,
          rules: [
            {
              id: 'test-rule',
              rule_id: 'test-rule',
              current_rule: {
                rule_id: 'test-rule',
                type: ruleType,
                rule_source: {
                  type: 'external',
                  is_customized: true,
                },
              },
              target_rule: {
                rule_id: 'test-rule',
                type: ruleType,
              },
              diff: {
                num_fields_with_updates: 2, // tested field + version field
                num_fields_with_conflicts: 1,
                num_fields_with_non_solvable_conflicts: 0,
                fields: {
                  [fieldName]: {
                    base_version: initial,
                    current_version: customized,
                    target_version: upgrade,
                    merged_version: customized,
                    diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
                    merge_outcome: ThreeWayMergeOutcome.Merged,
                    has_base_version: true,
                    has_update: true,
                    conflict: ThreeWayDiffConflict.SOLVABLE,
                  },
                },
              },
              revision: 0,
            },
          ],
        });

        const { getByTestId } = render(<RulesPage />, {
          wrapper: TestRuleUpgradeProviders,
        });

        await openRuleUpgradeFlyout();

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expect(fieldUpgradeWrapper).toHaveTextContent(humanizedFieldName);
        expect(fieldUpgradeWrapper).toHaveTextContent('Solved conflict');
        expect(within(fieldUpgradeWrapper).getByTitle('Modified')).toBeVisible();
        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });

      it('previews customized field w/ an upgrade resulting in a non-solvable conflict (ABC)', async () => {
        (reviewRuleUpgrade as jest.Mock).mockResolvedValue({
          stats: RULE_UPGRADE_PREVIEW_STATS_MOCK,
          rules: [
            {
              id: 'test-rule',
              rule_id: 'test-rule',
              current_rule: {
                rule_id: 'test-rule',
                type: ruleType,
                rule_source: {
                  type: 'external',
                  is_customized: true,
                },
              },
              target_rule: {
                rule_id: 'test-rule',
                type: ruleType,
              },
              diff: {
                num_fields_with_updates: 2, // tested field + version field
                num_fields_with_conflicts: 1,
                num_fields_with_non_solvable_conflicts: 1,
                fields: {
                  [fieldName]: {
                    base_version: initial,
                    current_version: customized,
                    target_version: upgrade,
                    merged_version: customized,
                    diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
                    merge_outcome: ThreeWayMergeOutcome.Current,
                    has_base_version: true,
                    has_update: true,
                    conflict: ThreeWayDiffConflict.NON_SOLVABLE,
                  },
                },
              },
              revision: 0,
            },
          ],
        });

        const { getByTestId } = render(<RulesPage />, {
          wrapper: TestRuleUpgradeProviders,
        });

        await openRuleUpgradeFlyout();

        // Some fields have async validation.
        // We have to run pending timers to make sure validation runs without issues.
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expect(fieldUpgradeWrapper).toHaveTextContent(humanizedFieldName);
        expect(fieldUpgradeWrapper).toHaveTextContent('Action required');
        expect(within(fieldUpgradeWrapper).getByTitle('Modified')).toBeVisible();
        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });
    }
  );
});

async function openRuleUpgradeFlyout(): Promise<void> {
  await act(async () => {
    fireEvent.click(await screen.findByTestId('ruleName'));
  });
}

function toggleFieldAccordion(fieldWrapper: HTMLElement): void {
  act(() => {
    const accordionButton = within(fieldWrapper).getAllByRole('button')[0];

    fireEvent.click(accordionButton);
  });
}
