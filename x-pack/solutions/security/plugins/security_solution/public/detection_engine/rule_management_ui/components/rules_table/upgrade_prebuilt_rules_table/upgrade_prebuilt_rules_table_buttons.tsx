/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import type { ReactElement, ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import type { RuleUpgradeState } from '../../../../rule_management/model/prebuilt_rule_upgrade';
import { useUserData } from '../../../../../detections/components/user_info';
import * as i18n from './translations';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';
import { usePrebuiltRulesCustomizationStatus } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';
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
      isUpgradingSecurityPackages,
      isFetched,
    },
    actions: {
      upgradeRules,
      upgradeAllRules,
      upgradeRulesToTarget,
      upgradeAllRulesToTarget,
      getSelectedRulesCustomizationCounts,
      fetchAllRulesCustomizationCounts,
    },
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

  const { selectedRulesButtonTooltip, secondaryActionsButtonTooltip, allRulesButtonTooltip } =
    useBulkUpdateButtonsTooltipContent({
      canUserEditRules,
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

    // The cached review may be minutes old, so confirm against freshly fetched counts. This does
    // not close the window between confirmation and the server resolving the ALL_RULES set, which
    // needs server-side revision binding.
    const counts = await fetchAllRulesCustomizationCounts();

    if (!counts) {
      return;
    }

    if (!(await confirmForceUpgradeAllRulesToTarget(counts))) {
      return;
    }

    await upgradeAllRulesToTarget();
  }, [
    closeAllPopover,
    confirmForceUpgradeAllRulesToTarget,
    fetchAllRulesCustomizationCounts,
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
            isDisabled: !canUserEditRules || isRequestInProgress,
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
      canUserEditRules,
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
            // The action re-fetches the upgrade review before confirming, so it only needs the
            // review to have loaded once.
            isDisabled:
              !canUserEditRules || !hasRulesToUpgrade || isRequestInProgress || !isFetched,
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
      canUserEditRules,
      closeAllPopover,
      hasRulesToUpgrade,
      isAllPopoverOpen,
      isFetched,
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
              isDisabled={
                !canUserEditRules || isRequestInProgress || doAllSelectedRulesHaveConflicts
              }
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
            iconType="plusInCircle"
            onClick={upgradeAllRules}
            isDisabled={!canUserEditRules || !hasRulesToUpgrade || isRequestInProgress}
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
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={secondaryAction.isPopoverOpen}
          closePopover={secondaryAction.closePopover}
          panelPaddingSize="s"
          anchorPosition="downRight"
          button={
            <EuiToolTip content={secondaryAction.tooltip}>
              <EuiButtonIcon
                display={fill ? 'fill' : 'base'}
                size="m"
                iconType="arrowDown"
                isDisabled={secondaryAction.isDisabled}
                aria-label={secondaryAction.ariaLabel}
                data-test-subj={secondaryAction.dataTestSubj}
                onClick={secondaryAction.togglePopover}
              />
            </EuiToolTip>
          }
        >
          <EuiContextMenuPanel items={secondaryAction.menuItems} />
        </EuiPopover>
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
