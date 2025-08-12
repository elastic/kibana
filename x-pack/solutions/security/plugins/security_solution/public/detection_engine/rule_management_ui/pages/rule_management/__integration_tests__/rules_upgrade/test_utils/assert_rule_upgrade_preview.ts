/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { within } from '@testing-library/react';
import {
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../../common/api/detection_engine';
import { toggleFieldAccordion } from './rule_upgrade_helpers';
import { mockRuleUpgradeReviewData, renderRuleUpgradeFlyout } from './rule_upgrade_flyout';

interface AssertRuleUpgradePreviewParams {
  ruleType: string;
  fieldName: string;
  humanizedFieldName: string;
  fieldVersions: {
    initial: unknown;
    customized: unknown;
    upgrade: unknown;
    resolvedValue: unknown;
  };
}

export function assertRuleUpgradePreview({
  ruleType,
  fieldName,
  humanizedFieldName,
  fieldVersions: { initial, customized, upgrade },
}: AssertRuleUpgradePreviewParams) {
  describe('preview rule upgrade', () => {
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

      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)).toBeVisible();
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

      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)).toBeVisible();
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

      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)).toBeVisible();
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
        upgradeStateSummary: 'Auto-resolved conflict',
        upgradeStateBadge: 'Review required',
        isModified: true,
      });

      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)).toBeVisible();
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

      const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

      expectFieldUpgradeState(fieldUpgradeWrapper, {
        humanizedFieldName,
        upgradeStateSummary: 'Unresolved conflict',
        upgradeStateBadge: 'Action required',
        isModified: true,
      });

      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)).toBeVisible();
      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
    });

    it('missing base - previews customized field w/ an upgrade and no conflict (-AB)', async () => {
      mockRuleUpgradeReviewData({
        ruleType,
        fieldName,
        fieldVersions: {
          current: customized,
          target: upgrade,
          merged: customized,
        },
        diffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

      expectFieldUpgradeState(fieldUpgradeWrapper, {
        humanizedFieldName,
        upgradeStateSummary: 'No conflict',
        upgradeStateBadge: 'Ready for update',
        isModified: false,
      });

      toggleFieldAccordion(fieldUpgradeWrapper);

      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)).toBeVisible();
      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
    });

    it('missing base - previews customized field w/ an upgrade resulting in a solvable conflict (-AB)', async () => {
      mockRuleUpgradeReviewData({
        ruleType,
        fieldName,
        fieldVersions: {
          current: customized,
          target: upgrade,
          merged: customized,
        },
        diffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`${fieldName}-upgradeWrapper`);

      expectFieldUpgradeState(fieldUpgradeWrapper, {
        humanizedFieldName,
        upgradeStateSummary: 'Auto-resolved conflict',
        upgradeStateBadge: 'Review required',
        isModified: false,
      });

      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-comparisonSide`)).toBeVisible();
      expect(within(fieldUpgradeWrapper).getByTestId(`${fieldName}-finalSide`)).toBeVisible();
    });
  });
}

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
