/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { type AppHeaderMenu } from '@kbn/app-header';
import { SecurityPageName } from '../../../../app/types';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { useGetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { useCreateRulePrimaryAction } from './use_create_rule_primary_action';
import { useRulesTableHeaderTabs } from './use_rules_table_header_tabs';
import * as i18n from './translations';

type MenuItem = NonNullable<AppHeaderMenu['items']>[number];

interface RulesTableAppHeaderProps {
  isLoading: boolean;
  canReadRules: boolean;
  canEditRules: boolean;
  canAccessRuleSettings: boolean;
  isImportValueListDisabled: boolean;
  isAiRuleCreationAvailable: boolean;
  onOpenRuleSettings: () => void;
  onOpenValueLists: () => void;
  onOpenImportRules: () => void;
}

/**
 * App header of the Rules page: title, rules table tabs, page actions, and "Create rule".
 * Must render inside `RulesTableContextProvider`.
 */
export const RulesTableAppHeader = React.memo<RulesTableAppHeaderProps>(
  ({
    isLoading,
    canReadRules,
    canEditRules,
    canAccessRuleSettings,
    isImportValueListDisabled,
    isAiRuleCreationAvailable,
    onOpenRuleSettings,
    onOpenValueLists,
    onOpenImportRules,
  }) => {
    const { docLinks } = useKibana().services;
    const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
    const { data: prebuiltRulesStatus } = usePrebuiltRulesStatus();
    const rulesToInstallCount = prebuiltRulesStatus?.stats.num_prebuilt_rules_to_install ?? 0;

    const tabs = useRulesTableHeaderTabs();
    const primaryActionItem = useCreateRulePrimaryAction({
      isAiRuleCreationAvailable,
      isDisabled: !canEditRules || isLoading,
      isLoading,
    });

    const menu = useMemo<AppHeaderMenu>(() => {
      const items: MenuItem[] = [
        {
          id: 'addElasticRules',
          label:
            rulesToInstallCount > 0
              ? i18n.ADD_ELASTIC_RULES_WITH_COUNT(rulesToInstallCount)
              : i18n.ADD_ELASTIC_RULES,
          iconType: 'plusCircle',
          href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.rulesAdd }),
          disableButton: !canReadRules || isLoading,
          testId: 'addElasticRulesButton',
        },
        ...(canAccessRuleSettings
          ? [
              {
                id: 'ruleSettings',
                label: i18n.RULE_SETTINGS_TITLE,
                iconType: 'gear',
                run: onOpenRuleSettings,
                testId: 'rules-settings-button',
              },
            ]
          : []),
        {
          id: 'valueLists',
          label: i18n.IMPORT_VALUE_LISTS,
          iconType: 'download',
          overflow: true,
          run: onOpenValueLists,
          disableButton: isImportValueListDisabled,
          tooltipContent: i18n.UPLOAD_VALUE_LISTS_TOOLTIP,
          testId: 'open-value-lists-modal-button',
        },
        {
          id: 'importRules',
          label: i18n.IMPORT_RULE,
          iconType: 'download',
          overflow: true,
          run: onOpenImportRules,
          disableButton: !canEditRules || isLoading,
          testId: 'rules-import-modal-button',
        },
      ];

      return { items, primaryActionItem };
    }, [
      canAccessRuleSettings,
      canEditRules,
      canReadRules,
      getSecuritySolutionUrl,
      isImportValueListDisabled,
      isLoading,
      onOpenImportRules,
      onOpenRuleSettings,
      onOpenValueLists,
      primaryActionItem,
      rulesToInstallCount,
    ]);

    return (
      <SecurityAppHeader
        title={i18n.PAGE_TITLE}
        tabs={tabs}
        menu={menu}
        docLink={docLinks.links.securitySolution.manageDetectionRules}
        spacing="largeBleed"
      />
    );
  }
);

RulesTableAppHeader.displayName = 'RulesTableAppHeader';
