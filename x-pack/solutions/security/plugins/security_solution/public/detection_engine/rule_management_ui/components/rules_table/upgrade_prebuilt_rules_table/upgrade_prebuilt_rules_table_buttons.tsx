/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import { useUserData } from '../../../../../detections/components/user_info';
import * as i18n from './translations';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';
import { usePrebuiltRulesCustomizationStatus } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';

interface UpgradePrebuiltRulesTableButtonsProps {
  selectedRules: RuleUpgradeState[];
}

export const UpgradePrebuiltRulesTableButtons = ({
  selectedRules,
}: UpgradePrebuiltRulesTableButtonsProps) => {
  const {
    state: { hasRulesToUpgrade, loadingRules, isRefetching, isUpgradingSecurityPackages },
    actions: { upgradeRules, upgradeAllRules },
  } = useUpgradePrebuiltRulesTableContext();
  const { isRulesCustomizationEnabled } = usePrebuiltRulesCustomizationStatus();
  const [{ loading: isUserDataLoading, canUserCRUD }] = useUserData();
  const canUserEditRules = canUserCRUD && !isUserDataLoading;

  const numberOfSelectedRules = selectedRules.length ?? 0;
  const shouldDisplayUpgradeSelectedRulesButton = numberOfSelectedRules > 0;

  const isRuleUpgrading = loadingRules.length > 0;
  const isRequestInProgress = isRuleUpgrading || isRefetching || isUpgradingSecurityPackages;

  const doAllSelectedRulesHaveConflicts =
    isRulesCustomizationEnabled &&
    selectedRules.every(
      ({ hasNonSolvableUnresolvedConflicts }) => hasNonSolvableUnresolvedConflicts
    );

  const { selectedRulesButtonTooltip, allRulesButtonTooltip } = useBulkUpdateButtonsTooltipContent({
    canUserEditRules,
    doAllSelectedRulesHaveConflicts,
    isPrebuiltRulesCustomizationEnabled: isRulesCustomizationEnabled,
  });

  const upgradeSelectedRules = useCallback(
    () => upgradeRules(selectedRules.map((rule) => rule.rule_id)),
    [selectedRules, upgradeRules]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
      {shouldDisplayUpgradeSelectedRulesButton ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={selectedRulesButtonTooltip}>
            <EuiButton
              onClick={upgradeSelectedRules}
              disabled={!canUserEditRules || isRequestInProgress || doAllSelectedRulesHaveConflicts}
              data-test-subj="upgradeSelectedRulesButton"
            >
              <>
                {i18n.UPDATE_SELECTED_RULES(numberOfSelectedRules)}
                {isRuleUpgrading ? <EuiLoadingSpinner size="s" /> : undefined}
              </>
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiToolTip content={allRulesButtonTooltip}>
          <EuiButton
            fill
            iconType="plusInCircle"
            onClick={upgradeAllRules}
            disabled={!canUserEditRules || !hasRulesToUpgrade || isRequestInProgress}
            data-test-subj="upgradeAllRulesButton"
          >
            {i18n.UPDATE_ALL}
            {isRuleUpgrading ? <EuiLoadingSpinner size="s" /> : undefined}
          </EuiButton>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const useBulkUpdateButtonsTooltipContent = ({
  canUserEditRules,
  doAllSelectedRulesHaveConflicts,
  isPrebuiltRulesCustomizationEnabled,
}: {
  canUserEditRules: boolean | null;
  doAllSelectedRulesHaveConflicts: boolean;
  isPrebuiltRulesCustomizationEnabled: boolean;
}) => {
  if (!canUserEditRules) {
    return {
      selectedRulesButtonTooltip: i18n.BULK_UPDATE_BUTTON_TOOLTIP_NO_PERMISSIONS,
      allRulesButtonTooltip: i18n.BULK_UPDATE_BUTTON_TOOLTIP_NO_PERMISSIONS,
    };
  }

  if (!isPrebuiltRulesCustomizationEnabled) {
    return {
      selectedRulesButtonTooltip: undefined,
      allRulesButtonTooltip: undefined,
    };
  }

  if (doAllSelectedRulesHaveConflicts) {
    return {
      selectedRulesButtonTooltip: i18n.BULK_UPDATE_SELECTED_RULES_BUTTON_TOOLTIP_CONFLICTS,
      allRulesButtonTooltip: undefined,
    };
  }

  return {
    selectedRulesButtonTooltip: undefined,
    allRulesButtonTooltip: undefined,
  };
};
