/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, within } from '@testing-library/react';
import {
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../common/api/detection_engine';
import {
  mockRuleUpgradeReviewData,
  renderRuleUpgradeFlyout,
  toggleFieldAccordion,
} from './mock/helpers';
import { VersionsPickerOptionEnum } from '../../../../../rule_management/components/rule_details/three_way_diff/comparison_side/versions_picker/versions_picker';

describe('Rule upgrade preview Diff View options', () => {
  describe('non-customized field w/ an upgrade (AAB)', () => {
    it('shows default (incoming upgrade)', async () => {
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

      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('Update from Elastic');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows resolved value', async () => {
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

      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      switchToFieldEdit(fieldUpgradeWrapper);
      await setResolvedName(fieldUpgradeWrapper, 'Resolved name');

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });
  });

  describe('customized field w/o an upgrade (ABA)', () => {
    it('shows default (customization)', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Initial name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);

      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Customized name');
    });

    it('shows resolved value', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Initial name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);

      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      switchToFieldEdit(fieldUpgradeWrapper);
      await setResolvedName(fieldUpgradeWrapper, 'Resolved name');

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });
  });

  describe('customized field w/ the matching upgrade (ABB)', () => {
    it('shows default (customization)', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Updated name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);

      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows incoming upgrade', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Updated name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);

      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      switchDiffViewTo(diffViewSelector, VersionsPickerOptionEnum.UpdateFromElastic);

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('Update from Elastic');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows resolved value', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Updated name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        conflict: ThreeWayDiffConflict.NONE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

      toggleFieldAccordion(fieldUpgradeWrapper);

      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      switchToFieldEdit(fieldUpgradeWrapper);
      await setResolvedName(fieldUpgradeWrapper, 'Resolved name');

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });
  });

  describe('customized field w/ an upgrade resulting in a solvable conflict (ABC)', () => {
    it('shows default (merged value)', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Merged name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);
      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My changes merged with Elastic’s');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Merged name');
    });

    it('shows incoming upgrade', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Merged name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);
      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      switchDiffViewTo(diffViewSelector, VersionsPickerOptionEnum.UpdateFromElastic);

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('Update from Elastic');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows original customization', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Merged name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);
      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      switchDiffViewTo(diffViewSelector, VersionsPickerOptionEnum.MyOriginalChanges);

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My original changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Customized name');
    });

    it('shows resolved value', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Merged name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);
      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      switchToFieldEdit(fieldUpgradeWrapper);
      await setResolvedName(fieldUpgradeWrapper, 'Resolved name', {
        saveButtonText: 'Save and accept',
      });

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });
  });

  describe('customized field w/ an upgrade resulting in a non-solvable conflict (ABC)', () => {
    it('shows default diff view (customization)', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);
      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Customized name');
    });

    it('shows incoming upgrade', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);
      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      switchDiffViewTo(diffViewSelector, VersionsPickerOptionEnum.UpdateFromElastic);

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('Update from Elastic');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows resolved value', async () => {
      mockRuleUpgradeReviewData({
        ruleType: 'query',
        fieldName: 'name',
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      });

      const { getByTestId } = await renderRuleUpgradeFlyout();

      const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);
      const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
      const diffViewSelector = within(diffViewSection).getByRole('combobox');

      await setResolvedName(fieldUpgradeWrapper, 'Resolved name', {
        saveButtonText: 'Save and accept',
      });

      expect(diffViewSelector).toBeVisible();
      expect(diffViewSelector).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });
  });
});

function switchDiffViewTo(diffViewSelector: HTMLElement, option: VersionsPickerOptionEnum): void {
  act(() => {
    fireEvent.change(diffViewSelector, { target: { value: option } });
  });
}

function switchToFieldEdit(wrapper: HTMLElement): void {
  act(() => {
    fireEvent.click(within(wrapper).getByRole('button', { name: 'Edit' }));
  });
}

interface SetResolvedNameOptions {
  saveButtonText: string;
}

async function setResolvedName(
  wrapper: HTMLElement,
  value: string,
  options: SetResolvedNameOptions = {
    saveButtonText: 'Save',
  }
): Promise<void> {
  await act(async () => {
    fireEvent.change(within(wrapper).getByTestId('input'), {
      target: { value },
    });
  });

  await act(async () => {
    fireEvent.click(within(wrapper).getByRole('button', { name: options.saveButtonText }));
  });
}
