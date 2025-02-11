/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, fireEvent, within, screen } from '@testing-library/react';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '../../../../../../../../common/api/detection_engine';
import type {
  RuleUpgradeStatsForReview,
  ThreeWayDiffConflict,
} from '../../../../../../../../common/api/detection_engine';
import { reviewRuleUpgrade } from '../../../../../../rule_management/api/api';
import { RulesPage } from '../../..';
import { TestRuleUpgradeProviders } from './test_rule_upgrade_provides';

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
jest.mock('../../../../../../rule_management/api/api', () => ({
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

export async function renderRuleUpgradeFlyout(): Promise<ReturnType<typeof render>> {
  const renderResult = render(<RulesPage />, {
    wrapper: TestRuleUpgradeProviders,
  });

  await openRuleUpgradeFlyout();

  return renderResult;
}

export function toggleFieldAccordion(fieldWrapper: HTMLElement): void {
  act(() => {
    const accordionButton = within(fieldWrapper).getAllByRole('button')[0];

    fireEvent.click(accordionButton);
  });
}

async function openRuleUpgradeFlyout(): Promise<void> {
  await act(async () => {
    fireEvent.click(await screen.findByTestId('ruleName'));
  });
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

const RULE_UPGRADE_PREVIEW_STATS_MOCK: RuleUpgradeStatsForReview = {
  num_rules_to_upgrade_total: 1,
  num_rules_with_conflicts: 0,
  num_rules_with_non_solvable_conflicts: 0,
  tags: [],
};

export function mockRuleUpgradeReviewData({
  ruleType,
  fieldName,
  fieldVersions,
  diffOutcome,
  conflict,
}: MockRuleUpgradeReviewDataParams): void {
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
        revision: 0,
      },
    ],
  });
}
