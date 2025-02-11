/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../common/api/detection_engine';
import {
  switchToFieldEdit,
  mockRuleUpgradeReviewData,
  renderRuleUpgradeFlyout,
  toggleFieldAccordion,
  cancelFieldEdit,
  setResolvedName,
} from './mock/helpers';

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

      const { getByRole } = await renderRuleUpgradeFlyout();

      expect(
        getByRole('button', {
          name: 'Update',
        })
      ).toBeEnabled();
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

      const { getByTestId, getByRole } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);
      switchToFieldEdit(fieldUpgradeWrapper);

      expect(
        getByRole('button', {
          name: 'Update',
        })
      ).toBeDisabled();
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

      const { getByTestId, getByRole } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);
      switchToFieldEdit(fieldUpgradeWrapper);
      cancelFieldEdit(fieldUpgradeWrapper);

      expect(
        getByRole('button', {
          name: 'Update',
        })
      ).toBeEnabled();
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

      const { getByTestId, getByRole } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);
      switchToFieldEdit(fieldUpgradeWrapper);
      await setResolvedName(fieldUpgradeWrapper, 'Resolved name');

      expect(
        getByRole('button', {
          name: 'Update',
        })
      ).toBeEnabled();
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

      const { getByRole } = await renderRuleUpgradeFlyout();

      expect(
        getByRole('button', {
          name: 'Update',
        })
      ).toBeDisabled();
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

      const { getByRole } = await renderRuleUpgradeFlyout();

      expect(
        getByRole('button', {
          name: 'Update',
        })
      ).toBeDisabled();
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

      const { getByTestId, getByRole } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      await setResolvedName(fieldUpgradeWrapper, 'Resolved name', {
        saveButtonText: 'Save and accept',
      });

      expect(
        getByRole('button', {
          name: 'Update',
        })
      ).toBeEnabled();
    });
  });
});
