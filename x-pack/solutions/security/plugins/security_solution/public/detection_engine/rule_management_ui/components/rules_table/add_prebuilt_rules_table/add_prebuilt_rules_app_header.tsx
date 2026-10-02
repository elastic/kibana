/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { AppHeaderMenu } from '@kbn/app-header';
import { SecurityPageName } from '../../../../../app/types';
import { SecurityAppHeader } from '../../../../../common/components/app_header';
import { useGetSecuritySolutionUrl } from '../../../../../common/components/link_to';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { PAGE_TITLE as RULES_PAGE_TITLE } from '../../../../common/translations';
import { PAGE_TITLE } from '../../../pages/add_rules/translations';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import * as i18n from './translations';

/**
 * App header of the Add Elastic rules page: title, back link to the Rules page, and install actions.
 * Must render inside `AddPrebuiltRulesTableContextProvider`.
 */
export const AddPrebuiltRulesAppHeader = React.memo(() => {
  const {
    state: {
      selectedRules,
      isRefetching,
      isInitializingPrebuiltRulesPackage,
      isAnyRuleInstalling,
      hasRulesToInstall,
    },
    actions: { installAllRules, installSelectedRules },
  } = useAddPrebuiltRulesTableContext();
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  const numberOfSelectedRules = selectedRules.length;
  const isRequestInProgress =
    isAnyRuleInstalling || isRefetching || isInitializingPrebuiltRulesPackage;

  const menu = useMemo<AppHeaderMenu>(() => {
    const isInstallDisabled = !canEditRules || isRequestInProgress;

    return {
      items:
        numberOfSelectedRules > 0
          ? [
              {
                id: 'installSelectedRules',
                label: i18n.INSTALL_SELECTED_RULES(numberOfSelectedRules),
                iconType: 'plusCircle',
                run: () => installSelectedRules(),
                disableButton: isInstallDisabled,
                isLoading: isAnyRuleInstalling,
                testId: 'installSelectedRulesButton',
              },
              {
                id: 'installAndEnableSelectedRules',
                label: i18n.INSTALL_AND_ENABLE_BUTTON_LABEL,
                iconType: 'play',
                overflow: true,
                run: () => installSelectedRules(true),
                disableButton: isInstallDisabled,
                testId: 'installAndEnableSelectedRulesButton',
              },
            ]
          : [],
      primaryActionItem: {
        id: 'installAllRules',
        label: i18n.INSTALL_ALL,
        iconType: 'plusCircle',
        run: () => installAllRules(),
        disableButton: !canEditRules || !hasRulesToInstall || isRequestInProgress,
        isLoading: isAnyRuleInstalling,
        testId: 'installAllRulesButton',
      },
    };
  }, [
    canEditRules,
    hasRulesToInstall,
    installAllRules,
    installSelectedRules,
    isAnyRuleInstalling,
    isRequestInProgress,
    numberOfSelectedRules,
  ]);

  return (
    <SecurityAppHeader
      title={PAGE_TITLE}
      back={{
        label: RULES_PAGE_TITLE,
        href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.rules }),
      }}
      menu={menu}
      spacing="largeBleed"
    />
  );
});

AddPrebuiltRulesAppHeader.displayName = 'AddPrebuiltRulesAppHeader';
