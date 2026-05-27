/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import type { SecondaryNavExtensionPointContext } from '@kbn/navigation-plugin/public';
import { useObservable } from '@kbn/use-observable';
import { useKibana } from '../common/services';

const MAX_RECENT_DASHBOARDS = 5;

export const RecentDashboardsSection = ({
  activeItemId,
}: SecondaryNavExtensionPointContext): React.ReactElement | null => {
  const {
    services: {
      chrome,
      http: { basePath },
    },
  } = useKibana();

  const recentlyAccessed$ = useMemo(() => chrome.recentlyAccessed.get$(), [chrome]);
  const recentlyAccessed = useObservable(recentlyAccessed$, []);

  const recentDashboards = useMemo(
    () =>
      recentlyAccessed
        .filter((item) => item.link.startsWith('/app/dashboards'))
        .slice(0, MAX_RECENT_DASHBOARDS),
    [recentlyAccessed]
  );

  if (recentDashboards.length === 0) {
    return null;
  }

  return (
    <EuiListGroup gutterSize="none" size="s">
      {recentDashboards.map((dashboard) => {
        const itemId = `recent-${dashboard.id}`;

        return (
          <EuiListGroupItem
            key={dashboard.id}
            label={dashboard.label}
            href={basePath.prepend(dashboard.link)}
            aria-current={activeItemId === itemId ? 'page' : undefined}
            data-test-subj={`nav-item-recent-dashboard-${dashboard.id}`}
          />
        );
      })}
    </EuiListGroup>
  );
};
