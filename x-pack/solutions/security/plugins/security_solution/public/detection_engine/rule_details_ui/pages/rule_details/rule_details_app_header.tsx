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
import { PAGE_TITLE as RULES_PAGE_TITLE } from '../../../common/translations';
import type { TimeRange } from '../../../rule_gaps/types';
import * as i18n from './translations';
import { useRuleDetailsMenu } from './use_rule_details_menu';

interface RuleDetailsAppHeaderProps {
  rule: RuleResponse | null;
  ruleId: string;
  ruleLoading: boolean;
  isExistingRule: boolean;
  hasActionsPrivileges: boolean;
  tabs: AppHeaderTab[];
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
    tabs,
    onRuleEnabledChange,
    startMlJobsIfNeeded,
    showBulkDuplicateExceptionsConfirmation,
    showManualRuleRunConfirmation,
    confirmDeletion,
  }) => {
    const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
    const menu = useRuleDetailsMenu({
      rule,
      ruleId,
      isExistingRule,
      hasActionsPrivileges,
      onRuleEnabledChange,
      startMlJobsIfNeeded,
      showBulkDuplicateExceptionsConfirmation,
      showManualRuleRunConfirmation,
      confirmDeletion,
    });

    return (
      <SecurityAppHeader
        title={rule?.name ?? i18n.PAGE_TITLE}
        back={{
          label: RULES_PAGE_TITLE,
          href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.rules }),
        }}
        tabs={tabs}
        menu={menu}
        badges={!ruleLoading && !isExistingRule ? [{ label: i18n.DELETED_RULE }] : undefined}
        spacing="largeBleed"
      />
    );
  }
);

RuleDetailsAppHeader.displayName = 'RuleDetailsAppHeader';
