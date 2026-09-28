/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { AppHeaderTab } from '@kbn/app-header';
import { useNavigation } from '../../../../common/lib/kibana';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../../common/lib/telemetry';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { usePrebuiltRulesStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status';
import { useRuleManagementFilters } from '../../../rule_management/logic/use_rule_management_filters';
import { AllRulesTabs } from '../rules_table/rules_table_toolbar';
import * as i18n from '../rules_table/translations';

const toBadge = (count: number): number | undefined => (count > 0 ? count : undefined);

/**
 * Returns the Installed / Monitoring / Updates tabs for the Rules page app header.
 */
export const useRulesTableHeaderTabs = (): AppHeaderTab[] => {
  const [{ tabName }] = useRouteSpy();
  const { search } = useLocation();
  const { getAppUrl } = useNavigation();
  const { data: ruleManagementFilters } = useRuleManagementFilters();
  const { data: prebuiltRulesStatus } = usePrebuiltRulesStatus();
  const canReadRules = useUserPrivileges().rulesPrivileges.rules.read;

  const installedTotal =
    (ruleManagementFilters?.rules_summary.custom_count ?? 0) +
    (ruleManagementFilters?.rules_summary.prebuilt_installed_count ?? 0);
  const updateTotal = prebuiltRulesStatus?.stats.num_prebuilt_rules_to_upgrade ?? 0;
  const shouldDisplayRuleUpdatesTab = canReadRules && updateTotal > 0;

  return useMemo(() => {
    const tabs = [
      { id: AllRulesTabs.management, label: i18n.INSTALLED_RULES_TAB, count: installedTotal },
      { id: AllRulesTabs.monitoring, label: i18n.RULE_MONITORING_TAB, count: installedTotal },
      ...(shouldDisplayRuleUpdatesTab
        ? [{ id: AllRulesTabs.updates, label: i18n.RULE_UPDATES_TAB, count: updateTotal }]
        : []),
    ];

    return tabs.map(({ id, label, count }) => ({
      id,
      label,
      badge: toBadge(count),
      isSelected: tabName === id,
      href: getAppUrl({ path: `/rules/${id}${search}` }),
      onClick: () => track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`),
      'data-test-subj': `navigation-${id}`,
    }));
  }, [getAppUrl, installedTotal, search, shouldDisplayRuleUpdatesTab, tabName, updateTotal]);
};
