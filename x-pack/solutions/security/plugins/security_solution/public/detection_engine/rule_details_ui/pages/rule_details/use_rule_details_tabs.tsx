/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { omit } from 'lodash/fp';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useEndpointExceptionsCapability } from '../../../../exceptions/hooks/use_endpoint_exceptions_capability';
import * as i18n from './translations';
import type { Rule } from '../../../rule_management/logic';
import type { NavTab } from '../../../../common/components/navigation/types';
import { useRuleExecutionSettings } from '../../../rule_monitoring';

export enum RuleDetailTabs {
  overview = 'overview',
  alerts = 'alerts',
  exceptions = 'rule_exceptions',
  endpointExceptions = 'endpoint_exceptions',
  executionResults = 'execution_results',
  executionEvents = 'execution_events',
}

export const RULE_DETAILS_TAB_NAME: Record<string, string> = {
  [RuleDetailTabs.overview]: i18n.OVERVIEW_TAB,
  [RuleDetailTabs.alerts]: i18n.ALERTS_TAB,
  [RuleDetailTabs.exceptions]: i18n.EXCEPTIONS_TAB,
  [RuleDetailTabs.endpointExceptions]: i18n.ENDPOINT_EXCEPTIONS_TAB,
  [RuleDetailTabs.executionResults]: i18n.EXECUTION_RESULTS_TAB,
  [RuleDetailTabs.executionEvents]: i18n.EXECUTION_EVENTS_TAB,
};

export interface UseRuleDetailsTabsProps {
  rule: Rule | null;
  ruleId: string;
  isExistingRule: boolean;
  hasIndexRead: boolean | null;
}

export const useRuleDetailsTabs = ({
  rule,
  ruleId,
  isExistingRule,
  hasIndexRead,
}: UseRuleDetailsTabsProps) => {
  const ruleDetailTabs = useMemo(
    (): Record<RuleDetailTabs, NavTab> => ({
      [RuleDetailTabs.overview]: {
        id: RuleDetailTabs.overview,
        name: RULE_DETAILS_TAB_NAME[RuleDetailTabs.overview],
        disabled: rule == null,
        href: `/rules/id/${ruleId}/${RuleDetailTabs.overview}`,
      },
      [RuleDetailTabs.alerts]: {
        id: RuleDetailTabs.alerts,
        name: RULE_DETAILS_TAB_NAME[RuleDetailTabs.alerts],
        disabled: false,
        href: `/rules/id/${ruleId}/${RuleDetailTabs.alerts}`,
      },
      [RuleDetailTabs.exceptions]: {
        id: RuleDetailTabs.exceptions,
        name: RULE_DETAILS_TAB_NAME[RuleDetailTabs.exceptions],
        disabled: rule == null,
        href: `/rules/id/${ruleId}/${RuleDetailTabs.exceptions}`,
      },
      [RuleDetailTabs.endpointExceptions]: {
        id: RuleDetailTabs.endpointExceptions,
        name: RULE_DETAILS_TAB_NAME[RuleDetailTabs.endpointExceptions],
        disabled: rule == null,
        href: `/rules/id/${ruleId}/${RuleDetailTabs.endpointExceptions}`,
      },
      [RuleDetailTabs.executionResults]: {
        id: RuleDetailTabs.executionResults,
        name: RULE_DETAILS_TAB_NAME[RuleDetailTabs.executionResults],
        disabled: !isExistingRule,
        href: `/rules/id/${ruleId}/${RuleDetailTabs.executionResults}`,
      },
      [RuleDetailTabs.executionEvents]: {
        id: RuleDetailTabs.executionEvents,
        name: RULE_DETAILS_TAB_NAME[RuleDetailTabs.executionEvents],
        disabled: !isExistingRule,
        href: `/rules/id/${ruleId}/${RuleDetailTabs.executionEvents}`,
      },
    }),
    [isExistingRule, rule, ruleId]
  );

  const [pageTabs, setTabs] = useState<Partial<Record<RuleDetailTabs, NavTab>>>(ruleDetailTabs);
  const ruleExecutionSettings = useRuleExecutionSettings();

  const canReadEndpointExceptions = useEndpointExceptionsCapability('showEndpointExceptions');
  const canReadExceptions = useUserPrivileges().rulesPrivileges.exceptions.read;

  useEffect(() => {
    const hiddenTabs = [];

    if (!hasIndexRead) {
      hiddenTabs.push(RuleDetailTabs.alerts);
    }
    if (!ruleExecutionSettings.extendedLogging.isEnabled) {
      hiddenTabs.push(RuleDetailTabs.executionEvents);
    }
    if (!canReadEndpointExceptions) {
      hiddenTabs.push(RuleDetailTabs.endpointExceptions);
    }
    if (!canReadExceptions) {
      hiddenTabs.push(RuleDetailTabs.exceptions);
    }
    if (rule != null) {
      const hasEndpointList = (rule.exceptions_list ?? []).some(
        (list) => list.type === ExceptionListTypeEnum.ENDPOINT
      );
      if (!hasEndpointList) {
        hiddenTabs.push(RuleDetailTabs.endpointExceptions);
      }
    }

    const tabs = omit<Record<RuleDetailTabs, NavTab>>(hiddenTabs, ruleDetailTabs);

    setTabs(tabs);
  }, [
    canReadEndpointExceptions,
    canReadExceptions,
    hasIndexRead,
    rule,
    ruleDetailTabs,
    ruleExecutionSettings,
  ]);

  return pageTabs;
};
