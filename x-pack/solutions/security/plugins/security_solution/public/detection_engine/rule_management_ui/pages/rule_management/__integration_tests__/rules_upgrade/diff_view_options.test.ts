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
import { VersionsPickerOptionEnum } from '../../../../../rule_management/components/rule_details/three_way_diff/comparison_side/versions_picker/versions_picker';
import {
  mockRuleUpgradeReviewData,
  renderRuleUpgradeFlyout,
} from './test_utils/rule_upgrade_flyout';
import {
  acceptSuggestedFieldValue,
  saveAndAcceptFieldValue,
  saveFieldValue,
  switchToFieldEdit,
  toggleFieldAccordion,
} from './test_utils/rule_upgrade_helpers';
import { inputFieldValue } from './test_utils/set_field_value';

describe('Rule upgrade preview Diff View options', () => {
  describe('non-customized field w/ an upgrade (AAB)', () => {
    it('shows default (incoming upgrade)', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
      });

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('Changes from Elastic');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows resolved value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
      });

      switchToFieldEdit(fieldUpgradeWrapper);
      await inputFieldValue(fieldUpgradeWrapper, { fieldName: 'name', value: 'Resolved name' });
      await saveFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });

    it('shows the same diff after saving unchanged field value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Initial name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
      });

      switchToFieldEdit(fieldUpgradeWrapper);

      await saveFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('Changes from Elastic');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });
  });

  describe('customized field w/o an upgrade (ABA)', () => {
    it('shows default (customization)', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Initial name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
      });

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Customized name');
    });

    it('shows resolved value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Initial name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
      });

      switchToFieldEdit(fieldUpgradeWrapper);
      await inputFieldValue(fieldUpgradeWrapper, { fieldName: 'name', value: 'Resolved name' });
      await saveFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });

    it('shows the same diff after saving unchanged field value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Initial name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
      });

      switchToFieldEdit(fieldUpgradeWrapper);

      await saveFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Customized name');
    });
  });

  describe('customized field w/ the matching upgrade (ABB)', () => {
    it('shows default (customization)', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Updated name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
      });

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes and final updates');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows incoming upgrade', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Updated name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
      });

      switchDiffViewTo(diffViewSelector, VersionsPickerOptionEnum.UpdateFromElastic);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('Changes from Elastic');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows resolved value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Updated name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
      });

      switchToFieldEdit(fieldUpgradeWrapper);
      await inputFieldValue(fieldUpgradeWrapper, { fieldName: 'name', value: 'Resolved name' });
      await saveFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });

    it('shows the same diff after saving unchanged field value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Updated name',
          target: 'Updated name',
          merged: 'Updated name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
      });

      switchToFieldEdit(fieldUpgradeWrapper);

      await saveFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });
  });

  describe('customized field w/ an upgrade resulting in a solvable conflict (ABC)', () => {
    it('shows default (merged value)', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Merged name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent("My changes merged with Elastic's");
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Merged name');
    });

    it('shows incoming upgrade', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Merged name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      switchDiffViewTo(diffViewSelector, VersionsPickerOptionEnum.UpdateFromElastic);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('Changes from Elastic');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows original customization', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Merged name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      switchDiffViewTo(diffViewSelector, VersionsPickerOptionEnum.MyOriginalChanges);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes only');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Customized name');
    });

    it('shows resolved value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Merged name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      switchToFieldEdit(fieldUpgradeWrapper);
      await inputFieldValue(fieldUpgradeWrapper, { fieldName: 'name', value: 'Resolved name' });
      await saveAndAcceptFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });

    it('shows the same diff after saving unchanged field value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Merged name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      switchToFieldEdit(fieldUpgradeWrapper);

      await saveAndAcceptFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent("My changes merged with Elastic's");
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Merged name');
    });
  });

  describe('customized field w/ an upgrade resulting in a non-solvable conflict (ABC)', () => {
    it('shows default diff view (customization)', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      });

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Customized name');
    });

    it('shows incoming upgrade', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      });

      switchDiffViewTo(diffViewSelector, VersionsPickerOptionEnum.UpdateFromElastic);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('Changes from Elastic');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows resolved value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      });

      await inputFieldValue(fieldUpgradeWrapper, { fieldName: 'name', value: 'Resolved name' });
      await saveAndAcceptFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });

    it('shows the same diff after saving unchanged field value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          base: 'Initial name',
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
      });

      await saveAndAcceptFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes');
      expect(diffViewSection).toHaveTextContent('-Initial name');
      expect(diffViewSection).toHaveTextContent('+Customized name');
    });
  });

  describe('missing base - customized field w/ an upgrade resulting in a solvable conflict (-AB)', () => {
    it('shows default diff view (incoming update)', async () => {
      const { diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('Changes from Elastic');
      expect(diffViewSection).toHaveTextContent('-Customized name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows the same diff after saving unchanged field value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      await acceptSuggestedFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('Changes from Elastic');
      expect(diffViewSection).toHaveTextContent('-Customized name');
      expect(diffViewSection).toHaveTextContent('+Updated name');
    });

    it('shows resolved value', async () => {
      const { fieldUpgradeWrapper, diffViewSection, diffViewSelector } = await setup({
        fieldVersions: {
          current: 'Customized name',
          target: 'Updated name',
          merged: 'Customized name',
        },
        diffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        conflict: ThreeWayDiffConflict.SOLVABLE,
      });

      switchToFieldEdit(fieldUpgradeWrapper);

      await inputFieldValue(fieldUpgradeWrapper, { fieldName: 'name', value: 'Resolved name' });
      await saveAndAcceptFieldValue(fieldUpgradeWrapper);

      expect(diffViewSelector).toBeVisible();

      const selectedOption = within(diffViewSelector).getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('My changes and final updates');
      expect(diffViewSection).toHaveTextContent('-Customized name');
      expect(diffViewSection).toHaveTextContent('+Resolved name');
    });
  });
});

interface SetupParams {
  fieldVersions: {
    base?: string;
    current: string;
    target: string;
    merged: string;
  };
  diffOutcome: ThreeWayDiffOutcome;
  conflict?: ThreeWayDiffConflict;
}

interface SetupResult {
  fieldUpgradeWrapper: HTMLElement;
  diffViewSection: HTMLElement;
  diffViewSelector: HTMLElement;
}

async function setup({
  fieldVersions,
  diffOutcome,
  conflict = ThreeWayDiffConflict.NONE,
}: SetupParams): Promise<SetupResult> {
  mockRuleUpgradeReviewData({
    ruleType: 'query',
    fieldName: 'name',
    fieldVersions,
    diffOutcome,
    conflict,
  });

  const { getByTestId } = await renderRuleUpgradeFlyout();
  const fieldUpgradeWrapper = getByTestId(`name-upgradeWrapper`);

  // Fields w/o conflicts are shown collapsed
  if (conflict === ThreeWayDiffConflict.NONE) {
    toggleFieldAccordion(fieldUpgradeWrapper);
  }

  const diffViewSection = within(fieldUpgradeWrapper).getByTestId(`name-comparisonSide`);
  const diffViewSelector = within(diffViewSection).getByRole('combobox');

  return { fieldUpgradeWrapper, diffViewSection, diffViewSelector };
}

function switchDiffViewTo(diffViewSelector: HTMLElement, option: VersionsPickerOptionEnum): void {
  act(() => {
    fireEvent.change(diffViewSelector, { target: { value: option } });
  });

  expect(
    within(diffViewSelector).getByRole('option', {
      selected: true,
    })
  ).toHaveValue(option);
}
