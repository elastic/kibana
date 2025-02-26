/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { Dashboard } from './types';
import { useKibana } from '../../hooks/use_kibana';

interface Props {
  dashboards: Dashboard[];
  unassign: (dashboard: Dashboard) => void;
}

export function AssignedDashboardList({ dashboards, unassign }: Props) {
  const {
    services: { share },
  } = useKibana();
  const dashboardLocator = share.url.locators.get<DashboardLocatorParams>(DASHBOARD_APP_LOCATOR);
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiTitle size="s">
          <h3>
            {i18n.translate('xpack.slo.assignedDashboardList.title', {
              defaultMessage: 'Assigned dashboards',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      {dashboards.map((dashboard) => (
        <EuiFlexGroup direction="row" key={dashboard.id} gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiLink
              data-test-subj="dashboardLink"
              href={dashboardLocator?.getRedirectUrl({ dashboardId: dashboard.id } ?? '')}
              target="_blank"
            >
              {dashboard.title}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="sloAssignedDashboardListUnassignButton"
              size="s"
              color="danger"
              onClick={() => unassign(dashboard)}
            >
              {i18n.translate('xpack.slo.assignedDashboardList.unassignButtonLabel', {
                defaultMessage: 'Unassign',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </EuiFlexGroup>
  );
}
