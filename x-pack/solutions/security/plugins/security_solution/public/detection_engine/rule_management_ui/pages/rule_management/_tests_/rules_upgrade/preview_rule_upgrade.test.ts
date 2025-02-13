/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, within } from '@testing-library/react';
import {
  DataSourceType,
  KqlQueryType,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../common/api/detection_engine';
import { mockRuleUpgradeReviewData, renderRuleUpgradeFlyout } from './mock/rule_upgrade_flyout';
import { toggleFieldAccordion } from './mock/rule_upgrade_helpers';

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
        mockRuleUpgradeReviewData({
          ruleType,
          fieldName,
          fieldVersions: {
            base: initial,
            current: initial,
            target: upgrade,
            merged: upgrade,
          },
          diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          conflict: ThreeWayDiffConflict.NONE,
        });

        const { getByTestId } = await renderRuleUpgradeFlyout();

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expectFieldUpgradeState(fieldUpgradeWrapper, {
          humanizedFieldName,
          upgradeStateSummary: 'No conflicts',
          upgradeStateBadge: 'Ready for update',
          isModified: false,
        });

        toggleFieldAccordion(fieldUpgradeWrapper);

        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });

      it('previews customized field w/o an upgrade (ABA)', async () => {
        mockRuleUpgradeReviewData({
          ruleType,
          fieldName,
          fieldVersions: {
            base: initial,
            current: customized,
            target: upgrade,
            merged: customized,
          },
          diffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          conflict: ThreeWayDiffConflict.NONE,
        });

        const { getByTestId } = await renderRuleUpgradeFlyout();

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expectFieldUpgradeState(fieldUpgradeWrapper, {
          humanizedFieldName,
          upgradeStateSummary: 'No update',
          isModified: true,
        });

        toggleFieldAccordion(fieldUpgradeWrapper);

        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });

      it('previews customized field w/ the matching upgrade (ABB)', async () => {
        mockRuleUpgradeReviewData({
          ruleType,
          fieldName,
          fieldVersions: {
            base: initial,
            current: upgrade,
            target: upgrade,
            merged: upgrade,
          },
          diffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          conflict: ThreeWayDiffConflict.NONE,
        });

        const { getByTestId } = await renderRuleUpgradeFlyout();

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expectFieldUpgradeState(fieldUpgradeWrapper, {
          humanizedFieldName,
          upgradeStateSummary: 'Matching update',
          isModified: true,
        });

        toggleFieldAccordion(fieldUpgradeWrapper);

        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });

      it('previews customized field w/ an upgrade resulting in a solvable conflict (ABC)', async () => {
        mockRuleUpgradeReviewData({
          ruleType,
          fieldName,
          fieldVersions: {
            base: initial,
            current: customized,
            target: upgrade,
            merged: customized,
          },
          diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.SOLVABLE,
        });

        const { getByTestId } = await renderRuleUpgradeFlyout();

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expectFieldUpgradeState(fieldUpgradeWrapper, {
          humanizedFieldName,
          upgradeStateSummary: 'Solved conflict',
          upgradeStateBadge: 'Review required',
          isModified: true,
        });

        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });

      it('previews customized field w/ an upgrade resulting in a non-solvable conflict (ABC)', async () => {
        mockRuleUpgradeReviewData({
          ruleType,
          fieldName,
          fieldVersions: {
            base: initial,
            current: customized,
            target: upgrade,
            merged: customized,
          },
          diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
        });

        const { getByTestId } = await renderRuleUpgradeFlyout();

        // Some fields have async validation.
        // We have to run pending timers to avoid flakiness and make sure
        // validation runs without issues.
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });

        const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

        expectFieldUpgradeState(fieldUpgradeWrapper, {
          humanizedFieldName,
          upgradeStateSummary: 'Unsolved conflict',
          upgradeStateBadge: 'Action required',
          isModified: true,
        });

        expect(
          within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)
        ).toBeVisible();
        expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
      });
    }
  );
});

interface ExpectFieldUpgradeStateParams {
  /**
   * Human readable name shown in UI
   */
  humanizedFieldName: string;
  /**
   * Field upgrade state summary text like "No conflict" or "Solvable conflict"
   */
  upgradeStateSummary: string;
  /**
   * Field upgrade state badge text like "Ready to Update" and "Review required"
   */
  upgradeStateBadge?: string;
  /**
   * Whether field's "Modified" badge is shown
   */
  isModified: boolean;
}

function expectFieldUpgradeState(
  wrapper: HTMLElement,
  params: ExpectFieldUpgradeStateParams
): void {
  expect(wrapper).toHaveTextContent(params.humanizedFieldName);
  expect(wrapper).toHaveTextContent(params.upgradeStateSummary);

  if (params.upgradeStateBadge) {
    expect(within(wrapper).getByTitle(params.upgradeStateBadge)).toBeVisible();
  }

  if (params.isModified) {
    expect(within(wrapper).getByTitle('Modified')).toBeVisible();
  } else {
    expect(within(wrapper).queryByTitle('Modified')).not.toBeInTheDocument();
  }
}
