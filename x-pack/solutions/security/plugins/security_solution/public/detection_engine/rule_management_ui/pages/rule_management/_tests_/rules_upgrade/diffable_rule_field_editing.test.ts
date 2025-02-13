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
import { mockRuleUpgradeReviewData, renderRuleUpgradeFlyout } from './mock/rule_upgrade_flyout';
import {
  switchToFieldEdit,
  toggleFieldAccordion,
  setResolvedName,
} from './mock/rule_upgrade_helpers';

describe('Field value editing in rule upgrade flyout', () => {
  it('disables Save field button when field value validation does not pass', async () => {
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

    await setResolvedName(fieldUpgradeWrapper, '');

    expect(
      getByRole('button', {
        name: 'Save',
      })
    ).toBeDisabled();
  });
});
