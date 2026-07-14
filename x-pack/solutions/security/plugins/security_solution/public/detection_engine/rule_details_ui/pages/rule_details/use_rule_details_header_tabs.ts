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
import type { NavTab } from '../../../../common/components/navigation/types';

/**
 * Converts the rule details navigation tabs into `AppHeaderTab`s so they can be rendered inside the
 * shared app header. Preserves the routing/selection behavior of the former `TabNavigation`.
 */
export const useRuleDetailsHeaderTabs = (
  navTabs: Partial<Record<string, NavTab>>
): AppHeaderTab[] => {
  const [{ tabName }] = useRouteSpy();
  const { getAppUrl, navigateTo } = useNavigation();
  const { search } = useLocation();

  return useMemo<AppHeaderTab[]>(
    () =>
      Object.values(navTabs)
        .filter((tab): tab is NavTab => tab != null)
        .map((tab) => {
          /**
           * Detail pages bake `location.search` into `tab.href` via merge helpers. Appending
           * `search` again would emit a second `?` and corrupt values.
           */
          const hrefWithSearch = tab.href.includes('?') ? tab.href : `${tab.href}${search}`;
          const appHref = getAppUrl({ path: hrefWithSearch });

          return {
            id: tab.id,
            label: tab.name,
            href: appHref,
            disabled: tab.disabled,
            isSelected: tabName === tab.id,
            'data-test-subj': `navigation-${tab.id}`,
            onClick: () => {
              navigateTo({ url: appHref, restoreScroll: true });
              track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${tab.id}`);
            },
          };
        }),
    [navTabs, search, getAppUrl, tabName, navigateTo]
  );
};
