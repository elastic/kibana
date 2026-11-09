/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppHeaderTab } from '@kbn/app-header';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { SecurityPageName } from '../../../../app/types';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { useGetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';
import { PAGE_TITLE as RULES_PAGE_TITLE } from '../../../common/translations';
import type { TimeRange } from '../../../rule_gaps/types';
import * as i18n from './translations';
import { useRuleDetailsBadges } from './use_rule_details_badges';
import { useRuleDetailsMenu } from './use_rule_details_menu';
import { useRuleDetailsMetadata } from './use_rule_details_metadata';
import { useRuleSnooze } from './use_rule_snooze';

interface RuleDetailsAppHeaderProps {
  rule: RuleResponse | null;
  ruleId: string;
  ruleLoading: boolean;
  isExistingRule: boolean;
  hasActionsPrivileges: boolean;
  createdBy?: string;
  updatedBy?: string;
  tabs: AppHeaderTab[];
  refreshRule: () => void;
  onRuleEnabledChange: (enabled: boolean) => void;
  startMlJobsIfNeeded: () => Promise<void>;
  showBulkDuplicateExceptionsConfirmation: () => Promise<string | null>;
  showManualRuleRunConfirmation: () => Promise<TimeRange | null>;
  confirmDeletion: () => Promise<boolean>;
}

/** App header for the rule details page. Render inside RuleCustomizationsContextProvider. */
export const RuleDetailsAppHeader = React.memo<RuleDetailsAppHeaderProps>(
  ({
    rule,
    ruleId,
    ruleLoading,
    isExistingRule,
    hasActionsPrivileges,
    createdBy,
    updatedBy,
    tabs,
    refreshRule,
    onRuleEnabledChange,
    startMlJobsIfNeeded,
    showBulkDuplicateExceptionsConfirmation,
    showManualRuleRunConfirmation,
    confirmDeletion,
  }) => {
    const { docLinks } = useKibana().services;
    const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
    const snooze = useRuleSnooze({ ruleId, isExistingRule });
    const badges = useRuleDetailsBadges({
      rule,
      ruleLoading,
      isExistingRule,
      hasActionsPrivileges,
      onRuleEnabledChange,
      startMlJobsIfNeeded,
      snoozeBadge: snooze.badge,
    });
    const metadata = useRuleDetailsMetadata({ rule, createdBy, updatedBy });
    const menu = useRuleDetailsMenu({
      rule,
      ruleId,
      ruleLoading,
      isExistingRule,
      hasActionsPrivileges,
      refreshRule,
      snoozeMenuItem: snooze.menuItem,
      showBulkDuplicateExceptionsConfirmation,
      showManualRuleRunConfirmation,
      confirmDeletion,
    });

    return (
      <>
        <SecurityAppHeader
          title={rule?.name ?? i18n.PAGE_TITLE}
          back={{
            label: RULES_PAGE_TITLE,
            href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.rules }),
          }}
          badges={badges}
          metadata={metadata}
          tabs={tabs}
          menu={menu}
          docLink={docLinks.links.securitySolution.manageDetectionRules}
          spacing="largeBleed"
          // Pinned by RuleDetailsStickyHeader, below the global KQL bar on the Alerts tab.
          sticky={false}
        />
        {snooze.modal}
      </>
    );
  }
);

RuleDetailsAppHeader.displayName = 'RuleDetailsAppHeader';
