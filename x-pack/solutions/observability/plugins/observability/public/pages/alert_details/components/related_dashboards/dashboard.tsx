/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { useKibana } from '../../../../utils/kibana_react';

export function Dashboard({
  dashboard,
}: {
  dashboard: { id: string; title: string; description: string };
}) {
  const {
    services: {
      share: { url: urlService },
    },
  } = useKibana();
  const dashboardLocator = urlService.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);

  return (
    <>
      <EuiFlexGroup gutterSize="xs" responsive={false} key={dashboard.id}>
        <EuiFlexItem key={dashboard.id}>
          <EuiText size="s">
            <a
              href="#"
              onClick={async (e) => {
                e.preventDefault();
                if (dashboardLocator) {
                  const url = await dashboardLocator.getUrl({
                    dashboardId: dashboard.id,
                  });
                  window.open(url, '_blank');
                } else {
                  console.error('Dashboard locator is not available');
                }
              }}
            >
              {dashboard.title}
            </a>
          </EuiText>
          <EuiText color={'subdued'} size="s">
            {dashboard.description}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </>
  );
}
