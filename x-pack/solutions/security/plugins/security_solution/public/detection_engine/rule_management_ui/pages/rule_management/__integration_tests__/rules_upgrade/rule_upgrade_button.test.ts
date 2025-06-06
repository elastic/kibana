/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import {
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../common/api/detection_engine';
import {
  mockRuleUpgradeReviewData,
  renderRuleUpgradeFlyout,
} from './test_utils/rule_upgrade_flyout';
import {
  switchToFieldEdit,
  toggleFieldAccordion,
  cancelFieldEdit,
  saveFieldValue,
  saveAndAcceptFieldValue,
} from './test_utils/rule_upgrade_helpers';
import { inputFieldValue } from './test_utils/set_field_value';

describe('Rule Upgrade button', () => {
  describe('when there are no fields with conflicts', () => {
    it('is enabled', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      await renderRuleUpgradeFlyout();

      expectRuleUpgradeButtonToBeEnabled();
    });

    it('gets disabled after switching a field to edit mode', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);
      switchToFieldEdit(fieldUpgradeWrapper);

      expectRuleUpgradeButtonToBeDisabled();
    });

    it('gets disabled when field value validation does not pass', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);
      switchToFieldEdit(fieldUpgradeWrapper);

      await inputFieldValue(fieldUpgradeWrapper, { fieldName: 'name', value: '' });

      expectRuleUpgradeButtonToBeDisabled();
    });

    it('gets enabled after switching to readonly mode', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);
      switchToFieldEdit(fieldUpgradeWrapper);
      cancelFieldEdit(fieldUpgradeWrapper);

      expectRuleUpgradeButtonToBeEnabled();
    });

    it('gets enabled after providing a resolved value', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);
      switchToFieldEdit(fieldUpgradeWrapper);

      await inputFieldValue(fieldUpgradeWrapper, { fieldName: 'name', value: 'Resolved name' });
      await saveFieldValue(fieldUpgradeWrapper);

      expectRuleUpgradeButtonToBeEnabled();
    });
  });

  describe('when there are fields with conflicts', () => {
    it('is disabled with solvable conflict', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      await renderRuleUpgradeFlyout();

      expectRuleUpgradeButtonToBeDisabled();
    });

    it('is disabled with non-solvable conflict', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      });

      await renderRuleUpgradeFlyout();

      expectRuleUpgradeButtonToBeDisabled();
    });

    it('gets enabled after providing a resolved value', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      await inputFieldValue(fieldUpgradeWrapper, { fieldName: 'name', value: 'Resolved name' });
      await saveAndAcceptFieldValue(fieldUpgradeWrapper);

      expectRuleUpgradeButtonToBeEnabled();
    });
  });
});

function expectRuleUpgradeButtonToBeDisabled(): void {
  expect(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Update rule',
    })
  ).toBeDisabled();
}

function expectRuleUpgradeButtonToBeEnabled(): void {
  expect(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Update rule',
    })
  ).toBeEnabled();
}
