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
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import useBoolean from 'react-use/lib/useBoolean';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import * as i18n from './translations';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';

export const AddPrebuiltRulesHeaderButtons = () => {
  const {
    state: {
      selectedRules,
      isRefetching,
      isUpgradingSecurityPackages,
      isAnyRuleInstalling,
      hasRulesToInstall,
    },
    actions: { installAllRules, installSelectedRules },
  } = useAddPrebuiltRulesTableContext();
  const canEditRules = useUserPrivileges().rulesPrivileges.edit;

  const numberOfSelectedRules = selectedRules.length ?? 0;
  const shouldDisplayInstallSelectedRulesButton = numberOfSelectedRules > 0;

  const isRequestInProgress = isAnyRuleInstalling || isRefetching || isUpgradingSecurityPackages;

  const [isOverflowPopoverOpen, setOverflowPopover] = useBoolean(false);

  const onOverflowButtonClick = () => {
    setOverflowPopover(!isOverflowPopoverOpen);
  };

  const closeOverflowPopover = useCallback(() => {
    setOverflowPopover(false);
  }, [setOverflowPopover]);

  const enableOnClick = useCallback(() => {
    installSelectedRules(true);
    closeOverflowPopover();
  }, [closeOverflowPopover, installSelectedRules]);

  const installOnClick = useCallback(() => {
    installSelectedRules();
  }, [installSelectedRules]);

  const overflowItems = useMemo(
    () => [
      <EuiContextMenuItem key="copy" icon={'play'} onClick={enableOnClick}>
        {i18n.INSTALL_AND_ENABLE_BUTTON_LABEL}
      </EuiContextMenuItem>,
    ],
    [enableOnClick]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
      {shouldDisplayInstallSelectedRulesButton ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={installOnClick}
              disabled={!canEditRules || isRequestInProgress}
              data-test-subj="installSelectedRulesButton"
            >
              {i18n.INSTALL_SELECTED_RULES(numberOfSelectedRules)}
              {isAnyRuleInstalling && <EuiLoadingSpinner size="s" />}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  display="base"
                  size="m"
                  iconType="boxesVertical"
                  aria-label={i18n.INSTALL_RULES_OVERFLOW_BUTTON_ARIA_LABEL}
                  onClick={onOverflowButtonClick}
                  disabled={!canEditRules || isRequestInProgress}
                />
              }
              isOpen={isOverflowPopoverOpen}
              closePopover={closeOverflowPopover}
              panelPaddingSize="s"
              anchorPosition="downRight"
            >
              <EuiContextMenuPanel size="s" items={overflowItems} />
            </EuiPopover>
          </EuiFlexItem>
        </>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          iconType="plusInCircle"
          data-test-subj="installAllRulesButton"
          onClick={installAllRules}
          disabled={!canEditRules || !hasRulesToInstall || isRequestInProgress}
          aria-label={i18n.INSTALL_ALL_ARIA_LABEL}
        >
          {i18n.INSTALL_ALL}
          {isAnyRuleInstalling && <EuiLoadingSpinner size="s" />}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
