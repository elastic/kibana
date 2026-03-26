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
import { saveFieldValue, switchToFieldEdit, toggleFieldAccordion } from './rule_upgrade_helpers';
import { mockRuleUpgradeReviewData, renderRuleUpgradeFlyout } from './rule_upgrade_flyout';

interface AssertDiffAfterSavingUnchangedValueParams {
  ruleType: string;
  fieldName: string;
  fieldVersions: {
    initial: unknown;
    upgrade: unknown;
  };
}

export function assertDiffAfterSavingUnchangedValue({
  ruleType,
  fieldName: rawFieldName,
  fieldVersions: { initial, upgrade },
}: AssertDiffAfterSavingUnchangedValueParams) {
  // TS isn't able to infer the type of the field name for inputFieldValue()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldName = rawFieldName as any;

  describe('diff view', () => {
    it('shows the same diff after saving unchanged field value', async () => {
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
      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(
        `${fieldName}-comparisonSide`
      );

      toggleFieldAccordion(fieldUpgradeWrapper);

      // We have to track subfield diff views
      const diffViewContents = getDiffViews(diffViewSection).map((el) => el.textContent as string);

      switchToFieldEdit(fieldUpgradeWrapper);
      await saveFieldValue(fieldUpgradeWrapper);

      const diffViews = getDiffViews(diffViewSection);

      expect(diffViews.length).toBe(diffViewContents.length);

      for (let i = 0; i < diffViews.length; ++i) {
        // It's been observed a number of whitespaces may change
        expect(removeWhitespaces(diffViews[i].textContent as string)).toBe(
          removeWhitespaces(diffViewContents[i])
        );
      }
    });
  });
}

function getDiffViews(container: HTMLElement): HTMLElement[] {
  return within(container).getAllByTestId('prebuilt-rule-upgrade-diff-view');
}

function removeWhitespaces(str: string): string {
  return str.replace(/\s/g, '');
}
