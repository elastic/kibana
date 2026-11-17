/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { AppHeaderTab } from '@kbn/app-header';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../../../../common/lib/kibana';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../../common/lib/telemetry';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useEndpointExceptionsCapability } from '../../../../exceptions/hooks/use_endpoint_exceptions_capability';
import * as i18n from './translations';
import type { Rule } from '../../../rule_management/logic';

export enum RuleDetailTabs {
  overview = 'overview',
  alerts = 'alerts',
  exceptions = 'rule_exceptions',
  endpointExceptions = 'endpoint_exceptions',
  executionResults = 'execution_results',
}

export const RULE_DETAILS_TAB_NAME: Record<string, string> = {
  [RuleDetailTabs.overview]: i18n.OVERVIEW_TAB,
  [RuleDetailTabs.alerts]: i18n.ALERTS_TAB,
  [RuleDetailTabs.exceptions]: i18n.EXCEPTIONS_TAB,
  [RuleDetailTabs.endpointExceptions]: i18n.ENDPOINT_EXCEPTIONS_TAB,
  [RuleDetailTabs.executionResults]: i18n.EXECUTION_RESULTS_TAB,
};

export interface UseRuleDetailsTabsProps {
  rule: Rule | null;
  ruleId: string;
  isExistingRule: boolean;
  canReadAlerts: boolean;
}

export const useRuleDetailsTabs = ({
  rule,
  ruleId,
  isExistingRule,
  canReadAlerts,
}: UseRuleDetailsTabsProps) => {
  const [{ tabName }] = useRouteSpy();
  const { search } = useLocation();
  const { getAppUrl } = useNavigation();
  const isEndpointExceptionsMovedFFEnabled = useIsExperimentalFeatureEnabled(
    'endpointExceptionsMovedUnderManagement'
  );

  const canReadEndpointExceptions = useEndpointExceptionsCapability('showEndpointExceptions');
  const canReadExceptions = useUserPrivileges().rulesPrivileges.exceptions.read;
  return useMemo<AppHeaderTab[]>(() => {
    const hasEndpointList = (rule?.exceptions_list ?? []).some(
      (list) => list.type === ExceptionListTypeEnum.ENDPOINT
    );
    const visibleTabs = [
      RuleDetailTabs.overview,
      ...(canReadAlerts ? [RuleDetailTabs.alerts] : []),
      ...(canReadExceptions ? [RuleDetailTabs.exceptions] : []),
      ...(!isEndpointExceptionsMovedFFEnabled && canReadEndpointExceptions && hasEndpointList
        ? [RuleDetailTabs.endpointExceptions]
        : []),
      RuleDetailTabs.executionResults,
    ];

    return visibleTabs.map((id) => ({
      id,
      label: RULE_DETAILS_TAB_NAME[id],
      disabled:
        id === RuleDetailTabs.executionResults
          ? !isExistingRule
          : id !== RuleDetailTabs.alerts && rule == null,
      href: getAppUrl({ path: `/rules/id/${ruleId}/${id}${search}` }),
      isSelected: tabName === id,
      onClick: () => track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`),
      'data-test-subj': `navigation-${id}`,
    }));
  }, [
    canReadEndpointExceptions,
    canReadExceptions,
    canReadAlerts,
    isEndpointExceptionsMovedFFEnabled,
    rule,
    isExistingRule,
    getAppUrl,
    ruleId,
    search,
    tabName,
  ]);
};
