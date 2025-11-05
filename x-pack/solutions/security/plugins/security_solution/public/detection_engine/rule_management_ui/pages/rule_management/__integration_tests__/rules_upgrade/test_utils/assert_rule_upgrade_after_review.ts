/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, within, waitFor } from '@testing-library/react';
import { isUndefined, omitBy } from 'lodash';
import {
  PERFORM_RULE_UPGRADE_URL,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../../common/api/detection_engine';
import {
  acceptSuggestedFieldValue,
  saveFieldValue,
  saveAndAcceptFieldValue,
  switchToFieldEdit,
  toggleFieldAccordion,
} from './rule_upgrade_helpers';
import { inputFieldValue } from './set_field_value';
import {
  extractSingleKibanaFetchBodyBy,
  mockRuleUpgradeReviewData,
  renderRuleUpgradeFlyout,
} from './rule_upgrade_flyout';

interface AssertRuleUpgradeAfterReviewParams {
  ruleType: string;
  fieldName: string;
  fieldVersions: {
    initial: unknown;
    customized: unknown;
    upgrade: unknown;
    resolvedValue: unknown;
  };
}

export function assertRuleUpgradeAfterReview({
  ruleType,
  fieldName: rawFieldName,
  fieldVersions: { initial, customized, upgrade, resolvedValue: rawResolvedValue },
}: AssertRuleUpgradeAfterReviewParams) {
  // TS isn't able to infer the type of the field name for inputFieldValue()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedValue = rawResolvedValue as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldName = rawFieldName as any;

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

  describe('missing base version - customized field w/ an upgrade resulted in a solvable conflict (-AB)', () => {
    it('upgrades rule to suggested value', async () => {
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
          current: customized,
          target: upgrade,
          merged: customized,
        },
        diffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
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
}

async function clickUpgradeRuleButton(wrapper: HTMLElement): Promise<void> {
  const upgradeRuleButton = within(wrapper).getByRole('button', {
    name: 'Update rule',
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
