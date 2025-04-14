/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { NewChat } from '@kbn/elastic-assistant';
import { useUserData } from '../../../../detections/components/user_info';
import { TabNavigation } from '../../../../common/components/navigation/tab_navigation';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { useRuleManagementFilters } from '../../../rule_management/logic/use_rule_management_filters';
import * as i18n from './translations';
import { getPromptContextFromDetectionRules } from '../../../../assistant/helpers';
import { useRulesTableContext } from './rules_table/rules_table_context';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import * as i18nAssistant from '../../../common/translations';

export enum AllRulesTabs {
  management = 'management',
  monitoring = 'monitoring',
  updates = 'updates',
}

export const RulesTableToolbar = React.memo(() => {
  const { data: ruleManagementFilters } = useRuleManagementFilters();
  const { data: prebuiltRulesStatus } = usePrebuiltRulesStatus();

  const [{ loading, canUserCRUD }] = useUserData();

  const installedTotal =
    (ruleManagementFilters?.rules_summary.custom_count ?? 0) +
    (ruleManagementFilters?.rules_summary.prebuilt_installed_count ?? 0);
  const updateTotal = prebuiltRulesStatus?.stats.num_prebuilt_rules_to_upgrade ?? 0;

  const shouldDisplayRuleUpdatesTab = !loading && canUserCRUD && updateTotal > 0;

  const ruleTabs = useMemo(
    () => ({
      [AllRulesTabs.management]: {
        id: AllRulesTabs.management,
        name: i18n.INSTALLED_RULES_TAB,
        disabled: false,
        href: `/rules/${AllRulesTabs.management}`,
        isBeta: installedTotal > 0,
        betaOptions: {
          text: `${installedTotal}`,
        },
      },
      [AllRulesTabs.monitoring]: {
        id: AllRulesTabs.monitoring,
        name: i18n.RULE_MONITORING_TAB,
        disabled: false,
        href: `/rules/${AllRulesTabs.monitoring}`,
        isBeta: installedTotal > 0,
        betaOptions: {
          text: `${installedTotal}`,
        },
      },
      ...(shouldDisplayRuleUpdatesTab
        ? {
            [AllRulesTabs.updates]: {
              id: AllRulesTabs.updates,
              name: i18n.RULE_UPDATES_TAB,
              disabled: false,
              href: `/rules/${AllRulesTabs.updates}`,
              isBeta: updateTotal > 0,
              betaOptions: {
                text: `${updateTotal}`,
              },
            },
          }
        : {}),
    }),
    [installedTotal, updateTotal, shouldDisplayRuleUpdatesTab]
  );

  // Assistant integration for using selected rules as prompt context
  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();
  const {
    state: { rules, selectedRuleIds },
  } = useRulesTableContext();
  const selectedRules = useMemo(
    () => rules.filter((rule) => selectedRuleIds.includes(rule.id)),
    [rules, selectedRuleIds]
  );

  const selectedRuleNames = useMemo(() => selectedRules.map((rule) => rule.name), [selectedRules]);
  const getPromptContext = useCallback(
    async () => getPromptContextFromDetectionRules(selectedRules),
    [selectedRules]
  );

  const chatTitle = useMemo(() => {
    return `${i18nAssistant.DETECTION_RULES_CONVERSATION_ID} - ${selectedRuleNames.join(', ')}`;
  }, [selectedRuleNames]);

  return (
    <EuiFlexGroup justifyContent={'spaceBetween'}>
      <EuiFlexItem grow={false}>
        <TabNavigation navTabs={ruleTabs} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {hasAssistantPrivilege && selectedRules.length > 0 && (
          <NewChat
            category="detection-rules"
            conversationTitle={chatTitle}
            description={i18nAssistant.RULE_MANAGEMENT_CONTEXT_DESCRIPTION}
            getPromptContext={getPromptContext}
            suggestedUserPrompt={i18nAssistant.EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS}
            tooltip={i18nAssistant.RULE_MANAGEMENT_CONTEXT_TOOLTIP}
            isAssistantEnabled={isAssistantEnabled}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

RulesTableToolbar.displayName = 'RulesTableToolbar';
