/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { render, act, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { RulesPage } from '../../..';
import {
  GET_PREBUILT_RULES_STATUS_URL,
  REVIEW_RULE_UPGRADE_URL,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine';
import { TestProviders } from '../../../../../../../common/mock';
import { RouterSpyStateContext } from '../../../../../../../common/utils/route/helpers';
import { AllRulesTabs } from '../../../../../components/rules_table/rules_table_toolbar';
import { KibanaServices } from '../../../../../../../common/lib/kibana';

/** **********************************************/
// Mocks necessary to render Rule Upgrade Flyout

// Enable Prebuilt Rules Customization feature
jest.mock('../../../../../../../../common/experimental_features', () => {
  const actual = jest.requireActual('../../../../../../../../common/experimental_features');

  return {
    ...actual,
    allowedExperimentalValues: {
      ...actual.allowedExperimentalValues,
      prebuiltRulesCustomizationEnabled: true,
    },
  };
});
jest.mock('../../../../../../../detections/components/user_info');
jest.mock('../../../../../../../detections/containers/detection_engine/lists/use_lists_config');
/** **********************************************/

/**
 * Stores KibanaServices.get().http.fetch() mocked responses.
 */
const mockedResponses = new Map<string, unknown>();

export async function renderRuleUpgradeFlyout(): Promise<ReturnType<typeof render>> {
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
    wrapper: TestRuleUpgradeProviders,
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
 * Mocks KibanaServices.get().http.fetch() responses. Works in combination with renderRuleUpgradeFlyout.
 */
function mockKibanaFetchResponse(path: string, mockResponse: unknown): void {
  mockedResponses.set(path, mockResponse);
}

function TestRuleUpgradeProviders({ children }: PropsWithChildren<{}>): JSX.Element {
  return (
    <KibanaErrorBoundaryProvider analytics={undefined}>
      <RouterSpyStateContext.Provider
        value={[
          {
            pageName: SecurityPageName.rules,
            detailName: undefined,
            tabName: AllRulesTabs.updates,
            search: '',
            pathName: '/',
            state: undefined,
          },
          jest.fn(),
        ]}
      >
        <MemoryRouter>
          <TestProviders>{children}</TestProviders>
        </MemoryRouter>
      </RouterSpyStateContext.Provider>
    </KibanaErrorBoundaryProvider>
  );
}

async function openRuleUpgradeFlyout(): Promise<void> {
  await act(async () => {
    fireEvent.click(await screen.findByTestId('ruleName'));
  });
}
