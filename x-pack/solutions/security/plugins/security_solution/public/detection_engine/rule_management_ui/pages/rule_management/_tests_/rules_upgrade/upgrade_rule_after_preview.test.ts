/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, within, waitFor } from '@testing-library/react';
import {
  DataSourceType,
  PERFORM_RULE_UPGRADE_URL,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../common/api/detection_engine';
import { KibanaServices } from '../../../../../../common/lib/kibana';
import {
  mockAvailableDataViews,
  mockRelatedIntegrations,
  mockRuleUpgradeReviewData,
  mockTimelines,
  renderRuleUpgradeFlyout,
} from './mock/rule_upgrade_flyout';
import {
  acceptSuggestedFieldValue,
  saveFieldValue,
  saveAndAcceptFieldValue,
  switchToFieldEdit,
  toggleFieldAccordion,
} from './mock/rule_upgrade_helpers';
import { inputFieldValue } from './mock/set_field_value';
import { isUndefined, omitBy } from 'lodash';

jest.setTimeout(20000);

describe('Upgrade rule after preview', () => {
  beforeAll(() => {
    mockAvailableDataViews(
      [
        {
          id: 'resolved',
          title: 'resolved',
        },
        {
          id: 'data_view_B',
          title: 'Data View B',
        },
        {
          id: 'data_view_C',
          title: 'Data View C',
        },
      ],
      {
        resolvedNumber: {
          name: 'resolvedNumberField',
          type: 'number',
          searchable: true,
          aggregatable: true,
        },
        resolvedString: {
          name: 'resolvedStringField',
          type: 'string',
          searchable: true,
          aggregatable: true,
        },
        resolvedDate: {
          name: 'resolvedDateField',
          type: 'date',
          searchable: true,
          aggregatable: true,
        },
      }
    );
    mockRelatedIntegrations([
      {
        package: 'packageResolved',
        version: '5.0.0',
      },
    ]);
    mockTimelines([
      {
        id: 'resolved',
        title: 'timelineResolved',
      },
    ]);
  });

  describe.each([
    {
      ruleType: 'query',
      fieldName: 'name',
      initial: 'Initial name',
      customized: 'Custom name',
      upgrade: 'Updated name',
      resolvedValue: 'Resolved name',
    },
    {
      ruleType: 'query',
      fieldName: 'description',
      humanizedFieldName: 'Description',
      initial: 'Initial description',
      customized: 'Custom description',
      upgrade: 'Updated description',
      resolvedValue: 'Resolved description',
    },
    {
      ruleType: 'query',
      fieldName: 'severity',
      humanizedFieldName: 'Severity',
      initial: 'low',
      customized: 'medium',
      upgrade: 'high',
      resolvedValue: 'critical',
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
      resolvedValue: [
        {
          field: 'resolvedStringField',
          value: '70',
          operator: 'equals',
          severity: 'critical',
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
      resolvedValue: 50,
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
      resolvedValue: [
        {
          field: 'resolvedNumberField',
          operator: 'equals',
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
      resolvedValue: ['http://resolved'],
    },
    {
      ruleType: 'query',
      fieldName: 'false_positives',
      humanizedFieldName: 'False Positives',
      initial: ['exampleA'],
      customized: ['exampleB'],
      upgrade: ['exampleC'],
      resolvedValue: ['resolved'],
    },
    {
      ruleType: 'query',
      fieldName: 'threat',
      humanizedFieldName: 'MITRE ATT&CK\u2122',
      initial: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            name: 'tacticA',
            id: 'tacticA',
            reference: 'reference',
          },
        },
      ],
      customized: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            name: 'tacticB',
            id: 'tacticB',
            reference: 'reference',
          },
        },
      ],
      upgrade: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            name: 'tacticC',
            id: 'tacticC',
            reference: 'reference',
          },
        },
      ],
      resolvedValue: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            name: 'Credential Access',
            id: 'TA0006',
            reference: 'https://attack.mitre.org/tactics/TA0006/',
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
      resolvedValue: 'resolved investigation guide',
    },
    {
      ruleType: 'query',
      fieldName: 'setup',
      humanizedFieldName: 'Setup',
      initial: 'Initial setup',
      customized: 'Custom setup',
      upgrade: 'Updated setup',
      resolvedValue: 'resolved setup',
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
      resolvedValue: [
        {
          package: 'packageResolved',
          version: '^9.0.0',
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
      resolvedValue: [
        {
          name: 'resolvedStringField',
          type: 'string',
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
      resolvedValue: {
        interval: '1h',
        from: 'now-2h',
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
      resolvedValue: 300,
    },
    {
      ruleType: 'query',
      fieldName: 'rule_name_override',
      humanizedFieldName: 'Rule name override',
      initial: { field_name: 'fieldA' },
      customized: { field_name: 'fieldB' },
      upgrade: { field_name: 'fieldC' },
      resolvedValue: { field_name: 'resolvedStringField' },
    },
    {
      ruleType: 'query',
      fieldName: 'timestamp_override',
      humanizedFieldName: 'Timestamp override',
      initial: { field_name: 'fieldA', fallback_disabled: false },
      customized: { field_name: 'fieldB', fallback_disabled: false },
      upgrade: { field_name: 'fieldC', fallback_disabled: false },
      resolvedValue: { field_name: 'resolvedDateField', fallback_disabled: false },
    },
    {
      ruleType: 'query',
      fieldName: 'timeline_template',
      humanizedFieldName: 'Timeline template',
      initial: { timeline_id: 'A', timeline_title: 'timelineA' },
      customized: { timeline_id: 'B', timeline_title: 'timelineB' },
      upgrade: { timeline_id: 'C', timeline_title: 'timelineC' },
      resolvedValue: { timeline_id: 'resolved', timeline_title: 'timelineResolved' },
    },
    {
      ruleType: 'query',
      fieldName: 'building_block',
      humanizedFieldName: 'Building Block',
      initial: undefined,
      customized: { type: 'default' },
      upgrade: { type: 'default' },
      resolvedValue: undefined,
    },
    {
      ruleType: 'query',
      fieldName: 'investigation_fields',
      humanizedFieldName: 'Custom highlighted fields',
      initial: { field_names: ['fieldA'] },
      customized: { field_names: ['fieldB'] },
      upgrade: { field_names: ['fieldC'] },
      resolvedValue: { field_names: ['resolvedStringField'] },
    },
    {
      ruleType: 'query',
      fieldName: 'data_source',
      humanizedFieldName: 'Data source',
      initial: { type: DataSourceType.index_patterns, index_patterns: ['indexA'] },
      customized: { type: DataSourceType.index_patterns, index_patterns: ['indexB'] },
      upgrade: { type: DataSourceType.index_patterns, index_patterns: ['indexC'] },
      resolvedValue: { type: DataSourceType.index_patterns, index_patterns: ['resolved'] },
    },
    {
      ruleType: 'query',
      fieldName: 'data_source',
      humanizedFieldName: 'Data source',
      initial: { type: DataSourceType.data_view, data_view_id: 'data_view_A' },
      customized: { type: DataSourceType.data_view, data_view_id: 'data_view_B' },
      upgrade: { type: DataSourceType.data_view, data_view_id: 'data_view_C' },
      resolvedValue: { type: DataSourceType.data_view, data_view_id: 'resolved' },
    },
    {
      ruleType: 'query',
      fieldName: 'alert_suppression',
      humanizedFieldName: 'Alert suppression',
      initial: { group_by: ['fieldA'] },
      customized: { group_by: ['fieldB'] },
      upgrade: { group_by: ['fieldC'] },
      resolvedValue: { group_by: ['resolved'] },
    },
  ] as const)(
    '$fieldName ($ruleType rule)',
    ({ ruleType, fieldName, initial, customized, upgrade, resolvedValue: rawResolvedValue }) => {
      // It's much more convenient to have uncasted `resolvedValue` since
      // TS isn't able to correspond test data and exected by `inputFieldValue()` values.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resolvedValue = rawResolvedValue as any;

      describe('non-customized field w/ an upgrade (AAB)', () => {
        it('upgrades rule to merged value', async () => {
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

          const { getByRole } = await renderRuleUpgradeFlyout();

          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeToMergedValue();
        });

        it('upgrades rule to resolved value', async () => {
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

          const { getByRole, getByTestId } = await renderRuleUpgradeFlyout();

          const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

          toggleFieldAccordion(fieldUpgradeWrapper);
          switchToFieldEdit(fieldUpgradeWrapper);
          await inputFieldValue(fieldUpgradeWrapper, { fieldName, value: resolvedValue });
          await saveFieldValue(fieldUpgradeWrapper);

          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeWithResolvedFieldValue(fieldName, resolvedValue);
        });
      });

      describe('customized field w/o an upgrade (ABA)', () => {
        it('upgrades rule to merged value', async () => {
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

          const { getByRole } = await renderRuleUpgradeFlyout();

          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeToMergedValue();
        });

        it('upgrades rule to resolved value', async () => {
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

          const { getByRole, getByTestId } = await renderRuleUpgradeFlyout();

          const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

          toggleFieldAccordion(fieldUpgradeWrapper);
          switchToFieldEdit(fieldUpgradeWrapper);
          await inputFieldValue(fieldUpgradeWrapper, {
            fieldName,
            value: resolvedValue,
          });
          await saveFieldValue(fieldUpgradeWrapper);

          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeWithResolvedFieldValue(fieldName, resolvedValue);
        });
      });

      describe('customized field w/ the matching upgrade (ABB)', () => {
        it('upgrades rule to merged value', async () => {
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

          const { getByRole } = await renderRuleUpgradeFlyout();

          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeToMergedValue();
        });

        it('upgrades rule to resolved value', async () => {
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

          const { getByRole, getByTestId } = await renderRuleUpgradeFlyout();

          const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

          toggleFieldAccordion(fieldUpgradeWrapper);
          switchToFieldEdit(fieldUpgradeWrapper);
          await inputFieldValue(fieldUpgradeWrapper, { fieldName, value: resolvedValue });
          await saveFieldValue(fieldUpgradeWrapper);

          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeWithResolvedFieldValue(fieldName, resolvedValue);
        });
      });

      describe('customized field w/ an upgrade resulting in a solvable conflict (ABC)', () => {
        it('upgrades rule to suggested value', async () => {
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

          const { getByRole, getByTestId } = await renderRuleUpgradeFlyout();

          const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

          await acceptSuggestedFieldValue(fieldUpgradeWrapper);
          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeWithResolvedFieldValue(fieldName, customized);
        });

        it('upgrades rule to resolved value', async () => {
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

          const { getByRole, getByTestId } = await renderRuleUpgradeFlyout();

          const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

          switchToFieldEdit(fieldUpgradeWrapper);
          await inputFieldValue(fieldUpgradeWrapper, { fieldName, value: resolvedValue });
          await saveAndAcceptFieldValue(fieldUpgradeWrapper);

          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeWithResolvedFieldValue(fieldName, resolvedValue);
        });
      });

      describe('customized field w/ an upgrade resulting in a non-solvable conflict (ABC)', () => {
        it('upgrades rule to suggested value', async () => {
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

          const { getByRole, getByTestId } = await renderRuleUpgradeFlyout();

          const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

          await saveAndAcceptFieldValue(fieldUpgradeWrapper);
          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeWithResolvedFieldValue(fieldName, customized);
        });

        it('upgrades rule to resolved value', async () => {
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

          const { getByRole, getByTestId } = await renderRuleUpgradeFlyout();

          const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

          await inputFieldValue(fieldUpgradeWrapper, { fieldName, value: resolvedValue });
          await saveAndAcceptFieldValue(fieldUpgradeWrapper);

          await clickUpgradeRuleButton(getByRole('dialog'));

          expectRuleUpgradeWithResolvedFieldValue(fieldName, resolvedValue);
        });
      });
    }
  );
});

async function clickUpgradeRuleButton(wrapper: HTMLElement): Promise<void> {
  const upgradeRuleButton = within(wrapper).getByRole('button', {
    name: 'Update',
  });

  expect(upgradeRuleButton).toBeVisible();

  await waitFor(() => expect(upgradeRuleButton).toBeEnabled(), {
    timeout: 500,
  });

  await act(async () => {
    fireEvent.click(upgradeRuleButton);
  });
}

function expectRuleUpgradeToMergedValue(): void {
  const body = extractSingleKibanaFetchBodyBy({
    path: PERFORM_RULE_UPGRADE_URL,
    method: 'POST',
  });

  expect(body).toMatchObject({
    mode: 'SPECIFIC_RULES',
    rules: [{ rule_id: 'test-rule', revision: 1, fields: {} }],
    pick_version: 'MERGED',
  });
}

function expectRuleUpgradeWithResolvedFieldValue(fieldName: string, value: unknown): void {
  const body = extractSingleKibanaFetchBodyBy({
    path: PERFORM_RULE_UPGRADE_URL,
    method: 'POST',
  });

  expect(body).toMatchObject({
    mode: 'SPECIFIC_RULES',
    rules: [
      {
        rule_id: 'test-rule',
        revision: 1,
        fields: {
          [fieldName]: omitBy({ pick_version: 'RESOLVED', resolved_value: value }, isUndefined),
        },
      },
    ],
    pick_version: 'MERGED',
  });
}

interface ExtractKibanaFetchRequestByParams {
  path: string;
  method: string;
}

function extractSingleKibanaFetchBodyBy({
  path,
  method,
}: ExtractKibanaFetchRequestByParams): Record<string, unknown> {
  const kibanaFetchMock = KibanaServices.get().http.fetch as jest.Mock;
  const ruleUpgradeRequests = kibanaFetchMock.mock.calls.filter(
    ([_path, _options]) => _path === path && _options.method === method
  );

  expect(ruleUpgradeRequests).toHaveLength(1);

  try {
    return JSON.parse(ruleUpgradeRequests[0][1].body);
  } catch {
    throw new Error('Unable to parse Kibana fetch body');
  }
}
