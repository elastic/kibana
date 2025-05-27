/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, fireEvent, screen } from '@testing-library/react';
import type {
  DataViewField,
  DataViewFieldMap,
  DataViewSpec,
  FieldSpec,
} from '@kbn/data-views-plugin/common';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { TIMELINES_URL } from '../../../../../../../../common/constants';
import { RulesPage } from '../../..';
import type { RelatedIntegration } from '../../../../../../../../common/api/detection_engine';
import {
  GET_ALL_INTEGRATIONS_URL,
  GET_PREBUILT_RULES_STATUS_URL,
  REVIEW_RULE_UPGRADE_URL,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine';
import { KibanaServices } from '../../../../../../../common/lib/kibana';
import { RuleUpgradeTestProviders } from './rule_upgrade_test_providers';

/** **********************************************/
// Mocks necessary to render Rule Upgrade Flyout
jest.mock('../../../../../../../detections/components/user_info');
jest.mock('../../../../../../../detections/containers/detection_engine/lists/use_lists_config');
/** **********************************************/

/**
 * Stores KibanaServices.get().http.fetch() mocked responses.
 */
const mockedResponses = new Map<string, unknown>();

export async function renderRuleUpgradeFlyout(): Promise<ReturnType<typeof render>> {
  // KibanaServices.get().http.fetch persists globally
  // it's important to clear the state for the later assertions
  (KibanaServices.get().http.fetch as jest.Mock).mockClear();
  (KibanaServices.get().http.fetch as jest.Mock).mockImplementation((requestedPath) =>
    mockedResponses.get(requestedPath)
  );

  mockKibanaFetchResponse(GET_PREBUILT_RULES_STATUS_URL, {
    stats: {
      num_prebuilt_rules_installed: 1,
      num_prebuilt_rules_to_install: 0,
      num_prebuilt_rules_to_upgrade: 1,
      num_prebuilt_rules_total_in_package: 1,
    },
  });

  const renderResult = render(<RulesPage />, {
    wrapper: RuleUpgradeTestProviders,
  });

  await openRuleUpgradeFlyout();

  return renderResult;
}

interface MockRuleUpgradeReviewDataParams {
  ruleType: string;
  fieldName: string;
  fieldVersions: {
    base?: unknown;
    current: unknown;
    target: unknown;
    merged: unknown;
  };
  diffOutcome: ThreeWayDiffOutcome;
  conflict: ThreeWayDiffConflict;
}

export function mockRuleUpgradeReviewData({
  ruleType,
  fieldName,
  fieldVersions,
  diffOutcome,
  conflict,
}: MockRuleUpgradeReviewDataParams): void {
  mockKibanaFetchResponse(REVIEW_RULE_UPGRADE_URL, {
    stats: {
      num_rules_to_upgrade_total: 1,
      num_rules_with_conflicts:
        conflict === ThreeWayDiffConflict.SOLVABLE || conflict === ThreeWayDiffConflict.NON_SOLVABLE
          ? 1
          : 0,
      num_rules_with_non_solvable_conflicts: conflict === ThreeWayDiffConflict.NON_SOLVABLE ? 1 : 0,
      tags: [],
    },
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
              base_version: fieldVersions.base,
              current_version: fieldVersions.current,
              target_version: fieldVersions.target,
              merged_version: fieldVersions.merged,
              diff_outcome: diffOutcome,
              merge_outcome: ThreeWayMergeOutcome.Current,
              has_base_version: Boolean(fieldVersions.base),
              has_update:
                diffOutcome === ThreeWayDiffOutcome.CustomizedValueCanUpdate ||
                diffOutcome === ThreeWayDiffOutcome.StockValueCanUpdate ||
                diffOutcome === ThreeWayDiffOutcome.MissingBaseCanUpdate,
              conflict,
            },
          },
        },
        revision: 1,
      },
    ],
  });
}

/**
 *
 * @param dataViews Mocked data views
 * @param stickyFields Fields added to all data views obtained via `dataViews.create()` or `dataViews.get()`
 */
export function mockAvailableDataViews(
  dataViews: DataViewSpec[],
  stickyFields: DataViewFieldMap
): void {
  (KibanaServices.get().data.dataViews.getIdsWithTitle as jest.Mock).mockResolvedValue(
    dataViews.map(({ id, title }) => ({ id, title }))
  );

  (KibanaServices.get().data.dataViews.create as jest.Mock).mockImplementation((dataViewSpec) =>
    createMockDataView({
      ...dataViewSpec,
      fields: { ...(dataViewSpec.fields ?? {}), ...stickyFields },
    })
  );
  (KibanaServices.get().data.dataViews.get as jest.Mock).mockImplementation((id: string) => {
    const dataView = dataViews.find((dv) => dv.id === id);

    invariant(
      dataView,
      `It's expected to have data view ${id} mock passed to mockAvailableDataViews() but it was not found`
    );

    return createMockDataView({
      ...dataView,
      fields: { ...(dataView.fields ?? {}), ...stickyFields },
    });
  });
}

export function mockRelatedIntegrations(relatedIntegrations: RelatedIntegration[]): void {
  mockKibanaFetchResponse(GET_ALL_INTEGRATIONS_URL, {
    integrations: relatedIntegrations.map((ri) => ({
      package_name: ri.package,
      package_title: ri.package,
      is_installed: true,
      is_enabled: true,
      latest_package_version: ri.version,
      installed_package_version: ri.version,
      integration_name: ri.integration,
      integration_title: ri.integration,
    })),
  });
}

export function mockTimelines(timelines: Array<{ id: string; title: string }>): void {
  mockKibanaFetchResponse(TIMELINES_URL, {
    timeline: timelines.map((t, index) => ({
      templateTimelineId: t.id,
      title: t.title,
      savedObjectId: `so-id-${index}`,
      version: '1',
    })),
    totalCount: timelines.length,
  });
}

/**
 * Mocks KibanaServices.get().http.fetch() responses. Works in combination with renderRuleUpgradeFlyout.
 */
export function mockKibanaFetchResponse(path: string, mockResponse: unknown): void {
  mockedResponses.set(path, mockResponse);
}

async function openRuleUpgradeFlyout(): Promise<void> {
  await act(async () => {
    fireEvent.click(await screen.findByTestId('ruleName'));
  });
}

const createMockDataView = ({ id, title, fields }: DataViewSpec) =>
  Promise.resolve({
    id,
    title,
    fields: Object.values(fields ?? {}).map(createFieldDefinition),
    getIndexPattern: jest.fn().mockReturnValue(title),
    toSpec: jest.fn().mockReturnValue({
      id,
      title,
      fields: Object.values(fields ?? {}).map(createFieldDefinition),
    }),
  });

function createFieldDefinition(fieldSpec: FieldSpec): Partial<DataViewField> {
  return {
    ...fieldSpec,
    spec: {
      ...fieldSpec,
    },
  };
}

interface ExtractKibanaFetchRequestByParams {
  path: string;
  method: string;
}

export function extractSingleKibanaFetchBodyBy({
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
