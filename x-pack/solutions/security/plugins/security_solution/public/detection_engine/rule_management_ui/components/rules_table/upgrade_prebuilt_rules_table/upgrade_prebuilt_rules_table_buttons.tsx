/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSplitButton,
  EuiToolTip,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import type { ReactElement, ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import * as i18n from './translations';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';
import { usePrebuiltRulesCustomizationStatus } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useForceUpgradeToTargetModal } from './use_force_upgrade_to_target_modal';

interface UpgradePrebuiltRulesTableButtonsProps {
  selectedRules: RuleUpgradeState[];
}

export const UpgradePrebuiltRulesTableButtons = ({
  selectedRules,
}: UpgradePrebuiltRulesTableButtonsProps) => {
  const {
    state: {
      hasRulesToUpgrade,
      loadingRules,
      isRefetching,
      isInitializingPrebuiltRulesPackage,
      allRulesCustomizationCounts,
    },
    actions: {
      upgradeRules,
      upgradeAllRules,
      upgradeRulesToTarget,
      upgradeAllRulesToTarget,
      getSelectedRulesCustomizationCounts,
    },
  } = useUpgradePrebuiltRulesTableContext();
  const { isRulesCustomizationEnabled } = usePrebuiltRulesCustomizationStatus();
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;

  const numberOfSelectedRules = selectedRules.length ?? 0;
  const shouldDisplayUpgradeSelectedRulesButton = numberOfSelectedRules > 0;

  const isRuleUpgrading = loadingRules.length > 0;
  const isRequestInProgress = isRuleUpgrading || isRefetching || isInitializingPrebuiltRulesPackage;

  const doAllSelectedRulesHaveConflicts =
    isRulesCustomizationEnabled &&
    selectedRules.every(
      ({ hasNonSolvableUnresolvedConflicts }) => hasNonSolvableUnresolvedConflicts
    );

  const { selectedRulesButtonTooltip, secondaryActionsButtonTooltip, allRulesButtonTooltip } =
    useBulkUpdateButtonsTooltipContent({
      canUserEditRules: canEditRules,
      doAllSelectedRulesHaveConflicts,
      isPrebuiltRulesCustomizationEnabled: isRulesCustomizationEnabled,
    });

  const upgradeSelectedRules = useCallback(
    () => upgradeRules(selectedRules.map((rule) => rule.rule_id)),
    [selectedRules, upgradeRules]
  );

  const { modal: forceUpgradeSelectedRulesToTargetModal, confirmForceUpgradeToTarget } =
    useForceUpgradeToTargetModal({
      dataTestSubj: 'forceUpgradeSelectedRulesToTargetConfirmModal',
    });

  const [isSelectedPopoverOpen, { toggle: toggleSelectedPopover, off: closeSelectedPopover }] =
    useBoolean(false);

  const onUpdateSelectedRulesToTarget = useCallback(async () => {
    closeSelectedPopover();

    const ruleIds = selectedRules.map((rule) => rule.rule_id);
    const counts = getSelectedRulesCustomizationCounts(ruleIds);

    if (!(await confirmForceUpgradeToTarget(counts))) {
      return;
    }

    await upgradeRulesToTarget(ruleIds);
  }, [
    closeSelectedPopover,
    confirmForceUpgradeToTarget,
    getSelectedRulesCustomizationCounts,
    selectedRules,
    upgradeRulesToTarget,
  ]);

  const selectedRulesToTargetMenuItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="upgradeSelectedRulesToTarget"
        onClick={onUpdateSelectedRulesToTarget}
        data-test-subj="upgradeSelectedRulesToTargetAction"
      >
        {i18n.UPDATE_TO_ELASTIC_VERSION}
      </EuiContextMenuItem>,
    ],
    [onUpdateSelectedRulesToTarget]
  );

  const {
    modal: forceUpgradeAllRulesToTargetModal,
    confirmForceUpgradeToTarget: confirmForceUpgradeAllRulesToTarget,
  } = useForceUpgradeToTargetModal({
    dataTestSubj: 'forceUpgradeAllRulesToTargetConfirmModal',
  });

  const [isAllPopoverOpen, { toggle: toggleAllPopover, off: closeAllPopover }] = useBoolean(false);

  const onUpdateAllRulesToTarget = useCallback(async () => {
    closeAllPopover();

    if (!(await confirmForceUpgradeAllRulesToTarget(allRulesCustomizationCounts))) {
      return;
    }

    await upgradeAllRulesToTarget();
  }, [
    allRulesCustomizationCounts,
    closeAllPopover,
    confirmForceUpgradeAllRulesToTarget,
    upgradeAllRulesToTarget,
  ]);

  const allRulesToTargetMenuItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="upgradeAllRulesToTarget"
        onClick={onUpdateAllRulesToTarget}
        data-test-subj="upgradeAllRulesToTargetAction"
      >
        {i18n.UPDATE_TO_ELASTIC_VERSION}
      </EuiContextMenuItem>,
    ],
    [onUpdateAllRulesToTarget]
  );

  const selectedRulesSecondaryAction = useMemo<BulkUpgradeSecondaryAction | undefined>(
    () =>
      isRulesCustomizationEnabled
        ? {
            isDisabled: !canEditRules || isRequestInProgress,
            tooltip: secondaryActionsButtonTooltip,
            ariaLabel: i18n.UPDATE_SELECTED_RULES_MORE_ACTIONS_ARIA_LABEL,
            dataTestSubj: 'upgradeSelectedRulesButton-secondary',
            isPopoverOpen: isSelectedPopoverOpen,
            togglePopover: toggleSelectedPopover,
            closePopover: closeSelectedPopover,
            menuItems: selectedRulesToTargetMenuItems,
          }
        : undefined,
    [
      canEditRules,
      closeSelectedPopover,
      isRequestInProgress,
      isRulesCustomizationEnabled,
      isSelectedPopoverOpen,
      secondaryActionsButtonTooltip,
      selectedRulesToTargetMenuItems,
      toggleSelectedPopover,
    ]
  );

  const allRulesSecondaryAction = useMemo<BulkUpgradeSecondaryAction | undefined>(
    () =>
      isRulesCustomizationEnabled
        ? {
            isDisabled: !canEditRules || !hasRulesToUpgrade || isRequestInProgress,
            tooltip: secondaryActionsButtonTooltip,
            ariaLabel: i18n.UPDATE_ALL_RULES_MORE_ACTIONS_ARIA_LABEL,
            dataTestSubj: 'upgradeAllRulesButton-secondary',
            isPopoverOpen: isAllPopoverOpen,
            togglePopover: toggleAllPopover,
            closePopover: closeAllPopover,
            menuItems: allRulesToTargetMenuItems,
          }
        : undefined,
    [
      allRulesToTargetMenuItems,
      canEditRules,
      closeAllPopover,
      hasRulesToUpgrade,
      isAllPopoverOpen,
      isRequestInProgress,
      isRulesCustomizationEnabled,
      secondaryActionsButtonTooltip,
      toggleAllPopover,
    ]
  );

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
        {shouldDisplayUpgradeSelectedRulesButton ? (
          <EuiFlexItem grow={false}>
            <BulkUpgradeButton
              onClick={upgradeSelectedRules}
              isDisabled={!canEditRules || isRequestInProgress || doAllSelectedRulesHaveConflicts}
              tooltip={selectedRulesButtonTooltip}
              dataTestSubj="upgradeSelectedRulesButton"
              isLoading={isRuleUpgrading}
              secondaryAction={selectedRulesSecondaryAction}
            >
              {i18n.UPDATE_SELECTED_RULES(numberOfSelectedRules)}
            </BulkUpgradeButton>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <BulkUpgradeButton
            fill
            iconType="plusCircle"
            onClick={upgradeAllRules}
            isDisabled={!canEditRules || !hasRulesToUpgrade || isRequestInProgress}
            tooltip={allRulesButtonTooltip}
            dataTestSubj="upgradeAllRulesButton"
            isLoading={isRuleUpgrading}
            secondaryAction={allRulesSecondaryAction}
          >
            {i18n.UPDATE_ALL}
          </BulkUpgradeButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {forceUpgradeSelectedRulesToTargetModal}
      {forceUpgradeAllRulesToTargetModal}
    </>
  );
};

interface BulkUpgradeSecondaryAction {
  isDisabled: boolean;
  tooltip: string | undefined;
  ariaLabel: string;
  dataTestSubj: string;
  isPopoverOpen: boolean;
  togglePopover: () => void;
  closePopover: () => void;
  menuItems: ReactElement[];
}

interface BulkUpgradeButtonProps {
  children: ReactNode;
  onClick: () => void;
  isDisabled: boolean;
  tooltip: string | undefined;
  dataTestSubj: string;
  isLoading: boolean;
  fill?: boolean;
  iconType?: IconType;
  /**
   * When omitted (prebuilt rules customization is disabled) the primary action already
   * upgrades to the Elastic version, so a plain button is rendered instead of a split one.
   */
  secondaryAction?: BulkUpgradeSecondaryAction;
}

const BulkUpgradeButton = ({
  children,
  onClick,
  isDisabled,
  tooltip,
  dataTestSubj,
  isLoading,
  fill,
  iconType,
  secondaryAction,
}: BulkUpgradeButtonProps) => {
  const label = (
    <>
      {children}
      {isLoading ? <EuiLoadingSpinner size="s" /> : undefined}
    </>
  );

  if (!secondaryAction) {
    return (
      <EuiToolTip content={tooltip}>
        <EuiButton
          fill={fill}
          iconType={iconType}
          onClick={onClick}
          disabled={isDisabled}
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiButton>
      </EuiToolTip>
    );
  }

  return (
    <EuiSplitButton color="primary" fill={fill} size="m">
      <EuiSplitButton.ActionPrimary
        onClick={onClick}
        iconType={iconType}
        isDisabled={isDisabled}
        tooltipProps={tooltip ? { content: tooltip } : undefined}
        data-test-subj={dataTestSubj}
      >
        {label}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="chevronSingleDown"
        isDisabled={secondaryAction.isDisabled}
        tooltipProps={secondaryAction.tooltip ? { content: secondaryAction.tooltip } : undefined}
        aria-label={secondaryAction.ariaLabel}
        data-test-subj={secondaryAction.dataTestSubj}
        onClick={secondaryAction.togglePopover}
        popoverProps={{
          isOpen: secondaryAction.isPopoverOpen,
          closePopover: secondaryAction.closePopover,
          panelPaddingSize: 's',
          anchorPosition: 'downRight',
          children: <EuiContextMenuPanel items={secondaryAction.menuItems} />,
        }}
      />
    </EuiSplitButton>
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
      secondaryActionsButtonTooltip: i18n.BULK_UPDATE_BUTTON_TOOLTIP_NO_PERMISSIONS,
      allRulesButtonTooltip: i18n.BULK_UPDATE_BUTTON_TOOLTIP_NO_PERMISSIONS,
    };
  }

  if (!isPrebuiltRulesCustomizationEnabled) {
    return {
      selectedRulesButtonTooltip: undefined,
      secondaryActionsButtonTooltip: undefined,
      allRulesButtonTooltip: undefined,
    };
  }

  if (doAllSelectedRulesHaveConflicts) {
    // The secondary ("Update to Elastic version") action is never conflict-gated, so it must
    // not inherit the primary's conflicts tooltip: that reason does not apply to the one action
    // that can resolve the conflict.
    return {
      selectedRulesButtonTooltip: i18n.BULK_UPDATE_SELECTED_RULES_BUTTON_TOOLTIP_CONFLICTS,
      secondaryActionsButtonTooltip: undefined,
      allRulesButtonTooltip: undefined,
    };
  }

  return {
    selectedRulesButtonTooltip: undefined,
    secondaryActionsButtonTooltip: undefined,
    allRulesButtonTooltip: undefined,
  };
};
