/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, within } from '@testing-library/react';
import {
  PERFORM_RULE_UPGRADE_URL,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../../common/api/detection_engine';
import { KibanaServices } from '../../../../../../common/lib/kibana';
import { mockRuleUpgradeReviewData, renderRuleUpgradeFlyout } from './mock/rule_upgrade_flyout';
import {
  acceptSuggestedFieldValue,
  saveAndAcceptSuggestedFieldValue,
  setResolvedName,
  switchToFieldEdit,
  toggleFieldAccordion,
} from './mock/rule_upgrade_helpers';

describe('Upgrade rule after preview', () => {
  beforeAll(() => {
    // Reset mock stats
    (KibanaServices.get().http.fetch as jest.Mock).mockClear();
  });

  describe.each([
    {
      ruleType: 'query',
      fieldName: 'name',
      initial: 'Initial name',
      customized: 'Custom name',
      upgrade: 'Updated name',
    },
  ])('$fieldName ($ruleType rule)', ({ ruleType, fieldName, initial, customized, upgrade }) => {
    describe('non-customized field w/ an upgrade (AAB)', () => {
      it('upgrades rule', async () => {
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
        await setResolvedName(fieldUpgradeWrapper, 'Resolved name');

        await clickUpgradeRuleButton(getByRole('dialog'));

        expectRuleUpgradeWithResolvedFieldValue(fieldName, 'Resolved name');
      });
    });

    describe('customized field w/o an upgrade (ABA)', () => {
      it('upgrades rule', async () => {
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
        await setResolvedName(fieldUpgradeWrapper, 'Resolved name');

        await clickUpgradeRuleButton(getByRole('dialog'));

        expectRuleUpgradeWithResolvedFieldValue(fieldName, 'Resolved name');
      });
    });

    describe('customized field w/ the matching upgrade (ABB)', () => {
      it('upgrades rule', async () => {
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
        await setResolvedName(fieldUpgradeWrapper, 'Resolved name');

        await clickUpgradeRuleButton(getByRole('dialog'));

        expectRuleUpgradeWithResolvedFieldValue(fieldName, 'Resolved name');
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
        await setResolvedName(fieldUpgradeWrapper, 'Resolved name', {
          saveButtonText: 'Save and accept',
        });

        await clickUpgradeRuleButton(getByRole('dialog'));

        expectRuleUpgradeWithResolvedFieldValue(fieldName, 'Resolved name');
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

        await saveAndAcceptSuggestedFieldValue(fieldUpgradeWrapper);
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

        await setResolvedName(fieldUpgradeWrapper, 'Resolved name', {
          saveButtonText: 'Save and accept',
        });

        await clickUpgradeRuleButton(getByRole('dialog'));

        expectRuleUpgradeWithResolvedFieldValue(fieldName, 'Resolved name');
      });
    });
  });
});

async function clickUpgradeRuleButton(wrapper: HTMLElement): Promise<void> {
  const upgradeRuleButton = within(wrapper).getByRole('button', {
    name: 'Update',
  });

  expect(upgradeRuleButton).toBeVisible();
  expect(upgradeRuleButton).toBeEnabled();

  await act(async () => {
    fireEvent.click(upgradeRuleButton);
  });
}

function expectRuleUpgradeToMergedValue(): void {
  expect(KibanaServices.get().http.fetch).toHaveBeenCalledWith(
    PERFORM_RULE_UPGRADE_URL,
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        mode: 'SPECIFIC_RULES',
        rules: [{ rule_id: 'test-rule', revision: 1, fields: {} }],
        pick_version: 'MERGED',
      }),
    })
  );
}

function expectRuleUpgradeWithResolvedFieldValue(fieldName: string, value: unknown): void {
  expect(KibanaServices.get().http.fetch).toHaveBeenCalledWith(
    PERFORM_RULE_UPGRADE_URL,
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        mode: 'SPECIFIC_RULES',
        rules: [
          {
            rule_id: 'test-rule',
            revision: 1,
            fields: { [fieldName]: { pick_version: 'RESOLVED', resolved_value: value } },
          },
        ],
        pick_version: 'MERGED',
      }),
    })
  );
}
