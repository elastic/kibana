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
import { AllRulesTabs } from './rules_table_toolbar';
import * as i18n from './translations';

/**
 * Builds the rules management tabs (Installed rules, Rule monitoring, Rule updates) as
 * `AppHeaderTab`s for rendering in the shared app header.
 * The "Rule updates" tab is only shown when there are updates available and the user can read rules.
 */
export const useRulesTableHeaderTabs = (): AppHeaderTab[] => {
  const [{ tabName }] = useRouteSpy();
  const { getAppUrl, navigateTo } = useNavigation();
  const { search } = useLocation();
  const { data: prebuiltRulesStatus } = usePrebuiltRulesStatus();
  const canReadRules = useUserPrivileges().rulesPrivileges.rules.read;

  const updateTotal = prebuiltRulesStatus?.stats.num_prebuilt_rules_to_upgrade ?? 0;
  const shouldDisplayRuleUpdatesTab = canReadRules && updateTotal > 0;

  return useMemo<AppHeaderTab[]>(() => {
    const buildTab = (id: AllRulesTabs, label: string): AppHeaderTab => {
      const href = `/rules/${id}`;
      const hrefWithSearch = href.includes('?') ? href : `${href}${search}`;
      const appHref = getAppUrl({ path: hrefWithSearch });

      return {
        id,
        label,
        href: appHref,
        isSelected: tabName === id,
        'data-test-subj': `navigation-${id}`,
        onClick: () => {
          navigateTo({ url: appHref, restoreScroll: true });
          track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`);
        },
      };
    };

    const tabs: AppHeaderTab[] = [
      buildTab(AllRulesTabs.management, i18n.INSTALLED_RULES_TAB),
      buildTab(AllRulesTabs.monitoring, i18n.RULE_MONITORING_TAB),
    ];

    if (shouldDisplayRuleUpdatesTab) {
      tabs.push(buildTab(AllRulesTabs.updates, i18n.RULE_UPDATES_TAB));
    }

    return tabs;
  }, [tabName, getAppUrl, navigateTo, search, shouldDisplayRuleUpdatesTab]);
};
